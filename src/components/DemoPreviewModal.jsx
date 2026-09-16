import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { SheetPortal } from './PageTransition'
import './DemoPreviewModal.css'

const CLOSE_MS = 200

export const DEMO_PREVIEW_COPY = {
  title: 'Preview Feature',
  body: "You're viewing a demo version of this feature. This card is included to showcase the planned experience. Once this module is fully built, tapping this card will take you directly to its relevant destination and complete flow.",
  cta: 'Got it',
}

const DemoPreviewContext = createContext(null)

export function useDemoPreview() {
  const ctx = useContext(DemoPreviewContext)
  if (!ctx) throw new Error('useDemoPreview must be used within DemoPreviewProvider')
  return ctx
}

export function DemoPreviewProvider({ children }) {
  const [open, setOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const closingRef = useRef(false)
  const timerRef = useRef(null)

  const show = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    closingRef.current = false
    setClosing(false)
    setOpen(true)
  }, [])

  const hide = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    setClosing(true)
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null
      closingRef.current = false
      setOpen(false)
      setClosing(false)
    }, CLOSE_MS)
  }, [])

  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current)
  }, [])

  return (
    <DemoPreviewContext.Provider value={{ isPresented: open, show, hide }}>
      {children}
      {open ? <DemoPreviewModal closing={closing} onClose={hide} /> : null}
    </DemoPreviewContext.Provider>
  )
}

export default function DemoPreviewModal({ closing = false, onClose }) {
  const ctaRef = useRef(null)

  useEffect(() => {
    ctaRef.current?.focus()
  }, [])

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose?.()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <SheetPortal>
      <div
        className={`demo-preview-overlay ${closing ? 'is-closing' : ''}`}
        onClick={onClose}
        role="presentation"
      >
        <div
          className="demo-preview-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="demo-preview-title"
          aria-describedby="demo-preview-body"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="demo-preview-mark" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          <h3 id="demo-preview-title">{DEMO_PREVIEW_COPY.title}</h3>
          <p id="demo-preview-body">{DEMO_PREVIEW_COPY.body}</p>
          <button
            ref={ctaRef}
            type="button"
            className="demo-preview-cta"
            onClick={onClose}
          >
            {DEMO_PREVIEW_COPY.cta}
          </button>
        </div>
      </div>
    </SheetPortal>
  )
}
