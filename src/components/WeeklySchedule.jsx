import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { ChipRow, DatePicker, SlotGrid, VISIT_TYPES } from './DatePicker'
import {
  FALLBACK_SCHEDULE_SLOTS,
  bookableSlots,
  dateHasBookableSlots,
  findEarliestAvailableDate,
  localIsoDate,
  periodsWithBookableSlots,
  slotsForDate,
  visitSlotAvailability,
} from '../lib/slotAvailability'
import { BOOKING_HORIZON_DAYS, isSameDate } from './calendar/dates'
import { fetchProviderSchedule, subscribeAvailability } from '../features/providers'
import useNow from '../hooks/useNow'
import './WeeklySchedule.css'

/** @deprecated Prefer FALLBACK_SCHEDULE_SLOTS from slotAvailability */
export const WEEKLY_SCHEDULE_SLOTS = FALLBACK_SCHEDULE_SLOTS

const REFRESH_MS = 60_000

/**
 * Shared Weekly Schedule — identical on Doctor Profile, Choose Date & Time, and Reschedule.
 * Availability-first: opens on the earliest bookable day and stays synced with live slots.
 */
export default function WeeklySchedule({
  title = null,
  doctorId,
  visitType,
  onVisitTypeChange,
  visitTypeItems = VISIT_TYPES,
  selectedDate,
  onDateChange,
  selectedTime,
  onTimeChange,
  getMeta,
  className = '',
  lockVisitType = false,
}) {
  const periodDomId = useId()
  const now = useNow(15_000)
  const [schedule, setSchedule] = useState(null)
  const autoKeyRef = useRef('')

  const loadAvailability = useCallback(async () => {
    if (doctorId == null) {
      setSchedule({ slots: [], remote: true })
      return
    }
    const next = await fetchProviderSchedule(doctorId, { days: BOOKING_HORIZON_DAYS })
    setSchedule(next)
  }, [doctorId])

  useEffect(() => {
    let cancelled = false
    loadAvailability().then(() => {
      if (cancelled) return
    })
    const onVis = () => {
      if (document.visibilityState === 'visible') loadAvailability()
    }
    document.addEventListener('visibilitychange', onVis)
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') loadAvailability()
    }, REFRESH_MS)
    const unsubscribe = subscribeAvailability(() => {
      if (!cancelled) loadAvailability()
    })
    return () => {
      cancelled = true
      unsubscribe()
      document.removeEventListener('visibilitychange', onVis)
      window.clearInterval(timer)
    }
  }, [loadAvailability])

  const liveRows = schedule?.slots ?? null
  const hasRemoteSchedule = schedule?.remote === true

  const liveTimes = useMemo(() => {
    if (liveRows == null) return null
    const byDate = new Map()
    liveRows.forEach((row) => {
      if (visitType && row.visitType && row.visitType !== visitType) return
      const key = row.date
      const list = byDate.get(key) || []
      if (!list.includes(row.time)) list.push(row.time)
      byDate.set(key, list)
    })
    return byDate
  }, [liveRows, visitType])

  const scheduleSlots = useMemo(() => {
    if (liveTimes == null) return []
    const { slots } = slotsForDate({
      liveTimes,
      hasRemoteSchedule,
      date: selectedDate,
      fallbackSlots: [],
    })
    return slots
  }, [liveTimes, hasRemoteSchedule, selectedDate])

  const openSlots = useMemo(
    () => visitSlotAvailability({
      doctorId,
      date: selectedDate,
      visitType,
      slots: scheduleSlots,
    }),
    [doctorId, selectedDate, visitType, scheduleSlots],
  )

  const resolveMeta = useCallback((slot) => {
    const parent = getMeta?.(slot) || {}
    const visitClosed = doctorId != null && !openSlots.has(slot)
    return {
      ...parent,
      disabled: Boolean(parent.disabled || visitClosed),
    }
  }, [getMeta, doctorId, openSlots])

  const visiblePeriods = useMemo(
    () => periodsWithBookableSlots({
      slots: scheduleSlots,
      doctorId,
      date: selectedDate,
      visitType,
      now,
    }),
    [scheduleSlots, doctorId, selectedDate, visitType, now],
  )

  const isDateUnavailable = useCallback((date) => {
    if (liveTimes == null) return false
    return !dateHasBookableSlots({
      doctorId,
      date,
      visitType,
      liveTimes,
      hasRemoteSchedule,
      fallbackSlots: [],
      now,
    })
  }, [liveTimes, hasRemoteSchedule, doctorId, visitType, now])

  // Availability-first: jump off empty days onto the earliest bookable date.
  useEffect(() => {
    if (liveTimes == null) return
    const earliest = findEarliestAvailableDate({
      doctorId,
      visitType,
      liveTimes,
      hasRemoteSchedule,
      fallbackSlots: [],
      now,
    })
    if (!earliest) return

    const selectedBookable = selectedDate
      ? bookableSlots({
        doctorId,
        date: selectedDate,
        visitType,
        slots: slotsForDate({ liveTimes, hasRemoteSchedule, date: selectedDate, fallbackSlots: [] }).slots,
        now,
      })
      : []

    if (!selectedDate || selectedBookable.length === 0) {
      const key = `${doctorId}|${visitType}|${localIsoDate(earliest)}`
      if (autoKeyRef.current === key && selectedDate && isSameDate(selectedDate, earliest)) {
        return
      }
      autoKeyRef.current = key
      if (!selectedDate || !isSameDate(selectedDate, earliest)) {
        onDateChange?.(earliest)
        onTimeChange?.(null)
      }
    }
  }, [
    liveTimes,
    hasRemoteSchedule,
    doctorId,
    visitType,
    selectedDate,
    now,
    onDateChange,
    onTimeChange,
  ])

  const selectedDisabled = selectedTime ? resolveMeta(selectedTime).disabled : false

  useEffect(() => {
    if (selectedTime && selectedDisabled) onTimeChange?.(null)
  }, [selectedTime, selectedDisabled, onTimeChange])

  const availabilityContext = useMemo(() => ({
    doctorId,
    visitType,
    liveTimes,
    hasRemoteSchedule,
    fallbackSlots: [],
    now,
  }), [doctorId, visitType, liveTimes, hasRemoteSchedule, now])

  return (
    <div className={`weekly-schedule ${className}`.trim()}>
      {title ? <div className="weekly-schedule-label">{title}</div> : null}
      <div className="weekly-schedule-body">
        {lockVisitType ? null : (
          <ChipRow
            variant="segmented"
            items={visitTypeItems}
            value={visitType}
            onChange={onVisitTypeChange}
          />
        )}
        <DatePicker
          selectedDate={selectedDate}
          onSelect={onDateChange}
          stagger={false}
          density="compact"
          isDateUnavailable={isDateUnavailable}
          availabilityContext={availabilityContext}
        />
        <div className="weekly-slot-periods">
          {visiblePeriods.length === 0 ? (
            <p className="weekly-slot-empty" role="status">
              {schedule == null
                ? 'Availability is loading from the clinic schedule.'
                : 'No open times for this visit. Choose another date, or this doctor is unavailable.'}
            </p>
          ) : (
            visiblePeriods.map((period) => {
              const headingId = `${periodDomId}-${period.id}`
              return (
                <section
                  key={period.id}
                  className="weekly-slot-period"
                  aria-labelledby={headingId}
                >
                  <div className="weekly-slot-period-head">
                    <div id={headingId} className="ds-overline weekly-slot-period-label">
                      {period.label}
                    </div>
                    <span className="weekly-slot-period-count">
                      {`${period.slots.length} available`}
                    </span>
                  </div>
                  <SlotGrid
                    slots={period.slots}
                    value={selectedTime}
                    onChange={onTimeChange}
                    getMeta={resolveMeta}
                  />
                </section>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
