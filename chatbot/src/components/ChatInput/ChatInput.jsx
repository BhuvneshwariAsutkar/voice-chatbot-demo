import styles from './ChatInput.module.scss'

export default function ChatInput({
  input,
  setInput,
  loading,
  onSend,
  onVoice,
  isRecording,
  onStopTTS
}) {
  return (
    <form
      className={styles.inputForm}
      onSubmit={e => {
        e.preventDefault()
        if (!loading) onSend(input)
      }}
    id={styles.chatForm}
    >
      <textarea
        className={styles.input}
        placeholder={loading ? 'Thinking...' : 'Type your message...'}
        rows={1}
        required
        value={input}
        onChange={e => setInput(e.target.value)}
        disabled={loading}
        style={{ resize: 'none' }}
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            if (!loading) onSend(input)
          }
        }}
      />
      <button
        type='button'
        className={`${styles.voiceBtn} ${isRecording ? styles.listening : ''}`}
        aria-label='Use voice input'
        onClick={onVoice}
        disabled={loading}
      >
        <svg
          xmlns='http://www.w3.org/2000/svg'
          viewBox='0 0 24 24'
          fill='currentColor'
        >
          <path d='M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z' />
        </svg>
      </button>
      <button
        type='submit'
        aria-label='Send message'
        disabled={loading || !input.trim()}
      >
        <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='currentColor'>
          <path d='M2.01 21L23 12 2.01 3 2 10l15 2-15 2z' />
        </svg>
      </button>
      <button
        type='button'
        aria-label='Stop text-to-speech'
        onClick={onStopTTS}
        disabled={loading}
      >
        <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='currentColor'>
          <path d='M6 6h12v12H6z' />
        </svg>
      </button>
    </form>
  )
}