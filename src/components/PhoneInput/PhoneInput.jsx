import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import countries from './countries'
import AppBottomSheet from '../AppBottomSheet'
import { useAppSheet } from '../PageTransition'
import './PhoneInput.css'

export function toE164(countryCode, localNumber) {
  const cc = (countryCode || '').replace('+', '')
  const num = (localNumber || '').replace(/\D/g, '')
  return cc && num ? `+${cc}${num}` : num ? `+${num}` : ''
}

function CountrySheet({ selected, onChange, onClose, closing = false }) {
  const [search, setSearch] = useState('')
  const initialIdx = useMemo(() => {
    const idx = countries.findIndex((c) => c.code === selected)
    return idx >= 0 ? idx : 0
  }, [selected])
  const [activeIndex, setActiveIndex] = useState(initialIdx)
  const listRef = useRef(null)
  const inputRef = useRef(null)
  const itemRefs = useRef([])

  const filtered = useMemo(() => {
    if (!search) return countries
    const q = search.toLowerCase()
    return countries.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.includes(q) ||
        c.iso.toLowerCase().includes(q)
    )
  }, [search])

  useEffect(() => {
    inputRef.current?.focus()
    setTimeout(() => itemRefs.current[initialIdx]?.scrollIntoView({ block: 'center' }), 60)
  }, [initialIdx])

  useEffect(() => {
    itemRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (filtered[activeIndex]) {
          onChange(filtered[activeIndex].code)
          onClose()
        }
      } else if (e.key === 'Escape') {
        onClose()
      }
    },
    [filtered, activeIndex, onChange, onClose]
  )

  return (
    <AppBottomSheet
      open
      closing={closing}
      onClose={onClose}
      labelledBy="phone-sheet-title"
      sheetClassName="phone-sheet"
      keyboardAware
    >
        <div className="phone-sheet-header">
          <h3 id="phone-sheet-title" className="phone-sheet-title">Select country</h3>
          <button type="button" className="phone-sheet-close" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="phone-sheet-search">
          <svg className="phone-sheet-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setActiveIndex(0) }}
            onKeyDown={handleKeyDown}
            placeholder="Search by name or code..."
            className="phone-sheet-search-input"
          />
          {search && (
            <button type="button" className="phone-sheet-search-clear" onClick={() => { setSearch(''); setActiveIndex(0) }} aria-label="Clear search">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
        <div className="phone-sheet-list" ref={listRef}>
          {filtered.length === 0 && (
            <div className="phone-sheet-empty">No countries found</div>
          )}
          {filtered.map((c, i) => (
            <button
              key={c.code + c.iso}
              ref={(el) => { itemRefs.current[i] = el }}
              type="button"
              className={`phone-sheet-item ${c.code === selected ? 'is-active' : ''} ${i === activeIndex ? 'is-focused' : ''}`}
              onClick={() => { onChange(c.code); onClose() }}
              onMouseEnter={() => setActiveIndex(i)}
            >
              <span className="phone-sheet-flag">{c.flag}</span>
              <span className="phone-sheet-name">{c.name}</span>
              <span className="phone-sheet-dial">{c.code}</span>
              {c.code === selected && (
                <svg className="phone-sheet-check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          ))}
        </div>
    </AppBottomSheet>
  )
}

const LOCAL_MAX = 10

export default function PhoneInput({
  value = '',
  country = '+977',
  onChange,
  onCountryChange,
  placeholder = '98765 43210',
  disabled = false,
  error = null,
  verified = false,
  required = false,
  label,
  className = '',
}) {
  const { isPresented, isClosing, show, hide } = useAppSheet()
  const containerRef = useRef(null)

  const localDigits = value.replace(/\D/g, '').slice(0, LOCAL_MAX)

  const resolvedCountry = useMemo(() => {
    return countries.find((c) => c.code === country) || countries[0]
  }, [country])

  const handleLocalChange = useCallback(
    (e) => {
      const raw = e.target.value.replace(/\D/g, '').slice(0, LOCAL_MAX)
      onChange(raw)
    },
    [onChange]
  )

  const handlePaste = useCallback(
    (e) => {
      e.preventDefault()
      const text = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, LOCAL_MAX)
      if (text) onChange(text)
    },
    [onChange]
  )

  const handleCountryChange = useCallback(
    (newCode) => {
      onCountryChange?.(newCode)
    },
    [onCountryChange]
  )

  return (
    <div className={`phone-input-wrap ${error ? 'has-error' : ''} ${className}`}>
      {label && <span className="phone-input-label">{label}{required ? ' *' : ''}</span>}
      <div className="phone-input-row" ref={containerRef}>
        <div className="phone-input-composite">
          <button
            type="button"
            className="phone-input-code"
            onClick={() => (isPresented ? hide() : show())}
            disabled={disabled}
            aria-expanded={isPresented}
            aria-haspopup="dialog"
          >
            <span className="phone-input-flag">{resolvedCountry.flag}</span>
            <span className="phone-input-dial">{resolvedCountry.code}</span>
            <svg className="phone-input-chevron" width="10" height="6" viewBox="0 0 10 6" fill="none">
              <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="phone-input-divider" />
          <input
            className="phone-input-field"
            inputMode="numeric"
            maxLength={LOCAL_MAX}
            value={localDigits}
            onChange={handleLocalChange}
            onPaste={handlePaste}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            autoComplete="tel-national"
            aria-label="Phone number"
          />
        </div>
        {verified && <span className="phone-input-verified">Verified</span>}
      </div>
      {error && <span className="phone-input-error" role="alert">{error}</span>}
      {isPresented && (
        <CountrySheet
          selected={resolvedCountry.code}
          onChange={handleCountryChange}
          onClose={() => hide()}
          closing={isClosing}
        />
      )}
    </div>
  )
}
