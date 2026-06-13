import { useEffect, useRef, useState } from 'react'

const DEFAULT_MODEL = 'claude-haiku-4-5'

// Pick the best Haiku id available; fall back to a known default.
function pickDefault(ids) {
  const haikus = ids.filter((id) => /haiku/i.test(id))
  if (haikus.length) {
    // prefer the highest claude haiku version
    const claude = haikus.filter((id) => /claude/i.test(id)).sort().reverse()
    return (claude[0] || haikus[0])
  }
  return ids.includes(DEFAULT_MODEL) ? DEFAULT_MODEL : ids[0]
}

// Wait for the global puter object injected by the SDK <script> tag.
function usePuterReady() {
  const [ready, setReady] = useState(typeof window !== 'undefined' && !!window.puter)
  useEffect(() => {
    if (ready) return
    const id = setInterval(() => {
      if (window.puter) {
        clearInterval(id)
        setReady(true)
      }
    }, 100)
    return () => clearInterval(id)
  }, [ready])
  return ready
}

export default function App() {
  const puterReady = usePuterReady()

  const [models, setModels] = useState([])
  const [model, setModel] = useState(DEFAULT_MODEL)
  const [streamMode, setStreamMode] = useState(true)
  const [messages, setMessages] = useState([]) // {role:'user'|'assistant'|'error', content}
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)

  const chatRef = useRef(null)
  const inputRef = useRef(null)

  // Load models for the dropdown.
  useEffect(() => {
    if (!puterReady) return
    let cancelled = false
    ;(async () => {
      try {
        const list = await window.puter.ai.listModels()
        if (cancelled) return
        // Normalise: SDK may return array of objects or grouped data.
        const flat = Array.isArray(list)
          ? list
          : Object.values(list || {}).flat()
        const ids = [
          ...new Set(
            flat
              .map((m) => (typeof m === 'string' ? m : m?.id))
              .filter(Boolean)
          ),
        ].sort()
        const finalIds = ids.length ? ids : [DEFAULT_MODEL]
        setModels(finalIds)
        setModel(pickDefault(finalIds))
      } catch (err) {
        console.error('listModels failed', err)
        setModels([DEFAULT_MODEL])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [puterReady])

  // Auto-scroll on new messages.
  useEffect(() => {
    const el = chatRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  // Auto-grow textarea.
  function onInput(e) {
    setInput(e.target.value)
    const el = inputRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = Math.min(el.scrollHeight, 160) + 'px'
    }
  }

  async function send() {
    const text = input.trim()
    if (!text || busy || !puterReady) return

    const history = [...messages, { role: 'user', content: text }]
    setMessages(history)
    setInput('')
    if (inputRef.current) inputRef.current.style.height = 'auto'
    setBusy(true)

    // Build message array for context (only user/assistant turns).
    const apiMessages = history
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role, content: m.content }))

    try {
      if (streamMode) {
        setMessages((m) => [...m, { role: 'assistant', content: '' }])
        const resp = await window.puter.ai.chat(apiMessages, {
          model,
          stream: true,
        })
        for await (const part of resp) {
          const chunk = part?.text || ''
          if (!chunk) continue
          setMessages((m) => {
            const copy = [...m]
            copy[copy.length - 1] = {
              role: 'assistant',
              content: copy[copy.length - 1].content + chunk,
            }
            return copy
          })
        }
      } else {
        const resp = await window.puter.ai.chat(apiMessages, { model })
        const content =
          resp?.message?.content ??
          resp?.text ??
          (typeof resp === 'string' ? resp : JSON.stringify(resp))
        setMessages((m) => [...m, { role: 'assistant', content }])
      }
    } catch (err) {
      console.error(err)
      setMessages((m) => [
        ...m,
        {
          role: 'error',
          content: `Error: ${err?.message || err}. The model may be unavailable, or you may need to sign in.`,
        },
      ])
    } finally {
      setBusy(false)
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  function clearChat() {
    setMessages([])
  }

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <span className="logo">✦</span>
          <h1>Nova Chat</h1>
        </div>
        <div className="controls">
          <label className="stream-toggle">
            <input
              type="checkbox"
              checked={streamMode}
              onChange={(e) => setStreamMode(e.target.checked)}
            />
            <span>Stream</span>
          </label>
          <select
            id="modelSelect"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            disabled={!models.length}
          >
            {!models.length && <option>Loading models…</option>}
            {models.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
          <button className="ghost" onClick={clearChat} title="Clear chat">
            Clear
          </button>
        </div>
      </header>

      <main className="chat" ref={chatRef}>
        {messages.length === 0 && (
          <div className="welcome">
            <span className="logo big">✦</span>
            <h2>Ask anything</h2>
            <p>Pick a model and start chatting. 500+ models, no API key.</p>
          </div>
        )}
        {messages.map((m, i) => {
          const cls =
            m.role === 'user' ? 'user' : m.role === 'error' ? 'error' : 'ai'
          const streaming =
            busy && i === messages.length - 1 && m.role === 'assistant'
          return (
            <div key={i} className={`msg ${cls}`}>
              {m.content ||
                (streaming ? (
                  <span className="typing">
                    <span></span>
                    <span></span>
                    <span></span>
                  </span>
                ) : (
                  ''
                ))}
            </div>
          )
        })}
      </main>

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
      >
        <textarea
          id="input"
          ref={inputRef}
          rows={1}
          value={input}
          onChange={onInput}
          onKeyDown={onKeyDown}
          placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
        />
        <button type="submit" id="sendBtn" disabled={busy || !input.trim()}>
          ➤
        </button>
      </form>

      <footer className="footer">
        <a href="https://developer.puter.com" target="_blank" rel="noopener">
          Powered by Puter
        </a>
      </footer>
    </div>
  )
}
