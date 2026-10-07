import { useCallback, useEffect, useRef, useState } from 'react'
import CartButton from './pharmacy/CartButton'
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
import { pushRecentSearch } from '../features/search'
import { ALL_NEPAL_LOCATION } from '../data/nepalGeography'
import ExpandRadiusEmpty from './ExpandRadiusEmpty'
import {
  DirectoryShell,
  PharmacyEntityCard,
  EntityCardSkeletonStack,
} from './directory'
import PharmacySearchSuggestions from './pharmacy/PharmacySearchSuggestions'
import './SelectProvider.css'

const PAGE_SIZE = PHARMACIES_PAGE_SIZE || 24
const MAX_FETCHES_PER_LOAD = 4

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
  const [appliedSearch, setAppliedSearch] = useState(initial.q || '')
  const [searchActive, setSearchActive] = useState(false)
  const [browseNationwide, setBrowseNationwide] = useState(false)
  const [selectedType, setSelectedType] = useState('all')
  const [activeSheet, setActiveSheet] = useState(null)
  const [facetCounts, setFacetCounts] = useState({})
  const [pharmacies, setPharmacies] = useState([])
  const cursorRef = useRef({ page: 0, buffer: [], seen: new Set(), serverHasMore: true })
  const [hasMore, setHasMore] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)

  const selectedLocation = browseNationwide ? ALL_NEPAL_LOCATION : (locality || null)

  const loadPage = useCallback(async ({ append = false } = {}) => {
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
      cursorRef.current = { page: 0, buffer: [], seen: new Set(), serverHasMore: true }
    }

    // Unnamed rows are dropped client-side, so pull further server pages until a full 24 is ready.
    const cursor = cursorRef.current
    const batch = cursor.buffer.splice(0)
    let total = null
    let failure = null
    let fetches = 0
    while (batch.length < PAGE_SIZE && cursor.serverHasMore && fetches < MAX_FETCHES_PER_LOAD) {
      fetches += 1
      const result = await queryPharmacies({
        q: appliedSearch,
        city: selectedLocation,
        type: selectedType,
        page: cursor.page,
        pageSize: PAGE_SIZE,
        force: !append && fetches === 1,
        origin: browseNationwide ? null : origin,
        radiusKm,
        sort: 'nearest',
        useRadius: !browseNationwide,
      })
      if (reqId !== requestIdRef.current) return
      if (result.error && !result.pharmacies?.length) {
        failure = result.error
        break
      }
      total = result.total || 0
      cursor.page = result.page + 1
      cursor.serverHasMore = Boolean(result.hasMore)
      result.pharmacies.forEach((pharmacy) => {
        const id = pharmacy.pharmacyUuid || pharmacy.id
        if (cursor.seen.has(id)) return
        cursor.seen.add(id)
        batch.push(pharmacy)
      })
    }

    if (failure && !batch.length) {
      setError(failure)
      if (!append) {
        setPharmacies([])
        setTotalCount(0)
        setHasMore(false)
      }
    } else {
      setError(null)
      cursor.buffer = batch.slice(PAGE_SIZE)
      const shown = batch.slice(0, PAGE_SIZE)
      setPharmacies((prev) => (append ? [...prev, ...shown] : shown))
      if (total != null) setTotalCount(total)
      setHasMore(cursor.buffer.length > 0 || cursor.serverHasMore)
    }

    setLoading(false)
    setLoadingMore(false)
  }, [appliedSearch, selectedLocation, selectedType, origin, radiusKm, locationReady, browseNationwide])

  useEffect(() => {
    loadPage()
  }, [loadPage])

  useEffect(() => {
    if (!isPresented || !activeSheet) return undefined

    const facet = activeSheet === 'type' ? 'type' : null
    if (!facet) return undefined

    const context = {
      city: selectedLocation,
      q: appliedSearch,
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
  }, [isPresented, activeSheet, selectedLocation, selectedType, appliedSearch])

  const onRefresh = useCallback(async () => {
    clearPharmaciesQueryCache()
    await loadPage()
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
    const id = pharmacy.pharmacyUuid || pharmacy.id
    if (!id) return
    navigate(`/pharmacy/store/${id}`, {
      state: flowState(location, {
        origin: 'pharmacy-browse',
        returnTo: '/pharmacy/browse',
        storeName: pharmacy.name || pharmacy.displayName || pharmacy.label,
      }),
    })
  }

  const submitSearch = (value) => {
    const next = String(value ?? search).trim()
    if (next) pushRecentSearch({ label: next, type: 'query', scope: 'pharmacy', meta: 'Search' })
    setSearch(next)
    setAppliedSearch(next)
    setSearchActive(false)
    scrollRef.current?.scrollTo({ top: 0 })
  }

  const cancelSearch = () => {
    setSearchActive(false)
    setSearch('')
    setAppliedSearch('')
  }

  const selectSuggestion = (item) => {
    if (item.type === 'query') {
      submitSearch(item.label)
      return
    }
    pushRecentSearch({ id: item.id, label: item.label, type: 'pharmacy', scope: 'pharmacy', meta: item.meta })
    setSearchActive(false)
    setSearch(appliedSearch)
    openPharmacy(item)
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
        <span className="filter-option-circle ds-radio" aria-hidden="true" />
        <span className="filter-option-label">{label}</span>
        <span
          className={`filter-option-count-slot${countReady ? ' is-loaded' : ' is-loading'}`}
          aria-busy={!countReady}
        >
          <span className="filter-option-count-skel shimmer" aria-hidden="true" />
          <span className="filter-option-count">
            {countLabel || '\u00a0'}
          </span>
        </span>
      </button>
    )
  }

  return (
    <div style={{ height: '100%', minHeight: 0 }}>
      <DirectoryShell
        title="Pharmacies"
        onBack={goBack}
        showBack
        searchScope="pharmacy"
        headerTrailing={<CartButton />}
        searchPlaceholder="Search pharmacies…"
        searchQuery={search}
        onSearchChange={setSearch}
        searchMode="expandable"
        searchActive={searchActive}
        onSearchOpen={() => setSearchActive(true)}
        onSearchCancel={cancelSearch}
        onSearchSubmit={submitSearch}
        searchOverlay={(
          <PharmacySearchSuggestions
            query={search}
            active={searchActive}
            nearby={appliedSearch ? [] : pharmacies}
            searchParams={{
              city: selectedLocation,
              type: selectedType,
              origin: browseNationwide ? null : origin,
              radiusKm,
              sort: 'nearest',
              useRadius: !browseNationwide,
            }}
            onSelect={selectSuggestion}
            onSubmit={submitSearch}
          />
        )}
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
            <EmptyState
              image="/img/empty_state/pharmacy.png"
              alt=""
              title="Couldn’t load pharmacies"
              message={error}
              action={(
                <button type="button" className="ds-btn ds-btn--secondary ds-btn--md" onClick={() => loadPage()}>
                  Try again
                </button>
              )}
            />
          </div>
        ) : null}

        {!loading && !error && !pharmacies.length ? (
          <div className="dir-shell__empty">
            {appliedSearch ? (
              <EmptyState
                image="/img/empty_state/pharmacy.png"
                alt=""
                title={`No pharmacies match “${appliedSearch}”`}
                message="Check the spelling or try a nearby area name."
                action={(
                  <button type="button" className="ds-btn ds-btn--secondary ds-btn--md" onClick={cancelSearch}>
                    Clear search
                  </button>
                )}
              />
            ) : browseNationwide ? (
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
                <PharmacyEntityCard pharmacy={pharmacy} variant="nearby" onOpen={openPharmacy} />
              </li>
            ))}
            {hasMore ? (
              <li>
                <button
                  type="button"
                  className="dir-shell__load-more ds-btn ds-btn--secondary ds-btn--md ds-btn--block"
                  disabled={loadingMore}
                  onClick={() => loadPage({ append: true })}
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
