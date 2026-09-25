import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import AppBottomSheet from './AppBottomSheet'
import { useAppSheet } from './PageTransition'
import EmptyState from './EmptyState'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import PullToRefreshIndicator from './PullToRefreshIndicator'
import { usePushBack } from '../features/pushNav'
import {
  queryPharmacies,
  clearPharmaciesQueryCache,
  PHARMACIES_PAGE_SIZE,
  PHARMACY_TYPE_FILTERS,
} from '../features/providers/pharmaciesRepository'
import {
  fetchPharmacyFilterFacets,
  peekPharmacyFilterFacets,
} from '../features/providers/pharmacyFacetCounts'
import { flowState } from '../lib/careFlow'
import { useAppLocation } from '../features/location'
import { ALL_NEPAL_LOCATION } from '../data/nepalGeography'
import ExpandRadiusEmpty from './ExpandRadiusEmpty'
import {
  DirectoryShell,
  PharmacyEntityCard,
  EntityCardSkeletonStack,
} from './directory'
import './SelectProvider.css'
import './ExpandRadiusEmpty.css'

const PAGE_SIZE = PHARMACIES_PAGE_SIZE || 24

function formatFacetCount(value) {
  if (value == null || Number.isNaN(Number(value))) return null
  return Number(value).toLocaleString('en-NP')
}

export default function PharmacyBrowsePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const goBack = usePushBack(-1)
  const {
    locality,
    origin,
    radiusKm,
    ready: locationReady,
    nextExpandRadiusKm,
    expandRadius,
  } = useAppLocation()
  const { isPresented, isClosing, show, hide } = useAppSheet()
  const scrollRef = useRef(null)
  const requestIdRef = useRef(0)
  const facetRequestRef = useRef(0)

  const initial = location.state || {}
  const [search, setSearch] = useState(initial.q || '')
  const [debouncedSearch, setDebouncedSearch] = useState(initial.q || '')
  const [browseNationwide, setBrowseNationwide] = useState(false)
  const [selectedType, setSelectedType] = useState('all')
  const [activeSheet, setActiveSheet] = useState(null)
  const [facetCounts, setFacetCounts] = useState({})
  const [pharmacies, setPharmacies] = useState([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)

  const selectedLocation = browseNationwide ? ALL_NEPAL_LOCATION : (locality || null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 280)
    return () => clearTimeout(t)
  }, [search])

  const loadPage = useCallback(async ({ page: nextPage, append = false } = {}) => {
    const reqId = ++requestIdRef.current
    if (!browseNationwide && (!locationReady || !origin)) {
      setLoading(false)
      setLoadingMore(false)
      if (!append) {
        setPharmacies([])
        setTotalCount(0)
        setHasMore(false)
      }
      return
    }

    if (append) setLoadingMore(true)
    else {
      setLoading(true)
      setError(null)
    }

    const result = await queryPharmacies({
      q: debouncedSearch,
      city: selectedLocation,
      type: selectedType,
      page: nextPage,
      pageSize: PAGE_SIZE,
      force: !append,
      origin: browseNationwide ? null : origin,
      radiusKm,
      sort: 'nearest',
      useRadius: !browseNationwide,
    })

    if (reqId !== requestIdRef.current) return

    if (result.error && !result.pharmacies?.length) {
      setError(result.error)
      if (!append) {
        setPharmacies([])
        setTotalCount(0)
        setHasMore(false)
      }
    } else {
      setError(null)
      setPharmacies((prev) => (append ? [...prev, ...result.pharmacies] : result.pharmacies))
      setTotalCount(result.total || 0)
      setHasMore(Boolean(result.hasMore))
      setPage(result.page)
    }

    setLoading(false)
    setLoadingMore(false)
  }, [debouncedSearch, selectedLocation, selectedType, origin, radiusKm, locationReady, browseNationwide])

  useEffect(() => {
    loadPage({ page: 0, append: false })
  }, [loadPage])

  useEffect(() => {
    if (!isPresented || !activeSheet) return undefined

    const facet = activeSheet === 'type' ? 'type' : null
    if (!facet) return undefined

    const context = {
      city: selectedLocation,
      q: debouncedSearch,
      type: selectedType,
    }
    const cached = peekPharmacyFilterFacets(facet, context)
    const reqId = ++facetRequestRef.current
    let cancelled = false

    if (cached) {
      setFacetCounts(cached)
      return undefined
    }

    setFacetCounts({})

    fetchPharmacyFilterFacets(facet, context, {
      onPartial: (partial) => {
        if (cancelled || reqId !== facetRequestRef.current) return
        setFacetCounts(partial || {})
      },
    }).then((counts) => {
      if (cancelled || reqId !== facetRequestRef.current) return
      setFacetCounts(counts || {})
    }).catch(() => {})

    return () => { cancelled = true }
  }, [isPresented, activeSheet, selectedLocation, selectedType, debouncedSearch])

  const onRefresh = useCallback(async () => {
    clearPharmaciesQueryCache()
    await loadPage({ page: 0, append: false })
  }, [loadPage])

  const ptr = usePullToRefresh(scrollRef, onRefresh)

  const openSheet = (id) => {
    setActiveSheet(id)
    show()
  }

  const closeSheet = () => {
    hide(() => setActiveSheet(null))
  }

  const openPharmacy = (pharmacy) => {
    const id = pharmacy.pharmacyUuid || pharmacy.pharmacyCode || pharmacy.id
    if (!id) return
    navigate(`/pharmacy/${id}`, {
      state: flowState(location, { origin: 'pharmacy-browse', returnTo: '/pharmacy/browse' }),
    })
  }

  const renderFacetOption = ({ key, label, active, onSelect }) => {
    const countValue = facetCounts[key] ?? facetCounts[label]
    const countReady = countValue != null && !Number.isNaN(Number(countValue))
    const countLabel = countReady ? formatFacetCount(countValue) : null
    return (
      <button
        type="button"
        key={key}
        className={`filter-option ${active ? 'active' : ''}`}
        onClick={onSelect}
      >
        <div className="filter-option-circle" />
        <span className="filter-option-label">{label}</span>
        <span
          className={`filter-option-count-slot${countReady ? ' is-loaded' : ' is-loading'}`}
          aria-busy={!countReady}
        >
          <span className="filter-option-count-skel" aria-hidden="true" />
          <span className="filter-option-count">
            {countLabel || '\u00a0'}
          </span>
        </span>
      </button>
    )
  }

  return (
    <div className="page-push-in" style={{ height: '100%', minHeight: 0 }}>
      <DirectoryShell
        title="Pharmacies"
        onBack={goBack}
        showBack
        searchScope="pharmacy"
        searchPlaceholder="Search pharmacies…"
        searchQuery={search}
        onSearchChange={setSearch}
        shown={pharmacies.length}
        total={totalCount}
        loading={loading}
        onSort={() => openSheet('type')}
        sortActive={selectedType !== 'all'}
        scrollRef={scrollRef}
      >
        <PullToRefreshIndicator pull={ptr.pull} refreshing={ptr.refreshing} />

        {loading ? <EntityCardSkeletonStack count={4} /> : null}

        {!loading && error ? (
          <div className="dir-shell__empty">
            <EmptyState image="/img/empty_state/pharmacy.png" alt="" title="Couldn’t load pharmacies" message={error} />
            <button type="button" className="dir-shell__load-more" onClick={() => loadPage({ page: 0 })}>
              Try again
            </button>
          </div>
        ) : null}

        {!loading && !error && !pharmacies.length ? (
          <div className="dir-shell__empty">
            {browseNationwide ? (
              <EmptyState
                image="/img/empty_state/pharmacy.png"
                alt=""
                title="No pharmacies found"
                message="Try another search term."
              />
            ) : (
              <ExpandRadiusEmpty
                radiusKm={radiusKm}
                nextRadiusKm={nextExpandRadiusKm}
                locality={locality}
                entityLabel="pharmacies"
                onExpand={() => expandRadius()}
                onChangeLocation={() => setBrowseNationwide(true)}
              />
            )}
          </div>
        ) : null}

        {!loading && !error && pharmacies.length ? (
          <ul className="dir-shell__list">
            {pharmacies.map((pharmacy) => (
              <li key={pharmacy.pharmacyUuid || pharmacy.id}>
                <PharmacyEntityCard pharmacy={pharmacy} onOpen={openPharmacy} />
              </li>
            ))}
            {hasMore ? (
              <li>
                <button
                  type="button"
                  className="dir-shell__load-more"
                  disabled={loadingMore}
                  onClick={() => loadPage({ page: page + 1, append: true })}
                >
                  {loadingMore ? 'Loading…' : 'Load more'}
                </button>
              </li>
            ) : null}
          </ul>
        ) : null}
      </DirectoryShell>

      {isPresented && activeSheet === 'type' ? (
        <AppBottomSheet open closing={isClosing} onClose={closeSheet} labelledBy="browse-type" sheetClassName="filter-sheet">
          <div className="ds-sheet-header">
            <h3 id="browse-type">Pharmacy type</h3>
            <button type="button" className="ds-sheet-close" onClick={closeSheet} aria-label="Close">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /></svg>
            </button>
          </div>
          <div className="filter-options">
            {PHARMACY_TYPE_FILTERS.map((opt) => renderFacetOption({
              key: opt.id,
              label: opt.label,
              active: selectedType === opt.id,
              onSelect: () => { setSelectedType(opt.id); closeSheet() },
            }))}
          </div>
        </AppBottomSheet>
      ) : null}
    </div>
  )
}
