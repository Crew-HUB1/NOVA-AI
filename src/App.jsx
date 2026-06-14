import { useEffect, useRef, useState, useCallback } from 'react'
import Header from './components/Header'
import ChatArea from './components/ChatArea'
import Composer from './components/Composer'
import SettingsDrawer from './components/SettingsDrawer'
import ConversationHistory from './components/ConversationHistory'
import { parseThinking, downloadChat, generateId, deriveName, classNames } from './utils'
import {
  loadConversations, saveConversations,
  loadActiveId, saveActiveId,
} from './utils'

const DEFAULT_MODEL = 'claude-haiku-4-5'
const STORAGE_KEY = 'nova-chat-settings'

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

function persistConversations(conversations) {
  saveConversations(conversations)
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
  const [historyOpen, setHistoryOpen] = useState(false)

  // Auth
  const [user, setUser] = useState(null)
  const [signedIn, setSignedIn] = useState(false)

  // Check auth state when Puter is ready
  useEffect(() => {
    if (!puterReady) return
    const check = async () => {
      try {
        const isSigned = await window.puter.auth.isSignedIn()
        setSignedIn(isSigned)
        if (isSigned) {
          const userData = await window.puter.auth.getUser()
          setUser(userData)
        }
      } catch {
        setSignedIn(false)
        setUser(null)
      }
    }
    check()
  }, [puterReady])

  async function handleSignIn() {
    try {
      const result = await window.puter.auth.signIn()
      if (result?.success) {
        setSignedIn(true)
        const userData = await window.puter.auth.getUser()
        setUser(userData)
      }
    } catch (err) {
      console.error('Sign in failed:', err)
    }
  }

  async function handleSignOut() {
    try {
      await window.puter.auth.signOut()
      setSignedIn(false)
      setUser(null)
    } catch (err) {
      console.error('Sign out failed:', err)
    }
  }

  // Conversation management
  const [conversations, setConversations] = useState(() => {
    const saved = loadConversations()
    if (saved.length === 0) {
      const id = generateId()
      return [{ id, messages: [], createdAt: Date.now(), updatedAt: Date.now(), name: 'New chat' }]
    }
    return saved
  })
  const [activeId, setActiveId] = useState(() => {
    const savedId = loadActiveId()
    const convs = loadConversations()
    if (savedId && convs.some((c) => c.id === savedId)) return savedId
    return convs.length > 0 ? convs[0].id : null
  })

  const activeConversation = conversations.find((c) => c.id === activeId) || conversations[0]
  const messages = activeConversation?.messages || []
  const activeName = activeConversation ? (activeConversation.name || deriveName(messages)) : 'Nova'

  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)

  const inputRef = useRef(null)
  const cancelRef = useRef(null)
  const editIdxRef = useRef(-1)

  const activeRef = useRef(activeConversation)
  activeRef.current = activeConversation

  useEffect(() => {
    if (!activeId && conversations.length > 0) {
      setActiveId(conversations[0].id)
    }
  }, [activeId, conversations])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
  }, [darkMode])

  useEffect(() => {
    saveSettings({ model, streamMode, darkMode, systemPrompt, temperature })
  }, [model, streamMode, darkMode, systemPrompt, temperature])

  useEffect(() => {
    persistConversations(conversations)
  }, [conversations])

  useEffect(() => {
    saveActiveId(activeId)
  }, [activeId])

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
    return () => { cancelled = true }
  }, [puterReady])

  useEffect(() => {
    function handler(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSettingsOpen((o) => !o)
      }
      if (e.key === 'Escape') {
        setSettingsOpen(false)
        setHistoryOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  function updateCurrentMessages(updater) {
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.id === activeRef.current?.id)
      if (idx === -1) return prev
      const copy = [...prev]
      const conv = { ...copy[idx] }
      const newMessages = typeof updater === 'function' ? updater(conv.messages) : updater
      conv.messages = newMessages
      conv.updatedAt = Date.now()
      if (!conv.name || conv.name === 'New chat') {
        const derived = deriveName(newMessages)
        if (derived !== 'New chat') conv.name = derived
      }
      copy[idx] = conv
      return copy
    })
  }

  function syncMessagesToConversation() {
    updateCurrentMessages((msgs) => msgs)
  }

  function handleSelectConversation(id) {
    if (busy) stopGeneration()
    syncMessagesToConversation()
    setActiveId(id)
    setInput('')
    editIdxRef.current = -1
  }

  function handleNewChat() {
    if (busy) stopGeneration()
    syncMessagesToConversation()
    const id = generateId()
    setConversations((prev) => [
      ...prev,
      { id, messages: [], createdAt: Date.now(), updatedAt: Date.now(), name: 'New chat' },
    ])
    setActiveId(id)
    setInput('')
    editIdxRef.current = -1
  }

  function handleDeleteConversation(id) {
    setConversations((prev) => {
      const filtered = prev.filter((c) => c.id !== id)
      if (filtered.length === 0) {
        const newId = generateId()
        return [{ id: newId, messages: [], createdAt: Date.now(), updatedAt: Date.now(), name: 'New chat' }]
      }
      return filtered
    })
    setActiveId((prevId) => {
      if (prevId === id) {
        const remaining = conversations.filter((c) => c.id !== id)
        return remaining.length > 0 ? remaining[0].id : null
      }
      return prevId
    })
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
      editIdxRef.current = -1
    } else {
      history = [...messages, { role: 'user', content: text, timestamp: Date.now(), id: `msg-${++msgCounter}` }]
    }

    updateCurrentMessages(history)
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
        updateCurrentMessages((msgs) => [
          ...msgs,
          { role: 'assistant', content: '', parts: null, timestamp: Date.now(), id: msgId },
        ])
        const resp = await window.puter.ai.chat(apiMessages, options)
        let fullContent = ''
        for await (const part of resp) {
          if (cancelled) break
          const chunk = part?.text || ''
          if (!chunk) continue
          fullContent += chunk
          updateCurrentMessages((msgs) => {
            const copy = [...msgs]
            const idx = copy.findIndex((m) => m.id === msgId)
            if (idx === -1) return copy
            copy[idx] = { ...copy[idx], content: fullContent, parts: null }
            return copy
          })
        }
        if (!cancelled) {
          updateCurrentMessages((msgs) => {
            const copy = [...msgs]
            const idx = copy.findIndex((m) => m.id === msgId)
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
        updateCurrentMessages((msgs) => [
          ...msgs,
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
      updateCurrentMessages((msgs) => [
        ...msgs,
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
    updateCurrentMessages([])
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.id === activeRef.current?.id)
      if (idx === -1) return prev
      const copy = [...prev]
      copy[idx] = { ...copy[idx], name: 'New chat' }
      return copy
    })
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
    updateCurrentMessages(messages.slice(0, idx))
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
    updateCurrentMessages(messages.slice(0, idx))
  }

  return (
    <div className={classNames('app', busy && 'app-busy')}>
      <Header
        darkMode={darkMode}
        activeName={activeName}
        signedIn={signedIn}
        user={user}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        onToggleDark={() => setDarkMode((d) => !d)}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenHistory={() => setHistoryOpen((o) => !o)}
        onNewChat={handleNewChat}
      />
      <ChatArea
        messages={messages}
        busy={busy}
        darkMode={darkMode}
        onEdit={handleEdit}
        onRegenerate={handleRegenerate}
        onPromptClick={handlePromptClick}
      />
      <Composer
        input={input}
        busy={busy}
        puterReady={puterReady}
        signedIn={signedIn}
        onInput={setInput}
        onSend={send}
        onStop={stopGeneration}
        onKeyDown={onKeyDown}
        inputRef={inputRef}
      />
      <footer className="footer">
        <a href="https://developer.puter.com" target="_blank" rel="noopener">
          Powered by Puter
        </a>
      </footer>
      <SettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        models={models}
        model={model}
        onModelChange={setModel}
        modelSearch={modelSearch}
        onModelSearchChange={setModelSearch}
        temperature={temperature}
        onTemperatureChange={setTemperature}
        systemPrompt={systemPrompt}
        onSystemPromptChange={setSystemPrompt}
        streamMode={streamMode}
        onStreamModeChange={setStreamMode}
        darkMode={darkMode}
        onDarkModeChange={setDarkMode}
        signedIn={signedIn}
        user={user}
        onSignOut={handleSignOut}
        onSignIn={handleSignIn}
        onExport={() => downloadChat(messages)}
        onClearChat={clearChat}
        messagesCount={messages.length}
      />
      <ConversationHistory
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        conversations={conversations}
        activeId={activeId}
        onSelect={handleSelectConversation}
        onDelete={handleDeleteConversation}
        onNewChat={handleNewChat}
      />
    </div>
  )
}
