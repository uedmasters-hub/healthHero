import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { freezeNow } from '../lib/scrollLock'
import { useI18n, voiceLangFromSiteLang } from '../i18n'
import {
  getScopeCopy,
  useVoiceSearch,
  VOICE_STATE,
  voiceErrorMessage,
  voiceStatusMessage,
  queueVoiceStart,
  takeVoiceStart,
  clearVoiceStart,
} from '../features/search'
import './SearchBar.css'

export const SearchIcon = ({ className = 'search-field-icon', iconRef }) => (
  <svg
    ref={iconRef}
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8" />
    <path d="M21 21l-4.35-4.35" />
  </svg>
)

const MicIcon = () => (
  <svg className="search-field-mic-glyph" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z" />
    <path d="M19 11a1 1 0 1 0-2 0 5 5 0 0 1-10 0 1 1 0 1 0-2 0 7 7 0 0 0 6 6.93V21a1 1 0 1 0 2 0v-3.07A7 7 0 0 0 19 11Z" />
  </svg>
)

const STATUS_FADE_MS = 3200

/**
 * Canonical search chrome — state-driven tools:
 * idle → Language + Mic
 * listening → Mic only (lang fades)
 * results → inline × + Mic (lang stays hidden until cleared)
 */
function SearchFieldCore({
  scope = 'home',
  placeholder,
  value,
  onChange,
  showMic = true,
  onClear,
  autoFocus = false,
  onFocus,
  onClick,
  readOnly = false,
  inputRef,
  onKeyDown,
  iconRef,
  interactive = true,
  onRequestOpen,
  reserveStatus = false,
  onChromeChange,
  /** When true, begin VoiceSearchService.start() as soon as interactive */
  autoStartVoice = false,
}) {
  const { tx, lang, setLang } = useI18n()
  const copy = getScopeCopy(scope)
  const [voiceLang, setVoiceLang] = useState(() => voiceLangFromSiteLang(lang))
  const [helper, setHelper] = useState(null)
  const [helperLeaving, setHelperLeaving] = useState(false)
  /** Optimistic listening chrome while permission/start arms */
  const [arming, setArming] = useState(false)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const onChromeChangeRef = useRef(onChromeChange)
  onChromeChangeRef.current = onChromeChange
  const lastCommittedRef = useRef('')
  const didAutoStartRef = useRef(false)
  const restartTimer = useRef(null)
  const helperTimer = useRef(null)
  const leaveTimer = useRef(null)

  const {
    state,
    supported,
    unavailable,
    listening,
    processing,
    requesting,
    transcript,
    error,
    modelProgress,
    stop,
    start,
    clearError,
  } = useVoiceSearch(voiceLang)

  const voiceActive = listening || requesting || arming
  const toolsLive = interactive && !readOnly
  const hasText = Boolean(String(value ?? '').trim())
  const showLang = toolsLive && !voiceActive && !processing && !hasText
  const showInlineClear = toolsLive && !voiceActive && !processing && hasText

  const showHelper = (text, { error: isError = false } = {}) => {
    if (!text) return
    if (helperTimer.current) window.clearTimeout(helperTimer.current)
    if (leaveTimer.current) window.clearTimeout(leaveTimer.current)
    setHelperLeaving(false)
    setHelper({ text, error: isError })
    helperTimer.current = window.setTimeout(() => {
      setHelperLeaving(true)
      leaveTimer.current = window.setTimeout(() => {
        setHelper(null)
        setHelperLeaving(false)
      }, 220)
    }, STATUS_FADE_MS)
  }

  /** Single entry — always VoiceSearchService.start() */
  const beginVoice = () => {
    if (unavailable || !supported) {
      showHelper(tx('Voice search isn’t available here — type to search instead.'), { error: true })
      return false
    }
    setArming(true)
    void start()
    return true
  }

  useEffect(() => {
    setVoiceLang(voiceLangFromSiteLang(lang))
  }, [lang])

  useEffect(() => {
    if (!transcript) return
    if (transcript === lastCommittedRef.current) return
    lastCommittedRef.current = transcript
    onChangeRef.current?.({ target: { value: transcript } })
  }, [transcript])

  useEffect(() => {
    if (listening || requesting) setArming(false)
    if (state === VOICE_STATE.error || state === VOICE_STATE.idle) {
      if (!listening && !requesting) setArming(false)
    }
  }, [listening, requesting, state])

  useEffect(() => {
    if (state !== VOICE_STATE.error || !error) return undefined
    setArming(false)
    const msg = voiceErrorMessage(error, tx)
    if (msg) showHelper(msg, { error: true })
    const t = window.setTimeout(() => clearError(), STATUS_FADE_MS + 240)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per error transition
  }, [state, error, tx, clearError])

  useEffect(() => {
    onChromeChangeRef.current?.({
      voiceActive: voiceActive || processing,
      hasText,
      phase: (voiceActive || processing) ? 'listening' : hasText ? 'results' : 'idle',
    })
  }, [voiceActive, processing, hasText])

  // Consume queued / prop-driven voice start once the field is interactive.
  useEffect(() => {
    if (!toolsLive) return undefined
    if (didAutoStartRef.current) {
      clearVoiceStart()
      return undefined
    }
    const should = autoStartVoice || takeVoiceStart()
    if (!should) return undefined
    didAutoStartRef.current = true
    const id = window.setTimeout(() => {
      beginVoice()
    }, 40)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolsLive, autoStartVoice])

  useEffect(() => () => {
    if (restartTimer.current) window.clearTimeout(restartTimer.current)
    if (helperTimer.current) window.clearTimeout(helperTimer.current)
    if (leaveTimer.current) window.clearTimeout(leaveTimer.current)
  }, [])

  const resolvedPlaceholder = tx(placeholder || copy.placeholder)

  const toggleVoice = (e) => {
    e?.preventDefault?.()
    e?.stopPropagation?.()

    // Idle Home (readOnly): one tap → open shared search already listening.
    if (readOnly && typeof onRequestOpen === 'function') {
      if (unavailable || !supported) {
        showHelper(tx('Voice search isn’t available here — type to search instead.'), { error: true })
        onRequestOpen({ startVoice: false })
        return
      }
      // Arm listening immediately on this instance; queue in case the bar remounts.
      setArming(true)
      didAutoStartRef.current = true
      queueVoiceStart()
      void start()
      onRequestOpen({ startVoice: true })
      return
    }

    if (!toolsLive) return
    if (unavailable || !supported) {
      showHelper(tx('Voice search isn’t available here — type to search instead.'), { error: true })
      return
    }
    if (voiceActive || processing) {
      setArming(false)
      stop()
      return
    }
    beginVoice()
  }

  const switchVoiceLang = (next) => {
    if (restartTimer.current) window.clearTimeout(restartTimer.current)
    const wasActive = voiceActive
    if (wasActive) {
      setArming(false)
      stop()
    }
    setVoiceLang(next)
    setLang(next === 'ne-NP' ? 'ne' : 'en')
    if (wasActive && toolsLive) {
      restartTimer.current = window.setTimeout(() => {
        beginVoice()
      }, 450)
    }
  }

  const ensureOpen = () => {
    if (readOnly && typeof onRequestOpen === 'function') {
      onRequestOpen({ startVoice: false })
      return true
    }
    return false
  }

  const handleClear = (e) => {
    e?.preventDefault?.()
    e?.stopPropagation?.()
    lastCommittedRef.current = ''
    onClear?.()
  }

  const statusLabel = voiceStatusMessage(state, {
    voiceLang,
    listeningEn: copy.listeningEn,
    listeningNe: copy.listeningNe,
    modelProgress,
    tx,
  })
  const statusText = statusLabel || helper?.text || null
  const statusIsError = !statusLabel && Boolean(helper?.error)
  const statusVisible = Boolean(statusText)
  const statusReserved = reserveStatus || statusVisible || voiceActive || processing

  return (
    <div
      className={[
        'search-field-wrap',
        voiceActive ? 'is-listening' : '',
        processing ? 'is-processing' : '',
        hasText ? 'has-text' : '',
        statusReserved ? 'has-status' : '',
      ].filter(Boolean).join(' ')}
      data-voice-state={state}
      data-chrome={(voiceActive || processing) ? 'listening' : hasText ? 'results' : 'idle'}
    >
      <label
        className={[
          'search-field',
          voiceActive ? 'is-listening' : '',
        ].filter(Boolean).join(' ')}
      >
        <SearchIcon iconRef={iconRef} />
        <span className="search-field-input-wrap">
          <input
            ref={inputRef}
            type="text"
            className="search-field-input"
            placeholder={resolvedPlaceholder}
            aria-label={tx(copy.ariaLabel)}
            data-search-scope={scope}
            value={value}
            onChange={(e) => onChange?.(e)}
            autoFocus={autoFocus}
            onFocus={onFocus}
            onClick={onClick}
            readOnly={readOnly}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.preventDefault()
              onKeyDown?.(e)
            }}
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
          />
          <span
            className={[
              'search-field-clear-slot',
              toolsLive ? 'is-reserved' : '',
              showInlineClear ? 'is-visible' : '',
            ].filter(Boolean).join(' ')}
          >
            <button
              type="button"
              className="search-field-clear"
              tabIndex={showInlineClear ? 0 : -1}
              aria-hidden={!showInlineClear}
              aria-label={tx('Clear search')}
              onClick={handleClear}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </span>
        </span>
        <div className="search-field-tools">
          <div
            className={`search-lang-hit${showLang ? ' is-shown' : ' is-hidden'}`}
            aria-hidden={!showLang}
          >
            <div className="search-lang-switch" role="group" aria-label={tx('Voice language')}>
              {[
                { id: 'en-US', label: 'EN' },
                { id: 'ne-NP', label: 'ने' },
              ].map((opt) => {
                const on = voiceLang === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`search-lang-btn${on ? ' is-on' : ''}`}
                    tabIndex={showLang ? 0 : -1}
                    aria-pressed={on}
                    disabled={!showLang}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      if (ensureOpen()) return
                      switchVoiceLang(opt.id)
                    }}
                  >
                    <span className="search-lang-chip">{opt.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
          {showMic ? (
            <button
              type="button"
              className={[
                'search-field-mic-btn',
                voiceActive ? 'is-listening' : '',
                unavailable || !supported ? 'is-disabled' : '',
              ].filter(Boolean).join(' ')}
              aria-disabled={toolsLive && (unavailable || !supported) ? 'true' : undefined}
              title={
                voiceActive
                  ? tx('Stop listening')
                  : voiceLang === 'ne-NP'
                    ? tx('Speak in Nepali')
                    : tx('Speak in English')
              }
              aria-label={voiceActive ? tx('Stop voice search') : tx('Start voice search')}
              aria-pressed={voiceActive}
              onClick={toggleVoice}
            >
              <MicIcon />
            </button>
          ) : (
            <span className="search-field-mic-spacer" aria-hidden="true" />
          )}
        </div>
      </label>

      <div
        className={[
          'search-status-layer',
          statusReserved ? 'is-reserved' : '',
          statusVisible ? 'is-visible' : '',
          helperLeaving ? 'is-leaving' : '',
          statusIsError ? 'is-error' : '',
          statusLabel ? 'is-listening' : '',
        ].filter(Boolean).join(' ')}
        role={statusIsError ? 'alert' : 'status'}
        aria-live="polite"
        aria-hidden={!statusVisible}
      >
        {statusText ? <p className="search-status-text">{statusText}</p> : null}
      </div>
    </div>
  )
}

/**
 * Single reusable SearchBar — source of truth for Home, Treat, Pharmacy,
 * Centers, Find Doctor, and Global Search.
 */
export default function SearchBar({
  active = false,
  query = '',
  onQueryChange,
  onCancel,
  style,
  iconRef,
  barRef,
  scrollMode = false,
  scope = 'home',
  idlePlaceholder,
  activePlaceholder,
  placeholder,
  onOpenSearch,
  mode = 'expandable',
  showDismiss,
  showMic = true,
  autoFocus = false,
  autoStartVoice = false,
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const { tx } = useI18n()
  const inputRef = useRef(null)
  const copy = getScopeCopy(scope)
  const isInline = mode === 'inline'
  const isActive = isInline || active
  const dismissible = showDismiss ?? (!isInline && typeof onCancel === 'function')
  const [chrome, setChrome] = useState({ voiceActive: false, hasText: false, phase: 'idle' })
  const voiceIntent = Boolean(autoStartVoice || location.state?.startVoice)

  /* Cancel only when idle+empty — unmount column otherwise so the field stays full-width */
  const dismissVisible = dismissible && isActive && chrome.phase === 'idle'
  const showDismissColumn = dismissVisible

  useEffect(() => {
    if (!isActive || isInline) return undefined
    const id = window.setTimeout(() => inputRef.current?.focus(), 280)
    return () => window.clearTimeout(id)
  }, [isActive, isInline])

  // Clear one-shot startVoice from history after activation (avoid re-trigger on back).
  useEffect(() => {
    if (!isActive || !location.state?.startVoice) return undefined
    const { startVoice: _drop, ...rest } = location.state
    const id = window.setTimeout(() => {
      navigate(`${location.pathname}${location.search || ''}`, {
        replace: true,
        state: Object.keys(rest).length ? rest : undefined,
      })
    }, 500)
    return () => window.clearTimeout(id)
  }, [isActive, location.pathname, location.search, location.state, navigate])

  const openSearch = (opts = {}) => {
    if (isActive) return
    if (typeof onOpenSearch === 'function') {
      onOpenSearch(opts)
      return
    }
    freezeNow('home')
    navigate('/search', {
      state: opts?.startVoice ? { startVoice: true } : undefined,
    })
  }

  const resolvedPlaceholder = placeholder
    || (isActive
      ? (activePlaceholder || copy.placeholder)
      : (idlePlaceholder || copy.idlePlaceholder || copy.placeholder))

  const handleChange = (e) => {
    const next = e?.target?.value ?? ''
    onQueryChange?.(next)
  }

  return (
    <div
      ref={barRef}
      className={[
        'search-bar',
        isActive ? 'is-active' : '',
        scrollMode ? 'is-scroll-mode' : '',
        isInline ? 'is-inline' : '',
        dismissible ? 'has-dismiss' : '',
        showDismissColumn ? 'dismiss-visible' : '',
        `chrome-${chrome.phase}`,
      ].filter(Boolean).join(' ')}
      style={style}
      data-search-scope={scope}
      data-chrome={chrome.phase}
    >
      <div className="search-bar-row">
        <div className="search-field-slot">
          <SearchFieldCore
            scope={scope}
            inputRef={inputRef}
            iconRef={iconRef}
            placeholder={resolvedPlaceholder}
            value={query}
            onChange={handleChange}
            readOnly={!isActive}
            interactive
            onRequestOpen={isInline ? undefined : openSearch}
            onFocus={isInline ? undefined : () => openSearch({ startVoice: false })}
            onClick={isInline ? undefined : () => openSearch({ startVoice: false })}
            showMic={showMic}
            onClear={() => onQueryChange?.('')}
            autoFocus={autoFocus && isActive}
            reserveStatus={!isInline && isActive}
            autoStartVoice={voiceIntent && isActive}
            onChromeChange={setChrome}
          />
        </div>
        {showDismissColumn ? (
          <div className="search-trailing-slot">
            <button
              type="button"
              className="search-dismiss"
              aria-label={tx('Cancel')}
              title={tx('Cancel')}
              onClick={onCancel}
            >
              <span className="search-dismiss-visual" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </span>
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

/** Thin alias — same immutable SearchBar shell (inline / always active). */
export function SearchField({
  value = '',
  query,
  onChange,
  onQueryChange,
  placeholder,
  scope = 'universal',
  showMic = true,
  readOnly = false,
  ...rest
}) {
  const resolvedQuery = query ?? value ?? ''
  const handleQuery = (next) => {
    onQueryChange?.(next)
    if (typeof onChange === 'function') {
      onChange({ target: { value: next } })
    }
  }
  return (
    <SearchBar
      mode="inline"
      active={!readOnly}
      scope={scope}
      placeholder={placeholder}
      query={resolvedQuery}
      onQueryChange={handleQuery}
      showDismiss={false}
      showMic={showMic}
      {...rest}
    />
  )
}
