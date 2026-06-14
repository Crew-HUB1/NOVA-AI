import { useRef, useEffect } from 'react'

export default function Composer({
  input,
  busy,
  puterReady,
  signedIn,
  onInput,
  onSend,
  onStop,
  onKeyDown,
  inputRef,
}) {
  const textareaRef = useRef(null)

  useEffect(() => {
    if (inputRef) {
      inputRef.current = textareaRef.current
    }
  }, [inputRef])

  function handleInput(e) {
    onInput(e.target.value)
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = Math.min(el.scrollHeight, 180) + 'px'
    }
  }

  let placeholder = 'Loading Puter\u2026'
  if (puterReady) {
    placeholder = signedIn ? 'Type a message\u2026' : 'Sign in to start chatting\u2026'
  }

  return (
    <form
      className="composer"
      onSubmit={(e) => {
        e.preventDefault()
        onSend()
      }}
    >
      <textarea
        ref={textareaRef}
        className="composer-textarea"
        rows={1}
        value={input}
        onChange={handleInput}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        disabled={!puterReady}
      />
      <div className="composer-actions">
        {busy ? (
          <button type="button" className="stop-btn" onClick={onStop}>
            <span className="stop-btn-icon" />
            <span>Stop</span>
          </button>
        ) : (
          <button
            type="submit"
            className="send-btn"
            disabled={busy || !input.trim() || !puterReady}
            title="Send"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 2 }}>
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        )}
      </div>
    </form>
  )
}
