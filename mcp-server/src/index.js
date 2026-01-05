import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import express from 'express'
import { z } from 'zod'
import { handleMCP } from './lib/mcpManager.js'
import { getGemini } from './lib/getGemini.js'
import dotenv from 'dotenv'
import { SpeechClient } from '@google-cloud/speech'
import { TextToSpeechClient } from '@google-cloud/text-to-speech'
dotenv.config()

const client = new SpeechClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
})

const client_tts = new TextToSpeechClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
})

const userKeywords = [
  'my policy',
  'my claim',
  'my account',
  'my premium',
  'my coverage',
  'my details',
  'my information',
  'my plan',
  'my renewal',
  'my payment',
  'my id',
  'my number',
  'my statement',
  'my balance',
  'my address',
  'my email',
  'my phone',
  'my contact',
  'my login',
  'my password',
  'my user',
  'my profile',
  'my subscription',
  'my invoice',
  'my bill',
  'my status'
]

// Create an MCP server
const server = new McpServer({
  name: 'mcp-server',
  version: '1.0.0',
  description: 'Demo MCP server with Gemini, RAG, STT, and TTS tools',
  
})

// Add an addition tool
server.registerTool(
  'GetAnswer',
  {
    title: 'GetAnswer Tool',
    description:
      'Answers questions using FAQ or Retrieval-Augmented Generation.',
    inputSchema: { prompt: z.string() },
    outputSchema: { mcpResult: z.any() }
  },
  async ({ prompt }) => {
    if (!prompt) {
      return {
        structuredContent: { mcpResult: 'Prompt is required.' }
      }
    }

    // Greeting detection
    const greetings = [
      'hi',
      'hello',
      'hey',
      'greetings',
      'good morning',
      'good afternoon',
      'good evening'
    ]
    const normalizedPrompt = prompt.trim().toLowerCase()
    if (
      greetings.some(
        greet =>
          normalizedPrompt === greet || normalizedPrompt.startsWith(greet + ' ')
      )
    ) {
      return {
        structuredContent: {
          mcpResult: 'Hello! How can I assist you with Bupa insurance today?'
        }
      }
    }

    const containsKeyword = userKeywords.some(keyword =>
      normalizedPrompt.includes(keyword)
    )
    let systemPrompt = `You are a professional and knowledgeable Bupa insurance assistant.\nYour primary goal is to provide clear, accurate, and helpful information based on the provided context.\n- Your tone should be formal, polite, and reassuring.\n- Address the user respectfully, but avoid overly casual language.\n- Do not mention that you are using a knowledge base or context. Simply present the information as if it is your own knowledge.\n- If the context does not contain the answer, politely state that you do not have that specific information and suggest they ask about Bupa health insurance topics.`
    if (containsKeyword) {
      systemPrompt += `\n\nThe user has asked about their personal insurance details. Be extra clear and ensure privacy is respected.`
    }
    const mcpResult = await handleMCP(prompt)
    console.log(
      'MCP Result:',
      mcpResult.confidence + ' Source:',
      mcpResult.source + ' score:',
      mcpResult.ragScores
    )
    if (mcpResult.source === 'RAG' || mcpResult.source === 'Website') {
      const gemini = await getGemini()
      const completion = await gemini.generateCompletion({
        prompt: `${systemPrompt}\n\nUser: ${prompt}`,
        context: JSON.stringify(mcpResult, null, 2)
      })
      return {
        structuredContent: { mcpResult: completion }
      }
    } else if (mcpResult.source === 'FAQ') {
      return {
        structuredContent: { mcpResult: mcpResult.answer }
      }
    } else {
      return {
        mcpResult: 'No valid source found.'
      }
    }
  }
)

// STT Tool
server.registerTool(
  'SpeechToText',
  {
    title: 'SpeechToText Tool',
    description: 'Converts audio input to text using Google Speech-to-Text.',
    inputSchema: { audioBase64: z.any() },
    outputSchema: { transcription: z.string() }
  },
  async ({ audioBase64 }) => {
    if (!audioBase64) {
      return { structuredContent: { transcription: 'No audio provided.' } }
    }
    try {
      const request = {
        audio: { content: audioBase64 },
        config: {
          encoding: 'WEBM_OPUS',
          sampleRateHertz: 48000,
          languageCode: 'en-US',
          speechContexts: [
            {
              phrases: ['Bupa', 'Bupa By You'],
              boost: 20
            }
          ],
          enableAutomaticPunctuation: true
          
        }
      }
      const [response] = await client.recognize(request)
      const transcription = response.results
        .map(result => result.alternatives[0].transcript)
        .join('\n')
      return { structuredContent: { transcription } }
    } catch (err) {
      console.error('STT Tool Error:', err)
      return { structuredContent: { transcription: `Error: ${err.message}` } }
    }
  }
)

// TTS Tool
server.registerTool(
  'TextToSpeech',
  {
    title: 'TextToSpeech Tool',
    description: 'Converts text input to speech audio.',
    inputSchema: { text: z.string() },
    outputSchema: { audioBase64: z.any() }
  },
  async ({ text }) => {
    if (!text) {
      return { structuredContent: { audioBase64: '' } }
    }
    const request = {
      input: { text },
      voice: { languageCode: 'en-US', ssmlGender: 'FEMALE' },
      audioConfig: { audioEncoding: 'MP3' },
      voice: {
        languageCode: 'en-US',
        ssmlGender: 'FEMALE',
        name: 'en-US-Wavenet-F'
      }
      
    }

    const [response] = await client_tts.synthesizeSpeech(request)
    const audioBase64 = Buffer.from(response.audioContent).toString('base64')
    console.log('TTS generated audioBase64 of length:', audioBase64.length)
    return { structuredContent: { audioBase64 } }
  }
)

// Start the server
const app = express()
app.use(express.json({ type: 'application/json', limit: '1mb' }))

app.post('/mcp', async (req, res) => {
  try {
    console.log('Incoming /mcp request body:', req.body);
    //bridge between the Express HTTP request/response and the MCP server, handling streaming and session management for each incoming request.
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: req => {
        // Generate a session ID based on request headers or other criteria
        return req.headers['x-session-id'] || 'default-session'
      },
      enableJsonResponse: true,
      req,
      res,
      server,
      maxResponseSize: 5 * 1024 * 1024 // 5 MB
      // logLevel: 'debug' --- IGNORE ---,
      // enableMetrics: true --- IGNORE ---,
      // enableTracing: true --- IGNORE ---
      // timeoutMs: 2 * 60 * 1000 // 2 minutes --- IGNORE ---
      // idleTimeoutMs: 30 * 1000 // 30 seconds --- IGNORE ---
      // maxConcurrentRequestsPerSession: 5 --- IGNORE ---
      // enableRequestLogging: true --- IGNORE ---
      // enableResponseLogging: true --- IGNORE ---
      // enableErrorLogging: true --- IGNORE ---
      // customHeaders: { 'X-Custom-Header': 'value' } --- IGNORE ---
      // corsOptions: { origin: '*' } --- IGNORE ---
      // sessionStore: new InMemorySessionStore() --- IGNORE ---
      // rateLimiter: new SimpleRateLimiter(100, 60 * 1000) --- IGNORE ---
      // tracingOptions: { tracer: myTracer } --- IGNORE ---
      // metricsOptions: { metricsCollector: myMetricsCollector } --- IGNORE ---
      // authenticationHandler: async (req) => { return { userId
      //   return { userId: 'user123' } } --- IGNORE ---
      // requestValidator: (request) => { --- IGNORE ---
      //   // custom validation logic --- IGNORE ---
      //   return true --- IGNORE ---
      // } --- IGNORE ---
    })

    res.on('close', () => {
      transport.close() // This is important for cleaning up resources and avoiding memory leaks.
    })

    await server.connect(transport)
    await transport.handleRequest(req, res, req.body)
  } catch (err) {
    console.error('MCP tool error:', err);
    if (err && err.stack) {
      console.error('Error stack:', err.stack);
    }
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message:
            'Sorry, we could not help right now. Please try again later.',
          data: err.message
        },
        id: null
      })
    }
  }
})

const port = parseInt(process.env.PORT)
app
  .listen(port, () => {
    console.log(`Demo MCP Server running on http://localhost:${port}/mcp`)
  })
  .on('error', error => {
    console.error('Server error:', error)
    process.exit(1)
  })
