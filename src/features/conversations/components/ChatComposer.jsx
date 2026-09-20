import { useEffect, useRef, useState } from 'react'

/**
 * Chat message composer — safe-area + keyboard aware (same visualViewport
 * pattern as AppBottomSheet keyboardAware).
 */
export default function ChatComposer({
  disabled = false,
  sending = false,
  onSend,
  onAttach,
  onKeyboardInsetChange,
}) {
  const [text, setText] = useState('')
  const [keyboardInset, setKeyboardInset] = useState(0)
  const fileRef = useRef(null)
  const rootRef = useRef(null)

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const vv = window.visualViewport
    if (!vv) return undefined

    const sync = () => {
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
      // Ignore tiny chrome shifts; only lift for a real keyboard.
      setKeyboardInset(inset > 40 ? inset : 0)
    }
    sync()
    vv.addEventListener('resize', sync)
    vv.addEventListener('scroll', sync)
    return () => {
      vv.removeEventListener('resize', sync)
      vv.removeEventListener('scroll', sync)
    }
  }, [])

  useEffect(() => {
    onKeyboardInsetChange?.(keyboardInset)
  }, [keyboardInset, onKeyboardInsetChange])

  const submit = async () => {
    const value = text.trim()
    if (!value || disabled || sending) return
    setText('')
    await onSend?.(value)
  }

  return (
    <div
      ref={rootRef}
      className={`chat-composer ${keyboardInset > 0 ? 'is-keyboard-open' : ''}`}
      style={
        keyboardInset > 0
          ? { paddingBottom: `calc(var(--space-3) + ${keyboardInset}px)` }
          : undefined
      }
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/*,application/pdf,audio/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) onAttach?.(file)
        }}
      />
      <button
        type="button"
        className="chat-composer-attach"
        aria-label="Attach file"
        disabled={disabled || sending}
        onClick={() => fileRef.current?.click()}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21.44 11.05l-8.49 8.49a5 5 0 0 1-7.07-7.07l8.49-8.49a3.5 3.5 0 0 1 4.95 4.95l-8.49 8.49a2 2 0 1 1-2.83-2.83l7.78-7.78" />
        </svg>
      </button>
      <textarea
        className="chat-composer-input"
        rows={1}
        placeholder="Message"
        value={text}
        disabled={disabled || sending}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            submit()
          }
        }}
      />
      <button
        type="button"
        className="chat-composer-send"
        aria-label="Send"
        disabled={disabled || sending || !text.trim()}
        onClick={submit}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 2 11 13" />
          <path d="M22 2 15 22 11 13 2 9z" />
        </svg>
      </button>
    </div>
  )
}
