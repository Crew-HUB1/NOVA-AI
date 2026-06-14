import { useEffect, useRef } from 'react'
import WelcomeScreen from './WelcomeScreen'
import { MessageList } from './Message'
import ScrollToBottom from './ScrollToBottom'

export default function ChatArea({ messages, busy, darkMode, onEdit, onRegenerate, onPromptClick }) {
  const chatRef = useRef(null)

  useEffect(() => {
    const el = chatRef.current
    if (el && messages.length > 0) {
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight
      })
    }
  }, [messages])

  return (
    <main className="chat" ref={chatRef}>
      {messages.length === 0 ? (
        <WelcomeScreen onPromptClick={onPromptClick} />
      ) : (
        <>
          <div className="chat-start" />
          <MessageList
            messages={messages}
            busy={busy}
            darkMode={darkMode}
            onEdit={onEdit}
            onRegenerate={onRegenerate}
          />
        </>
      )}
      <ScrollToBottom chatRef={chatRef} />
    </main>
  )
}
