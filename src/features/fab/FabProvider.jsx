import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTransition } from '../../components/PageTransition'
import { flowState } from '../../lib/careFlow'
import { FAB_MODE } from './config'
import { resolveFabConfig } from './resolve'
import GlobalFab from '../../components/QuickCareFab'

const FabContext = createContext(null)

/**
 * Optional screen-level override. Pass a config object or `null`.
 * Static route mappings live in config.js — use this only for dynamic cases.
 */
export function useFabConfig(config) {
  const ctx = useContext(FabContext)
  const mode = config?.mode
  const actionId = config?.action?.id
  const actionsKey = config?.actions?.map((a) => a.id).join(',') || ''

  useEffect(() => {
    if (!ctx?.setOverride) return undefined
    ctx.setOverride(config ?? null)
    return () => ctx.setOverride(null)
  }, [ctx, mode, actionId, actionsKey, config])
}

export function useFab() {
  const ctx = useContext(FabContext)
  if (!ctx) throw new Error('useFab must be used within FabProvider')
  return ctx
}

async function runShare(share, url) {
  const payload = {
    title: share?.title || 'eMedicalls',
    text: share?.text || '',
    url: url || window.location.href,
  }
  try {
    if (navigator.share) {
      await navigator.share(payload)
      return
    }
  } catch {
    /* cancelled */
  }
  try {
    await navigator.clipboard?.writeText(payload.url)
  } catch {
    /* ignore */
  }
}

function openDirections() {
  const q = encodeURIComponent('eMedicalls clinic near me')
  window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, '_blank', 'noopener,noreferrer')
}

/**
 * Global FAB host — resolves mode from route (+ override) and renders one FAB.
 */
export function FabProvider({ children }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { openSpecialisations } = useTransition()
  const [override, setOverride] = useState(null)

  const config = useMemo(
    () => resolveFabConfig(location.pathname, override),
    [location.pathname, override],
  )

  const runAction = useCallback((actionOrId) => {
    const action = typeof actionOrId === 'string'
      ? findHubAction(config, actionOrId)
      : actionOrId
    if (!action) return

    if (action.id === 'book') {
      navigate('/booking', {
        state: flowState(location, { origin: 'fab', returnTo: location.pathname || '/' }),
      })
      return
    }
    if (action.id === 'emergency') {
      window.location.href = 'tel:112'
      return
    }
    if (action.id === 'chat') {
      navigate('/chat', {
        state: flowState(location, { origin: 'fab', returnTo: location.pathname || '/' }),
      })
      return
    }
    if (action.id === 'find-treatment') {
      openSpecialisations?.()
      return
    }
    if (action.kind === 'share') {
      runShare(action.share, window.location.href)
      return
    }
    if (action.kind === 'directions') {
      openDirections()
      return
    }
    if (action.kind === 'event' && action.event) {
      window.dispatchEvent(new CustomEvent(action.event, { detail: { action } }))
      return
    }
    if (action.to) {
      navigate(action.to, {
        state: flowState(location, { origin: 'fab', returnTo: location.pathname || '/' }),
      })
    }
  }, [config, navigate, openSpecialisations, location])

  const value = useMemo(() => ({
    mode: config.mode,
    motion: config.motion,
    actions: config.actions,
    action: config.action,
    setOverride,
    runAction,
    isHub: config.mode === FAB_MODE.HUB,
    isUtility: config.mode === FAB_MODE.UTILITY,
    isHidden: config.mode === FAB_MODE.HIDDEN,
  }), [config, runAction])

  return (
    <FabContext.Provider value={value}>
      {children}
      <GlobalFab />
    </FabContext.Provider>
  )
}

function findHubAction(config, id) {
  if (config.mode === FAB_MODE.HUB) {
    return config.actions?.find((a) => a.id === id) || { id }
  }
  if (config.mode === FAB_MODE.UTILITY && config.action?.id === id) {
    return config.action
  }
  return { id }
}

export default FabProvider
