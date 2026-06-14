import { useState } from 'react'
import MarkdownRenderer from './MarkdownRenderer'

export default function AiMessageWithThinking({ parts, theme }) {
  const [thinkingOpen, setThinkingOpen] = useState(false)

  return (
    <div>
      {parts.map((part, i) => {
        if (part.type === 'thinking') {
          return (
            <div key={i} className="thinking-block">
              <div
                className="thinking-header"
                onClick={() => setThinkingOpen((o) => !o)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setThinkingOpen((o) => !o) } }}
              >
                <div className="thinking-spinner" />
                <span>Thinking</span>
                <svg
                  className={`thinking-chevron${thinkingOpen ? ' open' : ''}`}
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
              {thinkingOpen && (
                <div className="thinking-content">{part.content}</div>
              )}
            </div>
          )
        }
        return (
          <div key={i}>
            <MarkdownRenderer content={part.content} theme={theme} />
          </div>
        )
      })}
    </div>
  )
}
