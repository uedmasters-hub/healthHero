import { useEffect, useRef, useState } from 'react'
import { SheetPortal } from '../../components/PageTransition'
import { SystemIllustration } from '../../components/system'
import { checkConnection, useConnection } from './connection'
import './ConnectionBanner.css'

const BACK_ONLINE_MS = 2600
const SLOW_AUTO_HIDE_MS = 9000

/**
 * App-wide connection notice: persistent while offline, dismissible when the
 * connection is slow, and a short "Back online" confirmation on recovery.
 */
export default function ConnectionBanner() {
  const { online, slow, changedAt } = useConnection()
  const [backOnline, setBackOnline] = useState(false)
  const [dismissedAt, setDismissedAt] = useState(null)
  const slowDismissed = dismissedAt === changedAt
  const [checking, setChecking] = useState(false)
  const wasOffline = useRef(!online)

  useEffect(() => {
    if (!online) {
      wasOffline.current = true
      return undefined
    }
    if (!wasOffline.current) return undefined
    wasOffline.current = false
    setBackOnline(true)
    const id = window.setTimeout(() => setBackOnline(false), BACK_ONLINE_MS)
    return () => window.clearTimeout(id)
  }, [online])

  useEffect(() => {
    if (!slow) return undefined
    const id = window.setTimeout(() => setDismissedAt(changedAt), SLOW_AUTO_HIDE_MS)
    return () => window.clearTimeout(id)
  }, [slow, changedAt])

  let mode = null
  if (!online) mode = 'offline'
  else if (backOnline) mode = 'online'
  else if (slow && !slowDismissed) mode = 'slow'
  if (!mode) return null

  const copy = {
    offline: { title: 'You’re offline', body: 'We’ll reconnect automatically.', art: 'wifi-off', tone: 'muted' },
    slow: { title: 'Slow connection', body: 'Things may take a little longer.', art: 'signal', tone: 'warning' },
    online: { title: 'Back online', body: 'You’re connected again.', art: 'signal', tone: 'success' },
  }[mode]

  const onCheck = async () => {
    setChecking(true)
    await checkConnection()
    setChecking(false)
  }

  return (
    <SheetPortal to="screen">
      <div className={`conn-banner is-${mode}`} role="status" aria-live="polite">
        <SystemIllustration art={copy.art} tone={copy.tone} size="sm" />
        <span className="conn-banner__copy">
          <span className="conn-banner__title">{copy.title}</span>
          <span className="conn-banner__body">{copy.body}</span>
        </span>
        {mode === 'offline' ? (
          <button type="button" className="ds-btn ds-btn--secondary ds-btn--sm" onClick={onCheck} disabled={checking}>
            {checking ? 'Checking…' : 'Check'}
          </button>
        ) : null}
        {mode === 'slow' ? (
          <button type="button" className="ds-btn ds-btn--text ds-btn--sm" onClick={() => setDismissedAt(changedAt)}>
            Dismiss
          </button>
        ) : null}
      </div>
    </SheetPortal>
  )
}
