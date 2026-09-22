import { useCallback, useEffect, useRef, useState } from 'react'
import useStaggerReveal from './useStaggerReveal'
import RevealItem from './RevealItem'
import { getCenters, hydrateCenters } from '../features/providers/centersRepository'
import { formatPlaceParts } from '../features/geography/formatPlace'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import PullToRefreshIndicator from './PullToRefreshIndicator'
import { refreshCentersData } from '../features/sync/pageRefresh'
import './PlaceholderPage.css'

export default function CentersPage() {
  const { setItemRef, isRevealed, isCached } = useStaggerReveal({ delay: 120 })
  const [centers, setCenters] = useState(() => getCenters())
  const scrollRef = useRef(null)
  const onRefresh = useCallback(async () => {
    const next = await refreshCentersData()
    if (Array.isArray(next)) setCenters(next)
    else setCenters(getCenters())
  }, [])
  const ptr = usePullToRefresh(scrollRef, onRefresh)

  useEffect(() => {
    let cancelled = false
    hydrateCenters().then((next) => {
      if (!cancelled) setCenters(next)
    })
    return () => { cancelled = true }
  }, [])

  return (
    <div className="placeholder-page">
      <div className="placeholder-header">
        <h1 className="placeholder-title">Healthcare Centers</h1>
        <p className="placeholder-subtitle">Discover nearby hospitals and clinics</p>
      </div>
      <div className="placeholder-content" style={{ display: 'flex', flexDirection: 'column', gap: 12 }} ref={scrollRef}>
        <PullToRefreshIndicator pull={ptr.pull} refreshing={ptr.refreshing} />
        {centers.map((center, index) => (
          <RevealItem
            key={center.id || center.providerUuid || index}
            className="placeholder-card"
            revealed={isRevealed(index)}
            cached={isCached}
            ref={setItemRef(index)}
          >
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <img
                src={center.image}
                alt=""
                style={{ width: 56, height: 56, borderRadius: 12, objectFit: 'cover' }}
              />
              <div style={{ minWidth: 0 }}>
                <strong style={{ display: 'block' }}>{center.name}</strong>
                <span style={{ fontSize: 13, opacity: 0.7 }}>
                  {[center.type, formatPlaceParts(center.city, center.district) || formatPlaceParts(center.address)].filter(Boolean).join(' · ')}
                </span>
                {center.rating != null ? (
                  <span style={{ display: 'block', fontSize: 13 }}>★ {center.rating}</span>
                ) : null}
              </div>
            </div>
          </RevealItem>
        ))}
      </div>
    </div>
  )
}
