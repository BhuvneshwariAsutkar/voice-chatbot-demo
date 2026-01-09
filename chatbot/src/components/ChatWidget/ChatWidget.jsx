'use client'
import { useState, useRef, useEffect } from 'react'
import ChatHeader from '../ChatHeader/ChatHeader'
import ChatHistory from '../ChatHistory/ChatHistory'
import ChatInput from '../ChatInput/ChatInput'
import VoiceRecorder from '../VoiceRecorder/VoiceRecorder'
import styles from './ChatWidget.module.scss'
// Accept user prop for user-specific logic
export default function ChatWidget ({ onClose, user }) {
  const [messages, setMessages] = useState([
    {
      role: 'model',
      text: 'Hello! How can I help you today?'
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const chatHistoryRef = useRef(null)

  useEffect(() => {
    chatHistoryRef.current?.scrollTo(0, chatHistoryRef.current.scrollHeight)
  }, [messages, loading])

  // Use Web Audio API for playback
  const audioContextRef = useRef(null)
  const currentAudioSourceRef = useRef(null)

  // Stop current TTS playback
  function stopTTS () {
    if (currentAudioSourceRef.current) {
      try {
        currentAudioSourceRef.current.stop()
      } catch (e) {}
      currentAudioSourceRef.current = null
    }
  }

  // Utility to strip markdown formatting (e.g., **bold**, *italic*, __underline__, etc.)
  function stripMarkdown(text) {
    if (!text) return '';
    // Remove bold, italic, underline, strikethrough, inline code, and links
    return text
      .replace(/\*\*([^*]+)\*\*/g, '$1') // **bold**
      .replace(/\*([^*]+)\*/g, '$1') // *italic*
      .replace(/__([^_]+)__/g, '$1') // __underline__
      .replace(/_([^_]+)_/g, '$1') // _italic_
      .replace(/~~([^~]+)~~/g, '$1') // ~~strikethrough~~
      .replace(/`([^`]+)`/g, '$1') // `inline code`
      .replace(/\[(.*?)\]\((.*?)\)/g, '$1') // [text](url)
      .replace(/#+\s?([^\n]+)/g, '$1') // # headings
      .replace(/>\s?([^\n]+)/g, '$1') // > blockquotes
      .replace(/!\[(.*?)\]\((.*?)\)/g, '') // images
      .replace(/\r?\n|\r/g, ' ') // newlines to space
      .replace(/\s+/g, ' ') // collapse whitespace
      .trim();
  }

  // Converts a given text to speech using the /api/tts endpoint.
  // Fetches audio data, decodes it, and plays it using the Web Audio API.
  async function speakText (text) {
    if (typeof window === 'undefined') return
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext ||
        window.webkitAudioContext)()
    }
    stopTTS() // Stop any previous playback
    try {
      const plainText = stripMarkdown(text)
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ text: plainText })
      })
      const data = await response.json()
      console.log('TTS audio data:', data)
      if (data.audioContent) {
        const audioBuffer = await audioContextRef.current.decodeAudioData(
          // Use atob for base64 decoding in the browser
          Uint8Array.from(atob(data.audioContent), c => c.charCodeAt(0)).buffer
        )
        const source = audioContextRef.current.createBufferSource()
        source.buffer = audioBuffer
        source.connect(audioContextRef.current.destination)
        source.start(0)
        currentAudioSourceRef.current = source // Track the source
        // Clean up when finished
        source.onended = () => {
          if (currentAudioSourceRef.current === source) {
            currentAudioSourceRef.current = null
          }
        }
      }
    } catch (error) {
      console.error('Error fetching TTS audio:', error)
    }
  }

  //call RAG to ans user query from knowledgebase
  async function handleSend (userInput, isVoiceInput = false) {
    stopTTS() // Stop any ongoing TTS playback before sending a new message
    if (!userInput.trim()) return
    setMessages(msgs => [...msgs, { role: 'user', text: userInput }])
    setLoading(true)
    setInput('')
    try {
      const mcpRes = await fetch('/api/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userInput, userId: user && user.id })
      })
      const data = await mcpRes.json()
      
      console.log('MCP response data:*******', data)
      if (data.error || data.result?.isError) {
        // Show only a generic message
        showMessage(
          'Sorry, we could not help right now. Please try again later.'
        )
      } else if(!data.result?.isError || data?.result?.structuredContent?.mcpResult) {
        setMessages(msgs => [
        ...msgs,
        {
          role: 'model',
          text:
            data.completion ||
            data.transcription ||
            data?.result?.structuredContent?.mcpResult ||
            JSON.stringify(data)
        }
      ])
      }else {
        // Show the actual result
        showMessage(data.result?.content?.[0]?.text || 'No answer found.')
      }
      if (isVoiceInput)
        speakText(
          data.completion ||
            data.transcription ||
            data?.result?.structuredContent?.mcpResult ||
            ''
        )
    } catch (err) {
      setMessages(msgs => [
        ...msgs,
        {
          role: 'model',
          text: 'Sorry, something went wrong. Please try again.'
        }
      ])
    }
    setLoading(false)
  }

  const handleVoiceInput = () => {
    setIsRecording(prev => !prev)
  }

  return (
    <div
      className={styles.chatWidget}
      role='dialog'
      aria-labelledby='chat-header'
    >
      <main className={styles.chatContainer}>
        <ChatHeader onClose={onClose} />
        <ChatHistory
          messages={messages}
          loading={loading}
          ref={chatHistoryRef}
        />
        <ChatInput
          input={input}
          setInput={setInput}
          loading={loading}
          onSend={handleSend}
          onVoice={handleVoiceInput}
          isRecording={isRecording}
          onStopTTS={stopTTS}
        />
      </main>
      <VoiceRecorder
        isRecording={isRecording}
        onTranscription={handleSend}
        setIsRecording={setIsRecording} // Pass this down
        setMessages={setMessages}
        setLoading={setLoading}
      />
    </div>
  )
}
