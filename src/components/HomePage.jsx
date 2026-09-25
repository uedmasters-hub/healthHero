import { useCallback, useEffect, useRef } from 'react'
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
import CollapsingSearchDock from './home/CollapsingSearchDock'
import { useTransition } from './PageTransition'
import { useSharedHero } from './SharedHero'
import { useRegisteredScroller, useScrollLock } from '../hooks/useScrollLock'
import useSearchScrollCompact from '../hooks/useSearchScrollCompact'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import PullToRefreshIndicator from './PullToRefreshIndicator'
import { refreshHomeData } from '../features/sync/pageRefresh'
import { clearLock, freezeNow } from '../lib/scrollLock'
import { isHomePath } from '../lib/careFlow'
import { resolveSearchScope, useSearchQuery } from '../features/search'

export default function HomePage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAnyOverlayActive } = useTransition()
  const shared = useSharedHero()
  const stageRef = useRef(null)
  const searchBarRef = useRef(null)

  const searchActive = location.pathname === '/search'
  const isFront = isHomePath(location.pathname)
  const searchOrigin = location.state?.searchOrigin
  const scope = resolveSearchScope(
    location.pathname,
    searchOrigin === 'pharmacy' ? 'pharmacy' : searchOrigin === 'centers' ? 'centers' : null,
  )
  const [query, setQuery] = useSearchQuery(scope)
  const freezeHome = !isFront || searchActive || isAnyOverlayActive || Boolean(shared?.morphing)
  const searchPlaceholder = location.state?.searchPlaceholder
  const searchReturnTo = location.state?.returnTo

  const onRefresh = useCallback(() => refreshHomeData(), [])
  const ptr = usePullToRefresh(stageRef, onRefresh, {
    enabled: isFront && !searchActive && !freezeHome,
  })

  const {
    progress,
    fieldStyle,
    expandedHeight,
    fieldInert,
    iconInteractive,
  } = useSearchScrollCompact({
    stageRef,
    searchRef: searchBarRef,
    enabled: isFront && !searchActive,
  })

  useRegisteredScroller('home', stageRef)
  useScrollLock('home', freezeHome)

  useEffect(() => {
    if (!freezeHome) clearLock('home')
  }, [freezeHome])

  useEffect(() => {
    if (!isFront) return
    if (!shared?.active) return
    if (String(shared.phase || '').startsWith('closing')) return
    shared.reset?.()
  }, [isFront, shared?.active, shared?.phase, shared])

  const openSearch = (opts = {}) => {
    freezeNow('home')
    const base = searchOrigin
      ? { searchOrigin, searchPlaceholder, returnTo: searchReturnTo }
      : {}
    navigate('/search', {
      state: {
        ...base,
        ...(opts.startVoice ? { startVoice: true } : {}),
      },
    })
  }

  const closeSearch = () => {
    navigate(searchReturnTo || '/')
  }

  return (
    <div className={`app ${searchActive ? 'is-search' : ''}`}>
      <div
        className="home-header"
        aria-hidden={searchActive}
        {...(searchActive ? { inert: true } : {})}
      >
        <div className="home-header-inner">
          <Header
            endAccessory={(
              <HeaderSearchButton
                progress={searchActive ? 0 : progress}
                interactive={searchActive ? false : iconInteractive}
                onClick={openSearch}
              />
            )}
          />
        </div>
      </div>

      <div className="home-body">
        <CollapsingSearchDock
          className="home-search-dock"
          progress={searchActive ? 0 : progress}
          fieldStyle={searchActive ? null : fieldStyle}
          expandedHeight={expandedHeight}
          locked={searchActive}
          inert={fieldInert && !searchActive}
        >
          <SearchBar
            active={searchActive}
            mode="expandable"
            scrollMode={!searchActive}
            scope={scope}
            barRef={searchBarRef}
            query={query}
            onQueryChange={setQuery}
            onCancel={closeSearch}
            onOpenSearch={openSearch}
            idlePlaceholder={searchPlaceholder}
            activePlaceholder={searchPlaceholder}
          />
        </CollapsingSearchDock>

        <div className="home-main">
          <div className="home-stage" ref={stageRef}>
            <PullToRefreshIndicator pull={ptr.pull} refreshing={ptr.refreshing} />
            <div className="home-feed" aria-hidden={searchActive} {...(searchActive ? { inert: true } : {})}>
              <Categories />
              <BookAppointment />
              <Services />
              <TopDoctors />
              <HealthInsights />
              <AppFooter page="home" />
            </div>
          </div>
          <SearchSuggestions query={query} active={searchActive} scope={scope} />
        </div>
      </div>
    </div>
  )
}
