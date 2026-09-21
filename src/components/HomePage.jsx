import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Header from './Header'
import SearchBar from './SearchBar'
import SearchSuggestions from './SearchSuggestions'
import Categories from './Categories'
import BookAppointment from './BookAppointment'
import Services from './Services'
import TopDoctors from './TopDoctors'
import HealthInsights from './HealthInsights'
import AppFooter from './AppFooter'
import { HeaderSearchButton } from './home/SharedSearchIcon'
import { useTransition } from './PageTransition'
import { useSharedHero } from './SharedHero'
import { useRegisteredScroller, useScrollLock } from '../hooks/useScrollLock'
import useSearchScrollCompact from '../hooks/useSearchScrollCompact'
import { clearLock, freezeNow } from '../lib/scrollLock'
import { isHomePath } from '../lib/careFlow'

export default function HomePage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAnyOverlayActive } = useTransition()
  const shared = useSharedHero()
  const stageRef = useRef(null)
  const searchBarRef = useRef(null)

  const searchActive = location.pathname === '/search'
  const isFront = isHomePath(location.pathname)
  const [query, setQuery] = useState('')
  const freezeHome = !isFront || searchActive || isAnyOverlayActive || Boolean(shared?.active)
  const searchOrigin = location.state?.searchOrigin
  const searchPlaceholder = location.state?.searchPlaceholder
  const searchReturnTo = location.state?.returnTo
  const isPharmacySearch = searchOrigin === 'pharmacy'

  const headerSearchVisible = useSearchScrollCompact({
    stageRef,
    searchRef: searchBarRef,
    enabled: isFront && !searchActive,
  })

  useRegisteredScroller('home', stageRef)
  useScrollLock('home', freezeHome)

  // Drop stale freezeNow / touch locks once Home is front again (e.g. after chat).
  useEffect(() => {
    if (!freezeHome) clearLock('home')
  }, [freezeHome])

  useEffect(() => {
    if (!searchActive) setQuery('')
  }, [searchActive])

  const openSearch = () => {
    freezeNow('home')
    navigate('/search')
  }

  const closeSearch = () => {
    navigate(isPharmacySearch ? (searchReturnTo || '/pharmacy') : '/')
  }

  return (
    <div className={`app ${searchActive ? 'is-search' : ''} ${isAnyOverlayActive ? 'is-dimmed' : ''}`}>
      <div
        className="home-header"
        aria-hidden={searchActive}
        {...(searchActive ? { inert: true } : {})}
      >
        <div className="home-header-inner">
          <Header
            endAccessory={(
              <HeaderSearchButton
                visible={headerSearchVisible}
                onClick={openSearch}
              />
            )}
          />
        </div>
      </div>

      {searchActive ? (
        <SearchBar
          active
          query={query}
          onQueryChange={setQuery}
          onCancel={closeSearch}
          idlePlaceholder={isPharmacySearch ? searchPlaceholder : undefined}
          activePlaceholder={isPharmacySearch ? searchPlaceholder : undefined}
        />
      ) : null}

      <div className="home-body">
        <div className="home-stage" ref={stageRef}>
          {!searchActive ? (
            <SearchBar
              scrollMode
              barRef={searchBarRef}
              query={query}
              onQueryChange={setQuery}
              onCancel={() => navigate('/')}
            />
          ) : null}

          <div className="home-feed" aria-hidden={searchActive} {...(searchActive ? { inert: true } : {})}>
            <Categories />
            <BookAppointment />
            <Services />
            <TopDoctors />
            <HealthInsights />
            <AppFooter page="home" />
          </div>
        </div>
        <SearchSuggestions query={query} active={searchActive} />
      </div>
    </div>
  )
}
