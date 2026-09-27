import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import { projectMercator } from '../lib/radiusDial'
import './RadiusMapPreview.css'

const FADE_EASE = 'cubic-bezier(0.45, 0, 0.55, 1)'

function readOpacity(node) {
  const value = Number(window.getComputedStyle(node).opacity)
  return Number.isFinite(value) ? value : 0
}

function fadeMapOpacity(node, to, duration) {
  const from = readOpacity(node)
  node.getAnimations?.().forEach((anim) => {
    if (anim.id === 'radius-map-fade') anim.cancel()
  })
  node.style.opacity = String(from)
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
  const distance = Math.abs(to - from)
  if (reduce || distance < 0.01) {
    node.style.opacity = String(to)
    return null
  }
  return node.animate(
    [{ opacity: from }, { opacity: to }],
    {
      id: 'radius-map-fade',
      duration: Math.max(1, Math.round(duration * distance)),
      easing: FADE_EASE,
      fill: 'forwards',
    },
  )
}

const TILE = 256
/** Stay on one tile level until the continuous zoom has moved this far, then swap. */
const LEVEL_BAND = 0.65

function chooseLevel(zoom, current) {
  const z = Math.max(2, Math.min(18, zoom))
  if (current == null || Math.abs(z - current) >= LEVEL_BAND) {
    return Math.max(2, Math.min(18, Math.round(z)))
  }
  return current
}

function tileSpan(center, anchor, scale, size) {
  const safeScale = Math.max(0.35, scale)
  const worldStart = center - anchor / safeScale
  const worldEnd = center + (size - anchor) / safeScale
  let start = Math.floor(worldStart / TILE) - 1
  let end = Math.floor(worldEnd / TILE) + 1
  if (end - start > 10) {
    const mid = Math.round(((worldStart + worldEnd) / 2) / TILE)
    start = mid - 5
    end = mid + 5
  }
  return [start, end]
}

function buildTiles(lat, lng, level, anchor) {
  const coverScale = 2 ** -LEVEL_BAND
  const center = projectMercator(lat, lng, level)
  const [x0, x1] = tileSpan(center.x, anchor.x, coverScale, anchor.width)
  const [y0, y1] = tileSpan(center.y, anchor.y, coverScale, anchor.height)
  const maxIndex = 2 ** level
  const tiles = []
  for (let ty = y0; ty <= y1; ty += 1) {
    if (ty < 0 || ty >= maxIndex) continue
    for (let tx = x0; tx <= x1; tx += 1) {
      const wrappedX = ((tx % maxIndex) + maxIndex) % maxIndex
      tiles.push({
        key: `${level}-${tx}-${ty}`,
        src: `https://tile.openstreetmap.org/${level}/${wrappedX}/${ty}.png`,
        left: anchor.x + tx * TILE - center.x,
        top: anchor.y + ty * TILE - center.y,
      })
    }
  }
  return tiles
}

function anchorMoved(prev, next) {
  if (!prev || !next) return true
  return Math.abs(prev.x - next.x) >= 0.5
    || Math.abs(prev.y - next.y) >= 0.5
    || prev.width !== next.width
    || prev.height !== next.height
}

const RadiusMapPreview = forwardRef(function RadiusMapPreview({
  latitude,
  longitude,
  zoom,
  anchor,
  phase,
  cover = false,
  fadeMs = 380,
  onHidden,
}, ref) {
  const lat = Number(latitude)
  const lng = Number(longitude)
  const zoomRef = useRef(zoom)
  const anchorRef = useRef(anchor)
  const levelRef = useRef(chooseLevel(zoom, null))
  const layersRef = useRef(new Map())
  const [tileAnchor, setTileAnchor] = useState(anchor)
  const [stack, setStack] = useState(() => [chooseLevel(zoom, null)])
  const rootRef = useRef(null)
  const fadeGenRef = useRef(0)
  const onHiddenRef = useRef(onHidden)

  const applyZoom = () => {
    const nextZoom = zoomRef.current
    const nextAnchor = anchorRef.current
    if (!nextAnchor || !Number.isFinite(nextZoom)) return
    layersRef.current.forEach((node, layerLevel) => {
      const scale = 2 ** (nextZoom - Number(layerLevel))
      node.style.transform = `scale(${scale})`
      node.style.transformOrigin = `${nextAnchor.x}px ${nextAnchor.y}px`
    })
  }

  useImperativeHandle(ref, () => ({
    sync(nextZoom, nextAnchor) {
      if (!Number.isFinite(nextZoom) || !nextAnchor) return
      zoomRef.current = nextZoom
      anchorRef.current = nextAnchor
      applyZoom()
      const nextLevel = chooseLevel(nextZoom, levelRef.current)
      if (nextLevel !== levelRef.current) {
        levelRef.current = nextLevel
        setStack((current) => {
          const rest = current.filter((item) => item !== nextLevel)
          return [...rest, nextLevel].slice(-2)
        })
      }
      setTileAnchor((current) => (anchorMoved(current, nextAnchor) ? nextAnchor : current))
    },
  }), [])

  useLayoutEffect(() => {
    applyZoom()
  })

  useLayoutEffect(() => {
    onHiddenRef.current = onHidden
  }, [onHidden])

  useLayoutEffect(() => {
    const node = rootRef.current
    if (!node || phase === 'idle') return undefined
    const to = phase === 'closing' ? 0 : 1
    const gen = fadeGenRef.current + 1
    fadeGenRef.current = gen
    const anim = fadeMapOpacity(node, to, fadeMs)
    if (!anim) {
      if (to === 0) onHiddenRef.current?.()
      return undefined
    }
    anim.onfinish = () => {
      if (fadeGenRef.current !== gen) return
      node.style.opacity = String(to)
      anim.cancel()
      if (to === 0) onHiddenRef.current?.()
    }
    return () => {
      fadeGenRef.current += 1
    }
  }, [phase, fadeMs])

  const retire = (readyLevel) => {
    if (readyLevel !== levelRef.current) return
    const delay = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ? 0 : 180
    window.setTimeout(() => {
      if (levelRef.current !== readyLevel) return
      setStack((current) => (
        current.length === 1 && current[0] === readyLevel ? current : [readyLevel]
      ))
    }, delay)
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !tileAnchor || phase === 'idle') return null

  const activeLevel = stack[stack.length - 1]
  return (
    <div
      ref={rootRef}
      className={`radius-map${cover ? ' is-cover' : ''}`}
      aria-hidden="true"
    >
      <div className="radius-map__canvas">
        {stack.map((level) => (
          <MapTiles
            key={level}
            lat={lat}
            lng={lng}
            level={level}
            anchor={tileAnchor}
            incoming={stack.length > 1 && level === activeLevel}
            register={layersRef}
            onLive={retire}
          />
        ))}
      </div>
      <div className="radius-map__veil" />
      <p className="radius-map__credit">
        © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>
      </p>
    </div>
  )
})

function MapTiles({ lat, lng, level, anchor, incoming, register, onLive }) {
  const tiles = buildTiles(lat, lng, level, anchor)
  const loadedRef = useRef(0)
  const [live, setLive] = useState(!incoming || tiles.length === 0)

  useEffect(() => {
    loadedRef.current = 0
  }, [level, anchor])

  const ref = (node) => {
    if (node) register.current.set(level, node)
    else register.current.delete(level)
  }

  const mark = () => {
    loadedRef.current += 1
    if (loadedRef.current >= tiles.length) {
      setLive(true)
      onLive(level)
    }
  }

  return (
    <div ref={ref} className={`radius-map__layer${incoming ? ' is-incoming' : ''}${live ? ' is-live' : ''}`}>
      {tiles.map((tile) => (
        <img
          key={tile.key}
          className="radius-map__tile"
          alt=""
          draggable="false"
          src={tile.src}
          style={{ left: tile.left, top: tile.top, width: TILE, height: TILE }}
          onLoad={mark}
          onError={mark}
        />
      ))}
    </div>
  )
}

export default RadiusMapPreview
