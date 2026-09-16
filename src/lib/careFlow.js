export function flowState(source, extra = {}) {
  const prev = source?.state ? source.state : source || {}
  const next = { ...prev }
  Object.entries(extra).forEach(([key, value]) => {
    if (value !== undefined) next[key] = value
  })
  return next
}

export function restoreOriginOverlays(state, { openSpecialisations, openInsights } = {}) {
  if (state?.restore?.specialisations) openSpecialisations?.()
  if (state?.restore?.insights) openInsights?.()
}

export function isBookingIndex(path) {
  return path === '/booking' || path === '/booking/'
}

export function getBookingEntryPath(state) {
  const entry = state?.entryReturnTo
  if (entry && !isBookingIndex(entry) && !String(entry).startsWith('/booking/')) return entry
  const ret = state?.returnTo
  if (ret && !isBookingIndex(ret) && !String(ret).startsWith('/booking/') && !String(ret).startsWith('/doctor/')) {
    return ret
  }
  return '/'
}

export function withBookingEntry(source, extra = {}) {
  const prev = source?.state ? source.state : source || {}
  const entryReturnTo = extra.entryReturnTo || prev.entryReturnTo || getBookingEntryPath(prev)
  return flowState(prev, { ...extra, entryReturnTo })
}

export function isHomePath(path) {
  return path === '/' || path === '/search'
}

export function goBackToOrigin(navigate, location, overlays) {
  const state = location?.state || {}
  const returnTo = state.returnTo
  const canReturn = returnTo && returnTo !== location.pathname

  if (state.restore?.topDoctors) {
    navigate(canReturn && !String(returnTo).startsWith('/doctor/') ? returnTo : '/')
    return
  }

  if (state.restore?.specialisations) {
    overlays?.openSpecialisations?.()
    navigate(canReturn && !String(returnTo).startsWith('/doctor/') ? returnTo : '/')
    return
  }

  if (state.restore?.insights && (!canReturn || isHomePath(returnTo))) {
    overlays?.openInsights?.()
    navigate('/')
    return
  }

  if (canReturn) {
    if (isHomePath(returnTo)) restoreOriginOverlays(state, overlays)
    navigate(returnTo, { state: flowState(state) })
    return
  }

  navigate('/')
}
