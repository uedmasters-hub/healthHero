import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { usePushBack } from '../../features/pushNav'
import { fetchPharmacyById } from '../../features/providers/pharmaciesRepository'
import { getCart, rememberStore } from '../../features/pharmacy/shopApi'
import { flowState } from '../../lib/careFlow'
import useSearchScrollCompact from '../../hooks/useSearchScrollCompact'
import { PharmacyHeroCard, ProfileHeader } from '../profile/placeProfile'
import CollapsingSearchDock from '../home/CollapsingSearchDock'
import { HeaderSearchButton } from '../home/SharedSearchIcon'
import SearchBar from '../SearchBar'
import { PHARMACY_SEARCH_PLACEHOLDER } from '../../data/pharmacy'
import MarketplaceFeed from './MarketplaceFeed'
import { PharmacyIcon } from './PharmacyIcons'
import '../DoctorCard.css'
import '../DoctorProfile.css'
import '../../features/notifications/components/NotificationButton.css'
import './PharmacyShop.css'
import './PharmacyPage.css'

export default function PharmacyStorePage() {
  const { storeId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const goBack = usePushBack('/pharmacy')
  const scrollRef = useRef(null)
  const searchRef = useRef(null)
  const [name, setName] = useState(location.state?.storeName || 'Store')
  const [pharmacy, setPharmacy] = useState(null)
  const [cardReady, setCardReady] = useState(false)
  const [query, setQuery] = useState('')
  const [cartCount, setCartCount] = useState(0)
  const {
    progress,
    fieldStyle,
    expandedHeight,
    fieldInert,
    iconInteractive,
  } = useSearchScrollCompact({
    stageRef: scrollRef,
    searchRef,
  })

  const focusSearch = useCallback(() => {
    const stage = scrollRef.current
    if (stage && stage.scrollTop > 0) {
      stage.scrollTo({ top: 0, behavior: 'auto' })
    }
    window.requestAnimationFrame(() => {
      searchRef.current?.querySelector('input')?.focus()
    })
  }, [])

  useEffect(() => {
    const stage = scrollRef.current
    if (!stage) return undefined
    const apply = () => {
      stage.style.setProperty('--shop-pane', `${stage.clientHeight}px`)
    }
    apply()
    const observer = new ResizeObserver(apply)
    observer.observe(stage)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    rememberStore(storeId)
  }, [storeId])

  useEffect(() => {
    let cancelled = false
    fetchPharmacyById(storeId)
      .then((row) => {
        if (cancelled || !row) return
        setPharmacy(row)
        if (row.name) setName(row.name)
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setCardReady(true) })
    return () => { cancelled = true }
  }, [storeId])

  useEffect(() => {
    let cancelled = false
    const load = () => {
      getCart()
        .then((cart) => { if (!cancelled) setCartCount(cart.count) })
        .catch(() => { if (!cancelled) setCartCount(0) })
    }
    load()
    window.addEventListener('pharmacy-cart-changed', load)
    return () => {
      cancelled = true
      window.removeEventListener('pharmacy-cart-changed', load)
    }
  }, [])

  return (
    <div className="pharmacy-page shop-store">
      <ProfileHeader
        title={name}
        onBack={goBack}
        actions={(
          <>
            <HeaderSearchButton
              progress={progress}
              interactive={iconInteractive}
              onClick={focusSearch}
            />
            <button
              type="button"
              className="ds-icon-btn is-subtle is-md shop-cart-btn"
              onClick={() => navigate('/pharmacy/cart')}
              aria-label={cartCount ? `Cart, ${cartCount} items` : 'Cart'}
            >
              <PharmacyIcon name="bag" size={20} />
              {cartCount ? (
                <span className="notif-btn__badge is-sm" aria-hidden="true">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              ) : null}
            </button>
          </>
        )}
      />
      <div className="shop-store-scroll" ref={scrollRef}>
        <section className="shop-pharmacy-card" aria-label={name}>
          {!cardReady ? (
            <div className="dc-card dc-card-profile shop-pharmacy-card__skel shimmer" aria-hidden="true" />
          ) : (
            <PharmacyHeroCard
              pharmacy={pharmacy || { id: storeId, pharmacyUuid: storeId, name }}
              onClick={() => navigate(`/pharmacy/${storeId}`, {
                state: flowState(location, {
                  origin: 'pharmacy-store',
                  returnTo: `/pharmacy/store/${storeId}`,
                  storeName: pharmacy?.name || name,
                }),
              })}
            />
          )}
        </section>
        <CollapsingSearchDock
          className="shop-store-dock"
          progress={progress}
          fieldStyle={fieldStyle}
          expandedHeight={expandedHeight}
          inert={fieldInert}
        >
          <SearchBar
            mode="inline"
            scrollMode
            scope="pharmacy"
            barRef={searchRef}
            placeholder={PHARMACY_SEARCH_PLACEHOLDER}
            query={query}
            onQueryChange={setQuery}
            showDismiss={false}
          />
        </CollapsingSearchDock>
        <MarketplaceFeed
          stageRef={scrollRef}
          query={query}
          pharmacyId={storeId}
          onOpenProduct={(id) => navigate(`/pharmacy/product/${id}`)}
        />
      </div>
    </div>
  )
}
