const CONVERSATIONS_KEY = 'nova-conversations'
const ACTIVE_ID_KEY = 'nova-active-id'

let convCounter = 0

export function generateId() {
  return `conv-${++convCounter}-${Date.now()}`
}

export function loadConversations() {
  try {
    const raw = localStorage.getItem(CONVERSATIONS_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

export function saveConversations(conversations) {
  try {
    localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations))
  } catch {}
}

export function loadActiveId() {
  try {
    return localStorage.getItem(ACTIVE_ID_KEY)
  } catch {}
  return null
}

export function saveActiveId(id) {
  try {
    if (id) localStorage.setItem(ACTIVE_ID_KEY, id)
    else localStorage.removeItem(ACTIVE_ID_KEY)
  } catch {}
}

export function formatRelativeTime(ts) {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(ts)
}

export function formatTime(ts) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(ts)
}

export function parseThinking(content) {
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

export function downloadChat(messages) {
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

export function classNames(...args) {
  return args.filter(Boolean).join(' ')
}

export function deriveName(messages) {
  const first = messages.find((m) => m.role === 'user')
  if (!first) return 'New chat'
  const cleaned = first.content.replace(/```[\s\S]*?```/g, '').trim()
  return cleaned.length > 40 ? cleaned.slice(0, 40) + '\u2026' : cleaned
}
