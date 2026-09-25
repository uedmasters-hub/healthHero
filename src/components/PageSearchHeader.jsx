import { useCallback } from 'react'
import TabPageHeader from './TabPageHeader'
import SearchBar from './SearchBar'
import useSearchScrollCompact from '../hooks/useSearchScrollCompact'
import { HeaderSearchButton } from './home/SharedSearchIcon'
import CollapsingSearchDock from './home/CollapsingSearchDock'
import ProfileAvatar from './home/ProfileAvatar'
import './TabPageHeader.css'

/**
 * Shared tab-page chrome — Pharmacy / Home reference:
 * large left title, no subtitle, docked search that collapses on scroll
 * into a borderless header search icon beside the shared profile avatar.
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

  const shownProgress = locked || !showSearch ? 0 : progress

  return (
    <>
      <TabPageHeader
        title={title}
        leading={leading}
        className={className}
        actions={(
          <>
            {showSearch ? (
              <HeaderSearchButton
                progress={shownProgress}
                interactive={locked ? false : iconInteractive}
                onClick={focusSearch}
              />
            ) : null}
            <ProfileAvatar className="tab-page-header__avatar" />
          </>
        )}
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
