import { useState, useEffect, useCallback } from 'react'

export default function ScrollToBottom({ chatRef }) {
  const [visible, setVisible] = useState(false)

  const handleScroll = useCallback(() => {
    const el = chatRef.current
    if (!el) return
    const threshold = 200
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold
    setVisible(!isNearBottom)
  }, [chatRef])

  useEffect(() => {
    const el = chatRef.current
    if (!el) return
    el.addEventListener('scroll', handleScroll)
    return () => el.removeEventListener('scroll', handleScroll)
  }, [chatRef, handleScroll])

  function scrollToBottom() {
    const el = chatRef.current
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    }
  }

  if (!visible) return null

  return (
    <button className="scroll-to-bottom" onClick={scrollToBottom} title="Scroll to bottom">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="7 13 12 18 17 13" />
        <polyline points="7 6 12 11 17 6" />
      </svg>
    </button>
  )
}
