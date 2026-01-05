import { forwardRef } from 'react'
import { marked } from 'marked'
import styles from './ChatHistory.module.scss'

// Configure marked for GFM and custom link rendering
marked.setOptions({
  gfm: true,
  breaks: true
});
marked.use({
  renderer: {
    link(token) {
      const href = token.href || '';
      const text = token.text || '';
      return `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a> (<a href="${href}" target="_blank" rel="noopener noreferrer">${href}</a>)`;
    }
  }
});

const ChatHistory = forwardRef(({ messages, loading }, ref) => (
  <div id={styles.chatHistory} className={styles.messages} ref={ref}>
    {messages.map((msg, i) => (
      <div key={i} className={`${styles.messages} ${styles[msg.role]}`}>
        <div
          className={styles.bubble}
          dangerouslySetInnerHTML={{
            __html: marked.parse(
              Array.isArray(msg.text) ? msg.text.join(' ') : (msg.text || '')
            )
          }}
        />
      </div>
    ))}
    {loading && <div className={styles.spinner}>...</div>}
  </div>
))
export default ChatHistory;