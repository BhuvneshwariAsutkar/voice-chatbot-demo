import styles from './ChatHeader.module.scss'

export default function ChatHeader({ onClose }) {
  return (
    <div className={styles.header}>
      <span id='chat-header'>Talk to us!</span>
      <button className={styles.closeBtn} onClick={onClose} aria-label='Close chat'>×</button>
    </div>
  )
}