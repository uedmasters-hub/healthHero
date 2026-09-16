import { useEffect, useState } from 'react'
import AppBottomSheet from '../AppBottomSheet'
import { useAppSheet } from '../PageTransition'
import { useScrollLock } from '../../hooks/useScrollLock'
import useStaggerReveal from '../useStaggerReveal'
import RevealItem from '../RevealItem'
import {
  AVAILABILITY_PERIODS,
  DAY_PERIODS,
  VISIT_TYPES,
  WEEKDAYS,
  dateKey,
  generateDates,
  isSameDate,
  makeDateValue,
  monthGrid,
  MONTH_NAMES,
  MONTH_SHORT,
  monthsInRange,
  monthOverlapsRange,
  parseIsoDate,
  toIsoDate,
  formatDisplayDate,
  bookingRange,
  yearsInRange,
  startOfDay,
  stripDatesForSelection,
} from './dates'
import './Calendar.css'

export {
  AVAILABILITY_PERIODS,
  DAY_PERIODS,
  VISIT_TYPES,
  WEEKDAYS,
  dateKey,
  generateDates,
  isSameDate,
  makeDateValue,
  monthGrid,
  parseIsoDate,
  toIsoDate,
  formatDisplayDate,
}

function ChipIcon({ name }) {
  if (name === 'sun') {
    return (
      <svg className="cal-chip-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="4.2" />
        <path d="M12 3.2v1.8M12 19v1.8M4.9 4.9l1.3 1.3M17.8 17.8l1.3 1.3M3.2 12h1.8M19 12h1.8M4.9 19.1l1.3-1.3M17.8 6.2l1.3-1.3" />
      </svg>
    )
  }
  if (name === 'home') {
    return (
      <svg className="cal-chip-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    )
  }
  if (name === 'video') {
    return (
      <svg className="cal-chip-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="23 7 16 12 23 17 23 7" />
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
      </svg>
    )
  }
  if (name === 'cloud') {
    return (
      <svg className="cal-chip-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7.5 18h9.2A4.3 4.3 0 0 0 20 14.2 4.2 4.2 0 0 0 16 10a5.5 5.5 0 0 0-10.4 1.6A3.8 3.8 0 0 0 7.5 18z" />
      </svg>
    )
  }
  if (name === 'moon') {
    return (
      <svg className="cal-chip-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 14.5A8.2 8.2 0 0 1 9.5 4 8.4 8.4 0 1 0 20 14.5z" />
      </svg>
    )
  }
  return name || null
}

function ChipInner({ item }) {
  return (
    <>
      {item.icon ? <ChipIcon name={item.icon} /> : null}
      {item.time ? (
        <span className="cal-chip-copy">
          <span className="cal-chip-label">{item.label}</span>
          <span className="cal-chip-time">{item.time}</span>
        </span>
      ) : item.label}
    </>
  )
}

export function DateCard({ date, active, onClick, stagger, revealed, cached, setRef }) {
  const className = `cal-date ${active ? 'is-active' : ''}`
  const body = (
    <>
      <span className="cal-date-disc">{date.num}</span>
      <span className="cal-date-day">{date.day}</span>
    </>
  )

  if (stagger) {
    return (
      <RevealItem
        as="button"
        type="button"
        className={className}
        revealed={revealed}
        cached={cached}
        ref={setRef}
        onClick={onClick}
      >
        {body}
      </RevealItem>
    )
  }

  return (
    <button type="button" className={className} onClick={onClick}>
      {body}
    </button>
  )
}

export function DateStrip({ dates, selected, onSelect, stagger = false }) {
  const reveal = useStaggerReveal({ delay: stagger ? 180 : 0, dataset: stagger ? 'cal:strip' : false })

  return (
    <div className="cal-strip" ref={stagger ? reveal.containerRef : undefined}>
      {dates.map((date, i) => (
        <DateCard
          key={dateKey(date)}
          date={date}
          active={isSameDate(selected, date)}
          onClick={() => onSelect(date)}
          stagger={stagger}
          revealed={reveal.isRevealed(i)}
          cached={reveal.isCached}
          setRef={reveal.setItemRef(i)}
        />
      ))}
    </div>
  )
}

export function Chip({ active, onClick, children, className = '', disabled = false, ...rest }) {
  return (
    <button
      type="button"
      className={`cal-chip ${active ? 'is-active' : ''} ${disabled ? 'is-disabled' : ''} ${className}`.trim()}
      onClick={onClick}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  )
}

export function ChipRow({ items, value, onChange, equal = true, variant = 'chips' }) {
  const hasHours = items.some((item) => item.time)
  return (
    <div className={`cal-chip-row ${equal ? 'is-equal' : ''} ${hasHours ? 'has-hours' : ''} ${variant === 'segmented' ? 'is-segmented' : ''} ${variant === 'quiet' ? 'is-quiet' : ''}`}>
      {items.map((item) => (
        <Chip
          key={item.id}
          className={item.time ? 'has-time' : ''}
          active={value === item.id}
          onClick={() => onChange(item.id)}
        >
          <ChipInner item={item} />
        </Chip>
      ))}
    </div>
  )
}

export function PeriodChips({ value, onChange, showHours = false, quiet = false }) {
  return (
    <ChipRow
      items={showHours ? AVAILABILITY_PERIODS : DAY_PERIODS}
      value={value}
      onChange={onChange}
      variant={quiet ? 'quiet' : 'chips'}
    />
  )
}

export function SlotGrid({ slots, value, onChange, getMeta }) {
  return (
    <div className="cal-slot-grid">
      {slots.map((slot) => {
        const meta = getMeta?.(slot) || {}
        const unavailable = Boolean(meta.disabled)
        return (
          <Chip
            key={slot}
            className={`cal-slot ${meta.quick ? 'is-quick' : ''}`}
            active={value === slot}
            disabled={unavailable}
            aria-label={unavailable ? `${slot}, unavailable` : slot}
            onClick={() => onChange(slot)}
          >
            <span className="cal-slot-time">{slot}</span>
            {meta.quick && !unavailable ? <span className="cal-slot-quick">Quick</span> : null}
          </Chip>
        )
      })}
    </div>
  )
}

function yearPageStart(year) {
  return year - (year % 12)
}

function dayDisabled(year, month, day, minDate, maxDate) {
  if (!day) return true
  const date = startOfDay(new Date(year, month, day))
  if (minDate && date < startOfDay(minDate)) return true
  if (maxDate && date > startOfDay(maxDate)) return true
  return false
}

function adjacentMonth(year, month, step) {
  const date = new Date(year, month + step, 1)
  return { year: date.getFullYear(), month: date.getMonth() }
}

function CalendarBottomSheet({
  open,
  closing = false,
  onClose,
  selectedDate,
  onSelect,
  minDate,
  maxDate,
  minYear = 1920,
  maxYear,
  variant = 'booking',
  initialView = 'days',
}) {
  const today = new Date()
  const rangeMin = minDate ? startOfDay(minDate) : null
  const rangeMax = maxDate ? startOfDay(maxDate) : null
  const capYear = maxYear ?? (rangeMax ? rangeMax.getFullYear() : today.getFullYear() + 2)
  const floorYear = rangeMin ? rangeMin.getFullYear() : minYear
  const availableYears = rangeMin && rangeMax
    ? yearsInRange(rangeMin, rangeMax)
    : Array.from({ length: capYear - floorYear + 1 }, (_, i) => floorYear + i)
  const yearChoices = availableYears.length ? availableYears : [today.getFullYear()]
  const showYearPicker = variant === 'birth' || yearChoices.length > 1

  const initialYear = selectedDate?.full?.getFullYear?.() ?? yearChoices[0]
  const clampedYear = Math.min(capYear, Math.max(floorYear, initialYear))
  const initialMonth = selectedDate?.full?.getMonth?.() ?? today.getMonth()
  const firstOpenMonth = monthOverlapsRange(clampedYear, initialMonth, rangeMin, rangeMax)
    ? initialMonth
    : (monthsInRange(clampedYear, rangeMin, rangeMax)[0]?.month ?? initialMonth)

  const [view, setView] = useState(initialView)
  const [calMonth, setCalMonth] = useState(firstOpenMonth)
  const [calYear, setCalYear] = useState(clampedYear)
  const [yearStart, setYearStart] = useState(yearPageStart(clampedYear))
  const calDays = monthGrid(calYear, calMonth)
  const visibleMonths = monthsInRange(calYear, rangeMin, rangeMax)
  const birthYears = Array.from({ length: 12 }, (_, i) => yearStart + i).filter((year) => year >= floorYear && year <= capYear)
  const years = variant === 'booking' ? yearChoices : birthYears

  const canStepMonth = (step) => {
    const next = adjacentMonth(calYear, calMonth, step)
    if (next.year < floorYear || next.year > capYear) return false
    return monthOverlapsRange(next.year, next.month, rangeMin, rangeMax)
  }

  const canStepYear = (step) => yearChoices.includes(calYear + step) || (variant === 'birth' && calYear + step >= floorYear && calYear + step <= capYear)

  const canPrev = view === 'years'
    ? (variant === 'birth' && yearStart > floorYear)
    : view === 'months'
      ? canStepYear(-1)
      : canStepMonth(-1)

  const canNext = view === 'years'
    ? (variant === 'birth' && yearStart + 12 <= capYear)
    : view === 'months'
      ? canStepYear(1)
      : canStepMonth(1)

  const goPrev = () => {
    if (!canPrev) return
    if (view === 'years') {
      setYearStart((start) => Math.max(floorYear, start - 12))
      return
    }
    if (view === 'months') {
      setCalYear((year) => year - 1)
      return
    }
    const next = adjacentMonth(calYear, calMonth, -1)
    setCalYear(next.year)
    setCalMonth(next.month)
  }

  const goNext = () => {
    if (!canNext) return
    if (view === 'years') {
      setYearStart((start) => start + 12)
      return
    }
    if (view === 'months') {
      setCalYear((year) => year + 1)
      return
    }
    const next = adjacentMonth(calYear, calMonth, 1)
    setCalYear(next.year)
    setCalMonth(next.month)
  }

  const handleDay = (day) => {
    if (dayDisabled(calYear, calMonth, day, rangeMin, rangeMax)) return
    onSelect(makeDateValue(new Date(calYear, calMonth, day)))
  }

  const handleYear = (year) => {
    setCalYear(year)
    const months = monthsInRange(year, rangeMin, rangeMax)
    if (months.length && !months.some((item) => item.month === calMonth)) {
      setCalMonth(months[0].month)
    }
    setView('months')
  }

  const handleMonth = (month) => {
    setCalMonth(month)
    setView('days')
  }

  const monthLabel = MONTH_NAMES[calMonth]
  const navLabel = view === 'years' ? 'years' : view === 'months' ? 'year' : 'month'

  return (
    <AppBottomSheet
      open={open}
      closing={closing}
      onClose={onClose}
      sheetClassName="cal-sheet"
      labelledBy="cal-sheet-title"
    >
      <div className="cal-sheet-header">
        <button type="button" className="cal-sheet-nav" onClick={goPrev} aria-label={`Previous ${navLabel}`} disabled={!canPrev}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h3 className="cal-sheet-title" id="cal-sheet-title">
          {view === 'years' ? (
            <span>{years[0]}{years.length > 1 ? `–${years[years.length - 1]}` : ''}</span>
          ) : view === 'months' ? (
            showYearPicker ? (
              <button type="button" className="cal-sheet-title-btn" onClick={() => setView('years')}>
                {calYear}
              </button>
            ) : (
              <span>{calYear}</span>
            )
          ) : (
            <>
              <button type="button" className="cal-sheet-title-btn" onClick={() => setView('months')}>
                {monthLabel}
              </button>
              {showYearPicker ? (
                <button type="button" className="cal-sheet-title-btn" onClick={() => setView('years')}>
                  {calYear}
                </button>
              ) : (
                <span>{calYear}</span>
              )}
            </>
          )}
        </h3>
        <button type="button" className="cal-sheet-nav" onClick={goNext} aria-label={`Next ${navLabel}`} disabled={!canNext}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      <div className={`cal-sheet-body is-${view}`}>
        {view === 'years' && (
          <div className="cal-picker-grid is-years">
            {years.map((year) => (
              <button
                type="button"
                key={year}
                className={`cal-picker-cell ${calYear === year ? 'is-active' : ''}`}
                onClick={() => handleYear(year)}
              >
                {year}
              </button>
            ))}
          </div>
        )}

        {view === 'months' && (
          <div className="cal-picker-grid is-months">
            {(variant === 'booking' ? visibleMonths : MONTH_SHORT.map((label, month) => ({ label, month }))).map((item) => (
              <button
                type="button"
                key={item.label}
                className={`cal-picker-cell ${calMonth === item.month ? 'is-active' : ''}`}
                onClick={() => handleMonth(item.month)}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

        {view === 'days' && (
          <>
            <div className="cal-weekdays">
              {WEEKDAYS.map((d) => (
                <div className="cal-weekday" key={d}>{d}</div>
              ))}
            </div>
            <div className="cal-month">
              {calDays.map((day, idx) => {
                const disabled = dayDisabled(calYear, calMonth, day, rangeMin, rangeMax)
                const active = Boolean(
                  day &&
                  selectedDate?.full &&
                  selectedDate.num === day &&
                  selectedDate.full.getMonth() === calMonth &&
                  selectedDate.full.getFullYear() === calYear
                )
                return (
                  <button
                    type="button"
                    key={idx}
                    className={`cal-month-day ${!day ? 'is-empty' : ''} ${active ? 'is-active' : ''}`}
                    onClick={() => handleDay(day)}
                    disabled={!day || disabled}
                  >
                    {day}
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>

      <button type="button" className="cal-sheet-done" onClick={onClose}>
        Done
      </button>
    </AppBottomSheet>
  )
}

export { CalendarBottomSheet }

export function DatePicker({
  selectedDate,
  onSelect,
  showFullCalendar = true,
  count = 7,
  offset = 0,
  stagger = true,
  density = 'default',
}) {
  const [dates, setDates] = useState(() => (
    selectedDate
      ? stripDatesForSelection(selectedDate, { count })
      : generateDates({ count, offset })
  ))
  const { isPresented, isClosing, show, hide } = useAppSheet()
  useScrollLock('profile', isPresented)
  const range = bookingRange()

  useEffect(() => {
    if (!selectedDate) return
    setDates((current) => (
      current.some((date) => isSameDate(date, selectedDate))
        ? current
        : stripDatesForSelection(selectedDate, { count })
    ))
  }, [selectedDate, count])

  const pickDate = (next) => {
    setDates((current) => (
      current.some((date) => isSameDate(date, next))
        ? current
        : stripDatesForSelection(next, { count })
    ))
    onSelect(next)
  }

  return (
    <div className={`cal-picker ${density === 'compact' ? 'is-compact' : ''}`}>
      <div className="cal-picker-header">
        <div className="cal-picker-title">{selectedDate?.monthLong} {selectedDate?.year}</div>
        {showFullCalendar && (
          <button type="button" className="cal-picker-more" onClick={show}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Show more dates
          </button>
        )}
      </div>
      <DateStrip dates={dates} selected={selectedDate} onSelect={pickDate} stagger={stagger} />

      {isPresented ? (
        <CalendarBottomSheet
          open
          closing={isClosing}
          selectedDate={selectedDate}
          variant="booking"
          minDate={range.minDate}
          maxDate={range.maxDate}
          onSelect={(next) => {
            pickDate(next)
            hide()
          }}
          onClose={hide}
        />
      ) : null}
    </div>
  )
}

export function BirthDateField({ value, onChange }) {
  const { isPresented, isClosing, show, hide } = useAppSheet()
  useScrollLock('profile', isPresented)
  const selected = value ? makeDateValue(parseIsoDate(value)) : null
  const display = formatDisplayDate(value)

  return (
    <>
      <button type="button" className="cal-dob-field" onClick={show}>
        <span className={display ? '' : 'is-placeholder'}>{display || 'dd/mm/yyyy'}</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </button>
      {isPresented ? (
        <CalendarBottomSheet
          open
          closing={isClosing}
          selectedDate={selected}
          variant="birth"
          initialView={selected ? 'days' : 'years'}
          minDate={new Date(1920, 0, 1)}
          maxDate={new Date()}
          minYear={1920}
          maxYear={new Date().getFullYear()}
          onSelect={(next) => {
            onChange(toIsoDate(next))
            hide()
          }}
          onClose={hide}
        />
      ) : null}
    </>
  )
}

export default DatePicker
