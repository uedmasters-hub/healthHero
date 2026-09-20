import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SearchField } from './SearchBar'
import TabPageHeader from './TabPageHeader'
import AppFooter from './AppFooter'
import AppBottomSheet from './AppBottomSheet'
import { useAppSheet } from './PageTransition'
import { useDemoPreview } from './DemoPreviewModal'
import { clearLock } from '../lib/scrollLock'
import {
  PHARMACY_CATEGORIES,
  PHARMACY_ORDERS,
  PHARMACY_PROMO_SLIDES,
  PHARMACY_RECENT,
  PHARMACY_SEARCH_PLACEHOLDER,
  PHARMACY_SERVICES,
  PHARMACY_TIP,
} from '../data/pharmacy'
import {
  CategoryChips,
  OrderList,
  PharmacySupportCard,
  PharmacyTipCard,
  PromoCarousel,
  RecentStrip,
  ServiceTileGrid,
} from './pharmacy'
import './TabPageHeader.css'
import './pharmacy/PharmacyPage.css'
import './Services.css'

const PREVIEW_ACTIONS = new Set(['refill', 'upload-rx', 'essentials', 'order-medicine', 'category', 'recent', 'orders', 'tip'])

const FILTER_OPTIONS = [
  { id: 'all', label: 'All medicines' },
  { id: 'rx', label: 'Prescription only' },
  { id: 'otc', label: 'Over the counter' },
  { id: 'refill', label: 'Refillable' },
]

export default function PharmacyPage() {
  const navigate = useNavigate()
  const { show: showDemoPreview } = useDemoPreview()
  const [filterId, setFilterId] = useState('all')
  const { isPresented, isClosing, show, hide } = useAppSheet()

  // Clear any stale pharmacy scroll freeze left by freezeNow() from an earlier
  // search navigation / HMR cycle (Treat keeps its scroller unlocked).
  useEffect(() => {
    clearLock('pharmacy')
  }, [])

  const openFullSearch = useCallback(() => {
    navigate('/search', {
      state: {
        searchOrigin: 'pharmacy',
        searchPlaceholder: PHARMACY_SEARCH_PLACEHOLDER,
        returnTo: '/pharmacy',
      },
    })
  }, [navigate])

  const openFilter = useCallback(() => {
    show()
  }, [show])

  const closeFilter = useCallback(() => {
    hide()
  }, [hide])

  const openLiveChat = useCallback(() => {
    navigate('/chat', {
      state: { origin: 'pharmacy', returnTo: '/pharmacy' },
    })
  }, [navigate])

  const runPharmacyAction = useCallback((action) => {
    if (action === 'consult') {
      openLiveChat()
      return
    }
    if (action === 'orders-view-all' || action === 'orders') {
      showDemoPreview?.()
      return
    }
    if (PREVIEW_ACTIONS.has(action)) {
      showDemoPreview?.()
    }
  }, [openLiveChat, showDemoPreview])

  useEffect(() => {
    const onOrderMedicine = () => {
      runPharmacyAction('order-medicine')
    }
    window.addEventListener('fab:order-medicine', onOrderMedicine)
    return () => window.removeEventListener('fab:order-medicine', onOrderMedicine)
  }, [runPharmacyAction])

  return (
    <div className="pharmacy-page">
      <TabPageHeader
        title="Pharmacy"
        subtitle="Order medicines and manage your prescriptions"
        actions={(
          <>
            <button
              type="button"
              className="ds-icon-btn is-subtle is-md"
              aria-label="Search medicines"
              onClick={openFullSearch}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>
            <button
              type="button"
              className="ds-icon-btn is-subtle is-md"
              aria-label="Filter medicines"
              onClick={openFilter}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <line x1="4" y1="21" x2="4" y2="14" />
                <line x1="4" y1="10" x2="4" y2="3" />
                <line x1="12" y1="21" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12" y2="3" />
                <line x1="20" y1="21" x2="20" y2="16" />
                <line x1="20" y1="12" x2="20" y2="3" />
                <line x1="1" y1="14" x2="7" y2="14" />
                <line x1="9" y1="8" x2="15" y2="8" />
                <line x1="17" y1="16" x2="23" y2="16" />
              </svg>
            </button>
          </>
        )}
      />

      <div className="pharmacy-search">
        <SearchField
          placeholder={PHARMACY_SEARCH_PLACEHOLDER}
          value=""
          showMic={false}
          showClear={false}
          readOnly
          onFocus={openFullSearch}
          onClick={openFullSearch}
        />
      </div>

      <div className="pharmacy-scroll">
        <div className="pharmacy-page__feed">
          <PromoCarousel
            slides={PHARMACY_PROMO_SLIDES}
            onAction={(slide) => runPharmacyAction(slide.action)}
          />

          <ServiceTileGrid
            items={PHARMACY_SERVICES}
            onSelect={(item) => runPharmacyAction(item.action)}
          />

          <OrderList
            orders={PHARMACY_ORDERS}
            onViewAll={() => runPharmacyAction('orders-view-all')}
            onSelect={() => runPharmacyAction('orders')}
          />

          <CategoryChips
            items={PHARMACY_CATEGORIES}
            onSelect={() => runPharmacyAction('category')}
          />

          <RecentStrip
            items={PHARMACY_RECENT}
            onSelect={() => runPharmacyAction('recent')}
          />

          <PharmacyTipCard
            tip={PHARMACY_TIP}
            onClick={() => runPharmacyAction('tip')}
          />

          <PharmacySupportCard onClick={openLiveChat} />

          <AppFooter page="pharmacy" />
        </div>
      </div>

      <AppBottomSheet
        open={isPresented}
        closing={isClosing}
        onClose={closeFilter}
        labelledBy="pharmacy-filter-title"
      >
        <div className="ds-sheet-header">
          <h3 id="pharmacy-filter-title">Filter medicines</h3>
          <button type="button" className="ds-sheet-close" onClick={closeFilter} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="pharmacy-filter-list">
          {FILTER_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`pharmacy-filter-option${filterId === option.id ? ' is-active' : ''}`}
              onClick={() => {
                setFilterId(option.id)
                closeFilter()
              }}
            >
              <span>{option.label}</span>
              {filterId === option.id ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.2" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : null}
            </button>
          ))}
        </div>
      </AppBottomSheet>
    </div>
  )
}
