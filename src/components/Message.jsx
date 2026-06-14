import { useState } from 'react'
import MarkdownRenderer from './MarkdownRenderer'
import AiMessageWithThinking from './AiMessageWithThinking'
import { parseThinking, formatTime, classNames } from '../utils'

export default function Message({ message, isLast, busy, darkMode, onEdit, onRegenerate }) {
  const [copied, setCopied] = useState(false)
  const m = message

  if (m.role === 'error') {
    return (
      <div className="msg msg-error">
        <div className="msg-avatar msg-avatar-error">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <div className="msg-bubble msg-bubble-error">{m.content}</div>
      </div>
    )
  }

  const isUser = m.role === 'user'
  const streaming = busy && isLast && m.role === 'assistant'
  const parts = m.parts || (m.content ? parseThinking(m.content) : null)
  const hasThinking = parts?.some((p) => p.type === 'thinking')

  function handleCopy() {
    navigator.clipboard.writeText(m.content).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (isUser) {
    return (
      <div className={classNames('msg', 'msg-user')}>
        <div className="msg-avatar msg-avatar-user">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <div className="msg-body">
          <div className="msg-bubble msg-bubble-user">{m.content}</div>
          <div className="msg-actions">
            <button className="msg-action-btn" onClick={() => onEdit()} title="Edit">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
            {m.timestamp && (
              <span className="msg-timestamp">{formatTime(m.timestamp)}</span>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={classNames('msg', 'msg-ai')}>
      <div className="msg-avatar msg-avatar-ai">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      </div>
      <div className="msg-body">
        <div className="msg-bubble msg-bubble-ai">
          {streaming && !m.content ? (
            <div className="typing-indicator">
              <span /><span /><span />
            </div>
          ) : hasThinking && !streaming && parts ? (
            <AiMessageWithThinking parts={parts} theme={darkMode ? 'dark' : 'light'} />
          ) : (
            <MarkdownRenderer content={m.content} theme={darkMode ? 'dark' : 'light'} />
          )}
          {streaming && m.content && (
            <MarkdownRenderer content={m.content} theme={darkMode ? 'dark' : 'light'} />
          )}
        </div>
        <div className="msg-actions">
          {m.content && !streaming && (
            <>
              <button className={classNames('msg-action-btn', copied && 'copied')} onClick={handleCopy} title={copied ? 'Copied!' : 'Copy'}>
                {copied ? (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                )}
              </button>
              <button className="msg-action-btn" onClick={onRegenerate} title="Regenerate">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10" />
                  <polyline points="1 20 1 14 7 14" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
              </button>
            </>
          )}
          {m.timestamp && (
            <span className="msg-timestamp">{formatTime(m.timestamp)}</span>
          )}
        </div>
      </div>
    </div>
  )
}

export function MessageList({ messages, busy, darkMode, onEdit, onRegenerate }) {
  return messages.map((m, i) => (
    <Message
      key={m.id}
      message={m}
      isLast={i === messages.length - 1}
      busy={busy}
      darkMode={darkMode}
      onEdit={() => onEdit(i)}
      onRegenerate={onRegenerate}
    />
  ))
}
