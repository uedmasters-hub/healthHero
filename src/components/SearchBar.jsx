import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { freezeNow } from '../lib/scrollLock'
import useStaggerReveal from './useStaggerReveal'
import RevealItem from './RevealItem'
import './SearchBar.css'

const SearchIcon = () => (
  <svg className="search-field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <path d="M21 21l-4.35-4.35" />
  </svg>
)

const MicIcon = () => (
  <svg className="search-field-mic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
)

export function SearchField({
  placeholder = 'Search Doctor',
  value,
  onChange,
  showMic = true,
  showClear = false,
  onClear,
  autoFocus = false,
  onFocus,
  onClick,
  readOnly = false,
  inputRef,
  onKeyDown,
}) {
  return (
    <label className="search-field">
      <SearchIcon />
      <input
        ref={inputRef}
        type="text"
        className="search-field-input"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        autoFocus={autoFocus}
        onFocus={onFocus}
        onClick={onClick}
        readOnly={readOnly}
        onKeyDown={onKeyDown}
        autoComplete="off"
        autoCorrect="off"
        spellCheck="false"
      />
      {showClear && (
        <button
          type="button"
          className="search-field-clear"
          aria-label="Clear search"
          onClick={(e) => {
            e.preventDefault()
            onClear?.()
          }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm3.3 12.9a1 1 0 0 1-1.4 1.4L12 13.42l-1.9 1.88a1 1 0 1 1-1.4-1.42L10.58 12 8.7 10.12a1 1 0 0 1 1.4-1.42L12 10.58l1.9-1.88a1 1 0 0 1 1.4 1.42L13.42 12l1.88 1.9Z" />
          </svg>
        </button>
      )}
      {showMic && !showClear && <MicIcon />}
    </label>
  )
}

export default function SearchBar({ active = false, query = '', onQueryChange, onCancel, style }) {
  const navigate = useNavigate()
  const { setItemRef, isRevealed, isCached } = useStaggerReveal({ delay: 160 })
  const inputRef = useRef(null)

  useEffect(() => {
    if (!active) return
    const id = window.setTimeout(() => inputRef.current?.focus(), 280)
    return () => window.clearTimeout(id)
  }, [active])

  const openSearch = () => {
    if (active) return
    freezeNow('home')
    navigate('/search')
  }

  return (
    <div className={`search-bar ${active ? 'is-active' : ''}`} style={style}>
      <RevealItem className="search-field-reveal" revealed={isRevealed(0)} cached={isCached} ref={setItemRef(0)}>
        <SearchField
          inputRef={inputRef}
          placeholder={active ? 'Search doctors, services...' : 'Search Doctor'}
          value={query}
          onChange={(e) => onQueryChange?.(e.target.value)}
          readOnly={!active}
          onFocus={openSearch}
          onClick={openSearch}
          showMic={!query}
          showClear={active && Boolean(query)}
          onClear={() => onQueryChange?.('')}
        />
      </RevealItem>
      <button
        type="button"
        className="search-cancel"
        tabIndex={active ? 0 : -1}
        aria-hidden={!active}
        onClick={onCancel}
      >
        Cancel
      </button>
    </div>
  )
}
