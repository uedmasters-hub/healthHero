const scrollers = new Map()
const locks = new Map()

function preventDefault(event) {
  if (event.cancelable) event.preventDefault()
}

function applyHold(entry) {
  const { el, top, left } = entry
  if (el.scrollTop !== top) el.scrollTop = top
  if (el.scrollLeft !== left) el.scrollLeft = left
}

function freeze(entry) {
  const { el } = entry
  el.classList.add('is-scroll-locked')
  el.style.setProperty('overflow', 'hidden', 'important')
  el.style.touchAction = 'none'
  el.style.overscrollBehavior = 'none'
  applyHold(entry)
  requestAnimationFrame(() => applyHold(entry))
  if (!entry.onScroll) {
    entry.onScroll = () => applyHold(entry)
    entry.onWheel = preventDefault
    entry.onTouchMove = preventDefault
    el.addEventListener('scroll', entry.onScroll)
    el.addEventListener('wheel', entry.onWheel, { passive: false })
    el.addEventListener('touchmove', entry.onTouchMove, { passive: false })
  }
}

function unfreeze(entry) {
  const { el, top, left, onScroll, onWheel, onTouchMove } = entry
  if (onScroll) el.removeEventListener('scroll', onScroll)
  if (onWheel) el.removeEventListener('wheel', onWheel)
  if (onTouchMove) el.removeEventListener('touchmove', onTouchMove)
  el.classList.remove('is-scroll-locked')
  el.style.removeProperty('overflow')
  el.style.touchAction = ''
  el.style.overscrollBehavior = ''
  el.scrollTop = top
  el.scrollLeft = left
}

export function findScrollParent(node) {
  let current = node instanceof Element ? node : null
  while (current && current !== document.body) {
    const style = window.getComputedStyle(current)
    const overflowY = style.overflowY
    if ((overflowY === 'auto' || overflowY === 'scroll') && current.scrollHeight > current.clientHeight + 1) {
      return current
    }
    current = current.parentElement
  }
  return document.querySelector('.home-stage')
}

export function registerScroller(name, el) {
  if (el) scrollers.set(name, el)
  else scrollers.delete(name)
  const entry = locks.get(name)
  if (entry && el) {
    entry.el = el
    freeze(entry)
  }
}

export function lock(name) {
  const existing = locks.get(name)
  if (existing) {
    existing.count += 1
    freeze(existing)
    return
  }
  const el = scrollers.get(name)
  if (!el) return
  const entry = {
    el,
    top: el.scrollTop,
    left: el.scrollLeft,
    count: 1,
  }
  locks.set(name, entry)
  freeze(entry)
}

export function freezeNow(name) {
  const existing = locks.get(name)
  if (existing) {
    freeze(existing)
    return
  }
  const el = scrollers.get(name)
  if (!el) return
  const entry = {
    el,
    top: el.scrollTop,
    left: el.scrollLeft,
    count: 0,
  }
  locks.set(name, entry)
  freeze(entry)
}

export function unlock(name) {
  const entry = locks.get(name)
  if (!entry) return
  entry.count = Math.max(0, entry.count - 1)
  if (entry.count > 0) return
  locks.delete(name)
  unfreeze(entry)
}

/** Drop a lock immediately (e.g. page remount after freezeNow left count 0). */
export function clearLock(name) {
  const entry = locks.get(name)
  if (!entry) return
  locks.delete(name)
  unfreeze(entry)
}

export function isLocked(name) {
  return locks.has(name)
}
