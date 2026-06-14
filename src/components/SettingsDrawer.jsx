export default function SettingsDrawer({
  open,
  onClose,
  models,
  model,
  onModelChange,
  modelSearch,
  onModelSearchChange,
  temperature,
  onTemperatureChange,
  systemPrompt,
  onSystemPromptChange,
  streamMode,
  onStreamModeChange,
  darkMode,
  onDarkModeChange,
  signedIn,
  user,
  onSignOut,
  onSignIn,
  onExport,
  onClearChat,
  messagesCount,
}) {
  if (!open) return null

  const filteredModels = models.filter((id) =>
    id.toLowerCase().includes(modelSearch.toLowerCase())
  )

  const displayName = user?.username || user?.uuid || 'User'

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer" role="dialog" aria-label="Settings">
        <div className="drawer-header">
          <h2>Settings</h2>
          <button className="drawer-close" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="drawer-body">
          <div className="setting-group">
            <div className="user-info-card">
              <div className="user-info-avatar">{displayName[0].toUpperCase()}</div>
              <div className="user-info-body">
                <span className="user-info-name">{displayName}</span>
                <span className="user-info-status">{signedIn ? 'Signed in' : 'Signed out'}</span>
              </div>
              {signedIn ? (
                <button className="user-info-signout" onClick={onSignOut} title="Sign out">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                </button>
              ) : (
                <button className="user-info-signin" onClick={onSignIn}>
                  Sign in
                </button>
              )}
            </div>
          </div>

          <div className="setting-group">
            <span className="setting-label">Model</span>
            <span className="setting-description">Search among 500+ models</span>
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
                placeholder="Search models\u2026"
                value={modelSearch}
                onChange={(e) => onModelSearchChange(e.target.value)}
              />
            </div>
            <select
              className="model-select"
              value={model}
              onChange={(e) => onModelChange(e.target.value)}
              disabled={!models.length}
              size={Math.min(filteredModels.length || 1, 8)}
            >
              {filteredModels.length === 0 && (
                <option disabled>No models match</option>
              )}
              {filteredModels.map((id) => (
                <option key={id} value={id}>{id}</option>
              ))}
            </select>
          </div>

          <div className="setting-group">
            <span className="setting-label">Temperature</span>
            <span className="setting-description">Controls randomness (0\u20132). Leave empty for default.</span>
            <input
              className="setting-input"
              type="number"
              min="0"
              max="2"
              step="0.1"
              placeholder="Default"
              value={temperature}
              onChange={(e) => onTemperatureChange(e.target.value)}
            />
          </div>

          <div className="setting-group">
            <span className="setting-label">System Prompt</span>
            <span className="setting-description">Set the behavior and persona of the AI</span>
            <textarea
              className="setting-textarea"
              placeholder="You are a helpful assistant\u2026"
              value={systemPrompt}
              onChange={(e) => onSystemPromptChange(e.target.value)}
              rows={3}
            />
          </div>

          <div className="setting-group">
            <div className="setting-row">
              <div>
                <span className="setting-label">Streaming</span>
                <span className="setting-description">Show responses token by token</span>
              </div>
              <label className="toggle">
                <input type="checkbox" checked={streamMode} onChange={(e) => onStreamModeChange(e.target.checked)} />
                <span className="toggle-slider" />
              </label>
            </div>
          </div>

          <div className="setting-group">
            <div className="setting-row">
              <div>
                <span className="setting-label">Dark Mode</span>
                <span className="setting-description">Toggle between light and dark theme</span>
              </div>
              <label className="toggle">
                <input type="checkbox" checked={darkMode} onChange={(e) => onDarkModeChange(e.target.checked)} />
                <span className="toggle-slider" />
              </label>
            </div>
          </div>

          <div className="setting-group">
            <span className="setting-label">Export</span>
            <span className="setting-description">Download chat as Markdown</span>
            <button className="btn-secondary" onClick={onExport} disabled={messagesCount === 0}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, verticalAlign: 'middle' }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download chat
            </button>
          </div>

          <div className="setting-group">
            <span className="setting-label">Danger Zone</span>
            <button className="btn-danger" onClick={onClearChat}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, verticalAlign: 'middle' }}>
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              Clear conversation
            </button>
          </div>

          <div className="setting-group setting-shortcuts">
            <span className="setting-description">
              Press <kbd>Ctrl+K</kbd> to toggle settings
            </span>
          </div>
        </div>
      </div>
    </>
  )
}
