import SystemState from './SystemState'

/**
 * Routed screens whose context is gone (finished visit, stale deep link,
 * refreshed mid-flow). Explains briefly, then returns Home on its own.
 */
export function UnavailablePage({ title, message, to = '/', seconds = 5, label }) {
  return (
    <div className="sys-route-page">
      <SystemState
        state="missing"
        title={title}
        message={message}
        autoRedirect={{ to, seconds, label }}
      />
    </div>
  )
}

/**
 * Shown while a screen hands off to the step it needs (e.g. back to slot
 * selection). Falls back to Home silently if that hand-off never happens.
 */
export function RedirectingPage({ title = 'Taking you to the right step', fallbackTo = '/', seconds = 6 }) {
  return (
    <div className="sys-route-page">
      <SystemState
        state="loading"
        title={title}
        autoRedirect={{ to: fallbackTo, seconds, silent: true }}
      />
    </div>
  )
}
