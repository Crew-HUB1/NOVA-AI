import { useEffect, useRef, useState, useCallback } from 'react'
import MarkdownRenderer from './components/MarkdownRenderer'

const DEFAULT_MODEL = 'claude-haiku-4-5'
const STORAGE_KEY = 'nova-chat-settings'
const WELCOME_PROMPTS = [
  { label: 'Explain', text: 'Explain quantum computing in simple terms' },
  { label: 'Code', text: 'Write a Python function to sort a list of dictionaries by a key' },
  { label: 'Write', text: 'Write a short poem about artificial intelligence' },
  { label: 'Debug', text: 'Why does this code return undefined?\n\n```js\nfunction foo() {\n  return\n    { bar: 1 }\n}\n```' },
]

let msgCounter = 0

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return {}
}

function saveSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {}
}

function pickDefault(ids) {
  const haikus = ids.filter((id) => /haiku/i.test(id))
  if (haikus.length) {
    const claude = haikus.filter((id) => /claude/i.test(id)).sort().reverse()
    return claude[0] || haikus[0]
  }
  return ids.includes(DEFAULT_MODEL) ? DEFAULT_MODEL : ids[0]
}

function usePuterReady() {
  const [ready, setReady] = useState(
    () => typeof window !== 'undefined' && !!window.puter
  )
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

function parseThinking(content) {
  const parts = []
  let lastIndex = 0
  const regex = /<thinking>([\s\S]*?)<\/thinking>/g
  let match
  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: content.slice(lastIndex, match.index) })
    }
    parts.push({ type: 'thinking', content: match[1].trim() })
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < content.length) {
    parts.push({ type: 'text', content: content.slice(lastIndex) })
  }
  return parts.length > 0 ? parts : [{ type: 'text', content }]
}

function formatTime(ts) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(ts)
}

function downloadChat(messages) {
  const text = messages
    .filter((m) => m.role !== 'error')
    .map((m) => {
      const label = m.role === 'user' ? 'You' : 'AI'
      return `## ${label}\n\n${m.content}`
    })
    .join('\n\n---\n\n')
  const blob = new Blob([text], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `nova-chat-${new Date().toISOString().slice(0, 10)}.md`
  a.click()
  URL.revokeObjectURL(url)
}

export default function App() {
  const puterReady = usePuterReady()
  const saved = loadSettings()

  const [models, setModels] = useState([])
  const [model, setModel] = useState(saved.model || DEFAULT_MODEL)
  const [modelSearch, setModelSearch] = useState('')
  const [streamMode, setStreamMode] = useState(
    saved.streamMode !== undefined ? saved.streamMode : true
  )
  const [darkMode, setDarkMode] = useState(
    saved.darkMode !== undefined ? saved.darkMode : true
  )
  const [systemPrompt, setSystemPrompt] = useState(saved.systemPrompt || '')
  const [temperature, setTemperature] = useState(
    saved.temperature !== undefined ? saved.temperature : ''
  )
  const [settingsOpen, setSettingsOpen] = useState(false)

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)

  const chatRef = useRef(null)
  const inputRef = useRef(null)
  const cancelRef = useRef(null)
  const editIdxRef = useRef(-1)

  // Theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  // Persist settings
  useEffect(() => {
    saveSettings({ model, streamMode, darkMode, systemPrompt, temperature })
  }, [model, streamMode, darkMode, systemPrompt, temperature])

  // Load models
  useEffect(() => {
    if (!puterReady) return
    let cancelled = false
    ;(async () => {
      try {
        const list = await window.puter.ai.listModels()
        if (cancelled) return
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
        setModel((prev) => {
          if (finalIds.includes(prev)) return prev
          return pickDefault(finalIds)
        })
      } catch {
        setModels([DEFAULT_MODEL])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [puterReady])

  // Auto-scroll
  useEffect(() => {
    const el = chatRef.current
    if (el) {
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight
      })
    }
  }, [messages])

  // Keyboard shortcuts
  useEffect(() => {
    function handler(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSettingsOpen((o) => !o)
      }
      if (e.key === 'Escape') {
        setSettingsOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  function onInput(e) {
    setInput(e.target.value)
    const el = inputRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = Math.min(el.scrollHeight, 180) + 'px'
    }
  }

  function stopGeneration() {
    if (cancelRef.current) {
      cancelRef.current()
      cancelRef.current = null
    }
  }

  const send = useCallback(async (overrideContent) => {
    const text = (overrideContent || input).trim()
    if (!text || busy || !puterReady) return

    let history
    let editIdx = editIdxRef.current

    if (editIdx >= 0) {
      history = messages.slice(0, editIdx)
      history.push({ role: 'user', content: text, timestamp: Date.now(), id: `msg-${++msgCounter}` })
      setMessages(history)
      editIdxRef.current = -1
    } else {
      history = [...messages, { role: 'user', content: text, timestamp: Date.now(), id: `msg-${++msgCounter}` }]
      setMessages(history)
    }

    setInput('')
    if (inputRef.current) inputRef.current.style.height = 'auto'
    setBusy(true)

    let apiMessages = history
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role, content: m.content }))

    if (systemPrompt.trim()) {
      apiMessages = [
        { role: 'system', content: systemPrompt.trim() },
        ...apiMessages,
      ]
    }

    const options = { model }
    if (streamMode) options.stream = true
    if (temperature !== '' && !isNaN(Number(temperature))) {
      options.temperature = Number(temperature)
    }

    let cancelled = false
    const abortController = new AbortController()
    options.signal = abortController.signal
    cancelRef.current = () => {
      cancelled = true
      abortController.abort()
    }

    try {
      if (streamMode) {
        const msgId = `msg-${++msgCounter}`
        setMessages((m) => [
          ...m,
          { role: 'assistant', content: '', parts: null, timestamp: Date.now(), id: msgId },
        ])
        const resp = await window.puter.ai.chat(apiMessages, options)
        let fullContent = ''
        for await (const part of resp) {
          if (cancelled) break
          const chunk = part?.text || ''
          if (!chunk) continue
          fullContent += chunk
          setMessages((m) => {
            const copy = [...m]
            const idx = copy.findIndex((msg) => msg.id === msgId)
            if (idx === -1) return copy
            copy[idx] = { ...copy[idx], content: fullContent, parts: null }
            return copy
          })
        }
        if (!cancelled) {
          setMessages((m) => {
            const copy = [...m]
            const idx = copy.findIndex((msg) => msg.id === msgId)
            if (idx === -1) return copy
            copy[idx] = { ...copy[idx], parts: parseThinking(fullContent) }
            return copy
          })
        }
      } else {
        const resp = await window.puter.ai.chat(apiMessages, options)
        const content =
          resp?.message?.content ??
          resp?.text ??
          (typeof resp === 'string' ? resp : JSON.stringify(resp))
        setMessages((m) => [
          ...m,
          {
            role: 'assistant',
            content,
            parts: parseThinking(content),
            timestamp: Date.now(),
            id: `msg-${++msgCounter}`,
          },
        ])
      }
    } catch (err) {
      if (err?.name === 'AbortError' || cancelled) return
      console.error(err)
      setMessages((m) => [
        ...m,
        {
          role: 'error',
          content: `Error: ${err?.message || err}. The model may be unavailable, or you may need to sign in.`,
          id: `msg-${++msgCounter}`,
        },
      ])
    } finally {
      setBusy(false)
      cancelRef.current = null
    }
  }, [input, busy, puterReady, messages, systemPrompt, model, streamMode, temperature])

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  function clearChat() {
    setMessages([])
  }

  function handlePromptClick(text) {
    setInput(text)
    if (inputRef.current) {
      inputRef.current.value = text
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 180) + 'px'
    }
    inputRef.current?.focus()
  }

  function handleRegenerate() {
    const lastUserIdx = [...messages].reverse().findIndex((m) => m.role === 'user')
    if (lastUserIdx === -1) return
    const idx = messages.length - 1 - lastUserIdx
    const userMsg = messages[idx]
    editIdxRef.current = idx
    setInput(userMsg.content)
    if (inputRef.current) {
      inputRef.current.value = userMsg.content
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 180) + 'px'
    }
    inputRef.current?.focus()
    // Remove messages after this user message
    setMessages(messages.slice(0, idx))
    // Auto-send after brief delay to let state update
    setTimeout(() => {
      editIdxRef.current = idx
      send(userMsg.content)
    }, 50)
  }

  function handleEdit(idx) {
    const msg = messages[idx]
    if (msg.role !== 'user') return
    editIdxRef.current = idx
    setInput(msg.content)
    if (inputRef.current) {
      inputRef.current.value = msg.content
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 180) + 'px'
    }
    inputRef.current?.focus()
    setMessages(messages.slice(0, idx))
  }

  function handleCopyContent(content) {
    navigator.clipboard.writeText(content).catch(() => {})
  }

  const filteredModels = models.filter((id) =>
    id.toLowerCase().includes(modelSearch.toLowerCase())
  )

  const lastIsAssistant =
    messages.length > 0 &&
    messages[messages.length - 1].role === 'assistant' &&
    busy

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <div className="brand-logo">N</div>
          <h1>Nova</h1>
        </div>
        <div className="header-actions">
          <button
            className="icon-btn"
            onClick={() => setDarkMode((d) => !d)}
            data-tip={darkMode ? 'Light mode' : 'Dark mode'}
          >
            {darkMode ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
          <button
            className={`icon-btn${settingsOpen ? ' active' : ''}`}
            onClick={() => setSettingsOpen((o) => !o)}
            data-tip="Settings"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
          <button className="icon-btn" onClick={clearChat} data-tip="Clear chat">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      </header>

      <main className="chat" ref={chatRef}>
        {messages.length === 0 && (
          <div className="welcome">
            <div className="welcome-logo">N</div>
            <h2>Ask anything</h2>
            <p>500+ AI models, no API key required. Pick a model and start chatting.</p>
            <div className="welcome-prompts">
              {WELCOME_PROMPTS.map((p) => (
                <button
                  key={p.label}
                  className="prompt-btn"
                  onClick={() => handlePromptClick(p.text)}
                >
                  <span className="prompt-btn-label">{p.label}</span>
                  {p.text.length > 60 ? p.text.slice(0, 60) + '…' : p.text}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => {
          if (m.role === 'error') {
            return (
              <div key={m.id || i} className="msg error">
                <div className="msg-avatar">!</div>
                <div className="msg-bubble">{m.content}</div>
              </div>
            )
          }

          const isUser = m.role === 'user'
          const streaming = busy && i === messages.length - 1 && m.role === 'assistant'
          const parts = m.parts || (m.content ? parseThinking(m.content) : null)
          const hasThinking = parts?.some((p) => p.type === 'thinking')

          if (isUser) {
            return (
              <div key={m.id || i} className="msg user">
                <div className="msg-body">
                  <div className="msg-bubble">{m.content}</div>
                  <div className="msg-actions">
                    <button
                      className="msg-action-btn"
                      onClick={() => handleEdit(i)}
                      title="Edit"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    {m.timestamp && (
                      <span className="msg-timestamp" style={{ opacity: 1, fontSize: 11, color: 'var(--text-muted)', paddingLeft: 4 }}>
                        {formatTime(m.timestamp)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="msg-avatar">U</div>
              </div>
            )
          }

          return (
            <div key={m.id || i} className="msg ai">
              <div className="msg-avatar">N</div>
              <div className="msg-body">
                <div className="msg-bubble">
                  {streaming && !m.content ? (
                    <div className="typing-indicator">
                      <span /><span /><span />
                    </div>
                  ) : hasThinking && !streaming && parts ? (
                    <AiMessageWithThinking parts={parts} theme={darkMode ? 'dark' : 'light'} />
                  ) : (
                    <MarkdownRenderer
                      content={m.content}
                      theme={darkMode ? 'dark' : 'light'}
                    />
                  )}
                  {streaming && m.content && (
                    <MarkdownRenderer
                      content={m.content}
                      theme={darkMode ? 'dark' : 'light'}
                    />
                  )}
                </div>
                <div className="msg-actions">
                  {m.content && !streaming && (
                    <>
                      <button
                        className="msg-action-btn"
                        onClick={() => handleCopyContent(m.content)}
                        title="Copy"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                      </button>
                      <button
                        className="msg-action-btn"
                        onClick={handleRegenerate}
                        title="Regenerate"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="23 4 23 10 17 10" />
                          <polyline points="1 20 1 14 7 14" />
                          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                        </svg>
                      </button>
                    </>
                  )}
                  {m.timestamp && (
                    <span className="msg-timestamp">
                      {formatTime(m.timestamp)}
                    </span>
                  )}
                </div>
              </div>
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
          ref={inputRef}
          className="composer-textarea"
          rows={1}
          value={input}
          onChange={onInput}
          onKeyDown={onKeyDown}
          placeholder={puterReady ? 'Type a message…' : 'Loading Puter…'}
          disabled={!puterReady}
        />
        <div className="composer-actions">
          {busy ? (
            <button type="button" className="stop-btn" onClick={stopGeneration}>
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

      <footer className="footer">
        <a href="https://developer.puter.com" target="_blank" rel="noopener">
          Powered by Puter
        </a>
      </footer>

      {settingsOpen && (
        <>
          <div className="drawer-overlay" onClick={() => setSettingsOpen(false)} />
          <div className="drawer">
            <div className="drawer-header">
              <h2>Settings</h2>
              <button className="drawer-close" onClick={() => setSettingsOpen(false)}>
                &times;
              </button>
            </div>
            <div className="drawer-body">
              <div className="setting-group">
                <span className="setting-label">Model</span>
                <span className="setting-description">
                  Search among 500+ models
                </span>
                <div className="model-search-wrapper">
                  <span className="model-search-icon">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                  </span>
                  <input
                    className="model-search"
                    type="text"
                    placeholder="Search models…"
                    value={modelSearch}
                    onChange={(e) => setModelSearch(e.target.value)}
                  />
                </div>
                <select
                  className="model-select"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  disabled={!models.length}
                  size={Math.min(filteredModels.length || 1, 8)}
                >
                  {filteredModels.length === 0 && (
                    <option disabled>No models match</option>
                  )}
                  {filteredModels.map((id) => (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  ))}
                </select>
              </div>

              <div className="setting-group">
                <span className="setting-label">Temperature</span>
                <span className="setting-description">
                  Controls randomness (0–2). Leave empty for default.
                </span>
                <input
                  className="setting-input"
                  type="number"
                  min="0"
                  max="2"
                  step="0.1"
                  placeholder="Default"
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                />
              </div>

              <div className="setting-group">
                <span className="setting-label">System Prompt</span>
                <span className="setting-description">
                  Set the behavior and persona of the AI
                </span>
                <textarea
                  className="setting-textarea"
                  placeholder="You are a helpful assistant…"
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="setting-group">
                <div className="setting-row">
                  <div>
                    <span className="setting-label">Streaming</span>
                    <span className="setting-description">
                      Show responses token by token
                    </span>
                  </div>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={streamMode}
                      onChange={(e) => setStreamMode(e.target.checked)}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>
              </div>

              <div className="setting-group">
                <div className="setting-row">
                  <div>
                    <span className="setting-label">Dark Mode</span>
                    <span className="setting-description">
                      Toggle between light and dark theme
                    </span>
                  </div>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={darkMode}
                      onChange={(e) => setDarkMode(e.target.checked)}
                    />
                    <span className="toggle-slider" />
                  </label>
                </div>
              </div>

              <div className="setting-group">
                <span className="setting-label">Export</span>
                <span className="setting-description">
                  Download chat as Markdown
                </span>
                <button
                  className="btn-secondary"
                  onClick={() => downloadChat(messages)}
                  disabled={messages.length === 0}
                >
                  Download chat
                </button>
              </div>

              <div className="setting-group">
                <span className="setting-label">Danger Zone</span>
                <button className="btn-danger" onClick={clearChat}>
                  Clear conversation
                </button>
              </div>

              <div className="setting-group">
                <span className="setting-description" style={{ textAlign: 'center' }}>
                  Press <kbd>Ctrl+K</kbd> to toggle settings
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function AiMessageWithThinking({ parts, theme }) {
  const [thinkingOpen, setThinkingOpen] = useState(false)

  return (
    <div>
      {parts.map((part, i) => {
        if (part.type === 'thinking') {
          return (
            <div key={i} style={{ margin: '4px 0' }}>
              <div
                className="thinking-header"
                onClick={() => setThinkingOpen((o) => !o)}
              >
                <div className="thinking-spinner" />
                <span>Thinking</span>
                <span className={`thinking-toggle${thinkingOpen ? ' open' : ''}`}>
                  &#9654;
                </span>
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
