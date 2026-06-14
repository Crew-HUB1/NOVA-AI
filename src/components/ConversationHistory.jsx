import { formatRelativeTime, deriveName } from '../utils'

export default function ConversationHistory({
  open,
  onClose,
  conversations,
  activeId,
  onSelect,
  onDelete,
  onNewChat,
}) {
  if (!open) return null

  return (
    <>
      <div className="history-overlay" onClick={onClose} />
      <aside className="history-panel" role="dialog" aria-label="Chat history">
        <div className="history-header">
          <h2>Chats</h2>
          <button className="drawer-close" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <button className="history-new-btn" onClick={() => { onNewChat(); onClose() }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New chat
        </button>

        <div className="history-list">
          {conversations.length === 0 && (
            <div className="history-empty">No conversations yet</div>
          )}
          {[...conversations]
            .sort((a, b) => b.updatedAt - a.updatedAt)
            .map((conv) => {
              const isActive = conv.id === activeId
              const name = conv.name || deriveName(conv.messages)
              return (
                <div
                  key={conv.id}
                  className={`history-item${isActive ? ' active' : ''}`}
                  onClick={() => { if (!isActive) onSelect(conv.id); onClose() }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !isActive) { onSelect(conv.id); onClose() } }}
                >
                  <div className="history-item-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                  <div className="history-item-body">
                    <div className="history-item-name">{name}</div>
                    <div className="history-item-meta">
                      {conv.messages.length > 0
                        ? `${conv.messages.length} msg\u00B7${formatRelativeTime(conv.updatedAt)}`
                        : 'Empty'}
                    </div>
                  </div>
                  <button
                    className="history-item-delete"
                    onClick={(e) => { e.stopPropagation(); onDelete(conv.id) }}
                    title="Delete chat"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              )
            })}
        </div>
      </aside>
    </>
  )
}
