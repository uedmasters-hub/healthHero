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
import { useTransition } from './PageTransition'
import { useSharedHero } from './SharedHero'
import { useRegisteredScroller, useScrollLock } from '../hooks/useScrollLock'
import { isHomePath } from '../lib/careFlow'

const COMPACT_START = 0
const COMPACT_END = 80

export default function HomePage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAnyOverlayActive } = useTransition()
  const shared = useSharedHero()
  const stageRef = useRef(null)
  const searchActive = location.pathname === '/search'
  const isFront = isHomePath(location.pathname)
  const [query, setQuery] = useState('')
  const [scrollPad, setScrollPad] = useState(0)
  const freezeHome = !isFront || searchActive || isAnyOverlayActive || Boolean(shared?.active)

  useRegisteredScroller('home', stageRef)
  useScrollLock('home', freezeHome)

  useEffect(() => {
    if (!searchActive) setQuery('')
  }, [searchActive])

  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const onScroll = () => {
      const y = el.scrollTop
      const ratio = Math.min(1, Math.max(0, (y - COMPACT_START) / (COMPACT_END - COMPACT_START)))
      setScrollPad(ratio)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  const bottomPad = 16 - scrollPad * 12

  return (
    <div className={`app ${searchActive ? 'is-search' : ''} ${isAnyOverlayActive ? 'is-dimmed' : ''}`}>
      <div className="home-header" aria-hidden={searchActive} {...(searchActive ? { inert: true } : {})}>
        <div className="home-header-inner">
          <Header />
        </div>
      </div>

      <SearchBar
        active={searchActive}
        query={query}
        onQueryChange={setQuery}
        onCancel={() => navigate('/')}
        style={{ paddingBottom: `${bottomPad}px` }}
      />

      <div className="home-body">
        <div className="home-stage" ref={stageRef}>
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
