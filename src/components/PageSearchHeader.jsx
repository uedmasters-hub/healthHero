import { useCallback, useState } from 'react'
import { useLocation } from 'react-router-dom'
import TabPageHeader from './TabPageHeader'
import SearchBar from './SearchBar'
import useSearchScrollCompact from '../hooks/useSearchScrollCompact'
import { HeaderSearchButton } from './home/SharedSearchIcon'
import CollapsingSearchDock from './home/CollapsingSearchDock'
import HeaderActions from './home/HeaderActions'
import ProfileAvatar from './home/ProfileAvatar'
import { isTabRootPath } from '../features/pushNav/config'
import './TabPageHeader.css'

/**
 * Shared tab-page chrome — Pharmacy / Home reference:
 * large left title, no subtitle, docked search that collapses on scroll
 * into a borderless header search icon beside the shared profile avatar.
 *
 * Root screens (tab roots without a back control) carry the global
 * notification bell via HeaderActions — the same control Home uses.
 * Child screens keep the avatar-only chrome.
 */
export default function PageSearchHeader({
  title,
  leading = null,
  scrollRef,
  searchBarRef,
  scope = 'universal',
  placeholder,
  query = '',
  onQueryChange,
  enabled = true,
  locked = false,
  showSearch = true,
  trailing = null,
  showAvatar = true,
  className = '',
  dockClassName = '',
}) {
  const {
    progress,
    fieldStyle,
    expandedHeight,
    fieldInert,
    iconInteractive,
  } = useSearchScrollCompact({
    stageRef: scrollRef,
    searchRef: searchBarRef,
    enabled: showSearch && enabled && !locked,
  })

  const focusSearch = useCallback(() => {
    const stage = scrollRef?.current
    if (stage && stage.scrollTop > 0) {
      stage.scrollTo({ top: 0, behavior: 'auto' })
    }
    window.requestAnimationFrame(() => {
      const input = searchBarRef?.current?.querySelector?.('input')
        || searchBarRef?.current
      input?.focus?.()
    })
  }, [scrollRef, searchBarRef])

  const location = useLocation()
  // Tab roots unmount on push, so the mount path identifies the screen's role.
  const [mountedOnRoot] = useState(() => isTabRootPath(location.pathname))
  const rootChrome = mountedOnRoot && showAvatar && !leading

  const shownProgress = locked || !showSearch ? 0 : progress
  const showActions = Boolean(showSearch || showAvatar || trailing)
  const searchButton = showSearch ? (
    <HeaderSearchButton
      progress={shownProgress}
      interactive={locked ? false : iconInteractive}
      onClick={focusSearch}
    />
  ) : null

  let actions = null
  if (rootChrome) {
    actions = <HeaderActions searchSlot={searchButton} trailing={trailing} settleHide />
  } else if (showActions) {
    actions = (
      <>
        {searchButton}
        {trailing}
        {showAvatar ? <ProfileAvatar className="tab-page-header__avatar" /> : null}
      </>
    )
  }

  return (
    <>
      <TabPageHeader
        title={title}
        leading={leading}
        className={className}
        actions={actions}
      />
      {showSearch ? (
        <CollapsingSearchDock
          className={dockClassName}
          progress={shownProgress}
          fieldStyle={locked ? null : fieldStyle}
          expandedHeight={expandedHeight}
          locked={locked}
          inert={fieldInert && !locked}
        >
          <SearchBar
            mode="inline"
            scrollMode={!locked}
            scope={scope}
            barRef={searchBarRef}
            placeholder={placeholder}
            query={query}
            onQueryChange={onQueryChange}
            onOpenSearch={focusSearch}
          />
        </CollapsingSearchDock>
      ) : null}
    </>
  )
}
