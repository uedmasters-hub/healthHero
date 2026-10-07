import { Component } from 'react'
import { SystemState } from './system'

const AUTO_HOME_MS = 2500
const LOOP_WINDOW_MS = 30000
const HOME_KEY = 'emedicalls.crashHomeAt'
const CHUNK_KEY = 'emedicalls.chunkReloadAt'
const CHUNK_ERROR = /dynamically imported module|Importing a module script failed|ChunkLoadError|Loading chunk [\w-]+ failed/i

function recentlyMarked(key) {
  try {
    return Date.now() - Number(sessionStorage.getItem(key) || 0) < LOOP_WINDOW_MS
  } catch {
    return true
  }
}

function mark(key) {
  try { sessionStorage.setItem(key, String(Date.now())) } catch { /* private mode */ }
}

function goHome() {
  mark(HOME_KEY)
  window.location.replace('/')
}

/**
 * Last line of defence against a dead screen. A stale deploy chunk reloads
 * once; any other render crash shows a short notice and returns Home. If Home
 * itself just crashed, it stops auto-redirecting and offers Reload instead.
 */
export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null, autoHome: false }
    this.timer = null
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error) {
    const message = String(error?.message || error)
    if (CHUNK_ERROR.test(message) && !recentlyMarked(CHUNK_KEY)) {
      mark(CHUNK_KEY)
      window.location.reload()
      return
    }
    const onHome = window.location.pathname === '/'
    const loop = recentlyMarked(HOME_KEY)
    if (onHome && loop) return
    this.setState({ autoHome: true })
    this.timer = window.setTimeout(goHome, AUTO_HOME_MS)
  }

  componentWillUnmount() {
    window.clearTimeout(this.timer)
  }

  render() {
    const { error, autoHome } = this.state
    if (!error) return this.props.children
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false
    return (
      <div className="phone-app-state">
        <SystemState
          state={offline ? 'offline' : 'generic'}
          message={autoHome
            ? 'Let’s get you back on track — taking you Home now.'
            : 'Reload to continue where you left off.'}
          actions={[
            { key: 'home', label: 'Go to Home', onClick: goHome },
            { key: 'reload', label: 'Reload', onClick: () => window.location.reload() },
          ]}
          details={import.meta.env.DEV ? String(error?.message || error) : null}
        />
      </div>
    )
  }
}
