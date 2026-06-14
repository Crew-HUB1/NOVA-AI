const WELCOME_PROMPTS = [
  { label: 'Explain', text: 'Explain quantum computing in simple terms' },
  { label: 'Code', text: 'Write a Python function to sort a list of dictionaries by a key' },
  { label: 'Write', text: 'Write a short poem about artificial intelligence' },
  { label: 'Debug', text: 'Why does this code return undefined?\n\n```js\nfunction foo() {\n  return\n    { bar: 1 }\n}\n```' },
]

export default function WelcomeScreen({ onPromptClick }) {
  return (
    <div className="welcome">
      <div className="welcome-graphic">
        <div className="welcome-graphic-ring" />
        <div className="welcome-graphic-ring" />
        <div className="welcome-graphic-ring" />
        <div className="welcome-logo">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
      </div>
      <h2>What can I help with?</h2>
      <p>500+ AI models, no API key required. Pick a model and start chatting.</p>
      <div className="welcome-prompts">
        {WELCOME_PROMPTS.map((p) => (
          <button
            key={p.label}
            className="prompt-btn"
            onClick={() => onPromptClick(p.text)}
          >
            <span className="prompt-btn-label">{p.label}</span>
            {p.text.length > 60 ? p.text.slice(0, 60) + '\u2026' : p.text}
          </button>
        ))}
      </div>
    </div>
  )
}
