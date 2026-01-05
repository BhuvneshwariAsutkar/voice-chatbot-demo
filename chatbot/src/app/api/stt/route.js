import { callMCP } from '@/lib/mcpClient'

export async function POST (req) {
  try {
    const formData = await req.formData()
    const audioFile = formData.get('audio')
    if (!audioFile) {
      return new Response(JSON.stringify({ error: 'No audio file found' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    const audioBytes = Buffer.from(await audioFile.arrayBuffer()).toString(
      'base64'
    )

    // Call MCP SpeechToText tool
    const mcpResponse = await callMCP({
      tool: 'SpeechToText',
      params: { audioBase64: audioBytes }
    })

    const res = mcpResponse.result?.structuredContent || {}
    return new Response(JSON.stringify(res), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error('STT API Error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
