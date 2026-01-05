import { useEffect, useRef } from 'react'

export default function VoiceRecorder({
  isRecording,
  onTranscription,
  setIsRecording,
  setMessages,
  setLoading
}) {
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])

  const startRecording = async () => {
    audioChunksRef.current = []
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data)
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop())
        const audioBlob = new Blob(audioChunksRef.current, {
          type: 'audio/webm;codecs=opus'
        })

        const formData = new FormData()
        formData.append('audio', audioBlob)
        setLoading(true)
        try {
          const res = await fetch('/api/stt', {
            method: 'POST',
            body: formData
          })
          const data = await res.json()
          console.log('STT Response Data:', data)
          if (typeof data.transcription === 'string') {
            if (data.transcription) {
              onTranscription(data.transcription, true)
            } else {
              setMessages(msgs => [
                ...msgs,
                { role: 'model', text: "I didn't catch that. Please try again." }
              ])
              setLoading(false)
            }
          } else {
            throw new Error(data.error || 'Transcription failed')
          }
        } catch (error) {
          console.error('STT Error:', error)
          setMessages(msgs => [
            ...msgs,
            { role: 'model', text: 'Sorry, I could not understand that.' }
          ])
          setLoading(false)
        }
      }

      mediaRecorder.start()
    } catch (err) {
      console.error('Error accessing microphone:', err)
      setIsRecording(false)
      setMessages(msgs => [
        ...msgs,
        { role: 'model', text: 'Could not access the microphone. Please grant permission.' }
      ])
    }
  }

  useEffect(() => {
    if (isRecording) {
      startRecording()
    } else {
      mediaRecorderRef.current?.stop()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording])

  return null // This is a logic-only component
}