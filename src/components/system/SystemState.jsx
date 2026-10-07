import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useInRouterContext, useLocation, useNavigate } from 'react-router-dom'
import { Icon, cx } from '../ui'
import { checkConnection, useConnection } from '../../features/connection/connection'
import { rememberReturnTo } from '../../features/auth/returnTo'
import SystemIllustration from './SystemIllustration'
import { SYSTEM_STATES, resolveSystemState, stateFromError } from './systemStates'
import './SystemState.css'

const ACTION_COPY = {
  retry: { label: 'Try again', icon: <Icon.Refresh /> },
  refresh: { label: 'Refresh', icon: <Icon.Refresh /> },
  back: { label: 'Go back', icon: <Icon.Back /> },
  home: { label: 'Go to Home' },
  signIn: { label: 'Sign in' },
  checkConnection: { label: 'Check connection', icon: <Icon.Refresh /> },
  contact: { label: 'Contact support', icon: <Icon.Message /> },
}

function currentPath() {
  if (typeof window === 'undefined') return '/'
  return `${window.location.pathname}${window.location.search}${window.location.hash}`
}

/* Navigation that works with or without a router above (crash screens can
   render outside <BrowserRouter>). */
const STATIC_NAV = Object.freeze({
  home: () => window.location.replace('/'),
  back: () => (window.history.length > 1 ? window.history.back() : window.location.replace('/')),
  to: (path, options) => (options?.replace ? window.location.replace(path) : window.location.assign(path)),
})

function useRouterNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  return useMemo(() => ({
    home: () => navigate('/', { replace: true }),
    back: () => {
      if ((window.history.state?.idx ?? 0) > 0) navigate(-1)
      else navigate('/', { replace: true })
    },
    to: (path, options) => navigate(path, { ...options, state: { from: pathname, ...options?.state } }),
  }), [navigate, pathname])
}

function RoutedSystemState(props) {
  return <SystemStateView {...props} nav={useRouterNav()} />
}

function StaticSystemState(props) {
  return <SystemStateView {...props} nav={STATIC_NAV} />
}

/**
 * Deliberate UX for every failure, connection, empty and system state.
 *
 * @param {object} props
 * @param {string|number} [props.state]  Catalog key ('not-found', 'offline', …) or HTTP status (404, 503, …)
 * @param {unknown} [props.error]        Any error — mapped with stateFromError when `state` is omitted
 * @param {'page'|'inline'|'compact'} [props.variant]
 * @param {Array<string|{label:string,onClick:Function,variant?:string}>} [props.actions]
 * @param {Function} [props.onRetry]     Retry / Check connection target; defaults to a reload
 * @param {{to?:string, seconds?:number, label?:string, silent?:boolean}} [props.autoRedirect]
 * @param {boolean} [props.inert]        Documentation previews — actions render but do nothing
 */
export default function SystemState(props) {
  const inRouter = useInRouterContext()
  return inRouter ? <RoutedSystemState {...props} /> : <StaticSystemState {...props} />
}

function SystemStateView({
  state,
  error,
  variant = 'page',
  eyebrow,
  title,
  message,
  image,
  actions,
  onRetry,
  onBack,
  retryLabel,
  autoRedirect = null,
  details,
  children,
  className = '',
  role,
  inert = false,
  nav,
}) {
  const key = resolveSystemState(state ?? (error ? stateFromError(error) : 'generic'))
  const spec = SYSTEM_STATES[key]
  const connection = useConnection()
  const [checking, setChecking] = useState(false)
  const [stillOffline, setStillOffline] = useState(false)
  const [cooldown, setCooldown] = useState(spec.cooldownSeconds || 0)
  const [redirectIn, setRedirectIn] = useState(autoRedirect ? autoRedirect.seconds ?? 8 : 0)
  const retriedOnReconnect = useRef(false)
  const sawOffline = useRef(false)

  const retry = useCallback(() => {
    if (onRetry) onRetry()
    else window.location.reload()
  }, [onRetry])

  useEffect(() => {
    if (!cooldown) return undefined
    const id = window.setTimeout(() => setCooldown((value) => value - 1), 1000)
    return () => window.clearTimeout(id)
  }, [cooldown])

  const redirecting = Boolean(autoRedirect)
  const redirectTo = autoRedirect?.to || '/'
  useEffect(() => {
    if (!redirecting) return undefined
    if (redirectIn <= 0) {
      if (redirectTo === '/') nav.home()
      else nav.to(redirectTo, { replace: true })
      return undefined
    }
    const id = window.setTimeout(() => setRedirectIn((value) => value - 1), 1000)
    return () => window.clearTimeout(id)
  }, [redirecting, redirectIn, redirectTo, nav])

  // Offline screens recover on their own the moment the network returns.
  useEffect(() => {
    if (inert || key !== 'offline' || retriedOnReconnect.current) return
    if (!connection.online) {
      sawOffline.current = true
      return
    }
    if (!sawOffline.current) return
    retriedOnReconnect.current = true
    retry()
  }, [inert, key, connection.online, retry])

  const runCheck = async () => {
    setChecking(true)
    setStillOffline(false)
    const online = await checkConnection()
    setChecking(false)
    if (online) retry()
    else setStillOffline(true)
  }

  const handlers = {
    retry,
    refresh: () => window.location.reload(),
    back: onBack || nav.back,
    home: nav.home,
    signIn: () => {
      const from = currentPath()
      rememberReturnTo(from)
      nav.to('/login', { replace: true, state: { from } })
    },
    checkConnection: runCheck,
    contact: () => nav.to('/chat'),
  }

  const resolvedActions = (actions ?? spec.actions).map((action) => {
    if (typeof action !== 'string') return action
    const copy = ACTION_COPY[action] || { label: action }
    let label = action === 'retry' && retryLabel ? retryLabel : copy.label
    let disabled = false
    if (action === 'retry' && cooldown > 0) {
      label = `Try again in ${cooldown}s`
      disabled = true
    }
    if (action === 'checkConnection' && checking) {
      label = 'Checking…'
      disabled = true
    }
    return { key: action, label, icon: copy.icon, onClick: inert ? undefined : handlers[action], disabled }
  })

  const showEyebrow = eyebrow !== undefined ? eyebrow : spec.eyebrow
  const page = variant === 'page'

  return (
    <section
      className={cx('sys-state', `is-${variant}`, `is-${key}`, className)}
      role={role || (key === 'loading' ? 'status' : 'alert')}
      aria-live={key === 'loading' ? 'polite' : undefined}
    >
      <div className="sys-state__media">
        {image ? (
          <img className="sys-state__image" src={image} alt="" />
        ) : (
          <SystemIllustration art={spec.art} tone={spec.tone} size={variant === 'compact' ? 'sm' : page ? 'lg' : 'md'} />
        )}
      </div>
      <div className="sys-state__body">
        {showEyebrow ? <p className="ds-overline sys-state__eyebrow">{showEyebrow}</p> : null}
        <h2 className="sys-state__title">{title || spec.title}</h2>
        {(message ?? spec.message) ? <p className="sys-state__message">{message ?? spec.message}</p> : null}
        {children}
        {stillOffline ? <p className="sys-state__note" role="status">Still offline — we’ll keep checking.</p> : null}
        {autoRedirect && !autoRedirect.silent && redirectIn > 0 ? (
          <p className="sys-state__note" role="status">
            Taking you {autoRedirect.label || 'Home'} in {redirectIn}s
          </p>
        ) : null}
        {details ? <p className="sys-state__details">{details}</p> : null}
      </div>
      {resolvedActions.length ? (
        <div className="sys-state__actions">
          {resolvedActions.map((action, index) => (
            <button
              key={action.key || action.label}
              type="button"
              className={cx(
                'ds-btn',
                action.variant ? `ds-btn--${action.variant}` : index === 0 ? 'ds-btn--primary' : 'ds-btn--secondary',
                variant === 'compact' ? 'ds-btn--sm' : 'ds-btn--md',
                page && 'ds-btn--block',
              )}
              onClick={action.onClick}
              disabled={action.disabled}
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  )
}
