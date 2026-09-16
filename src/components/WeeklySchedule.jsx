import { useEffect, useId, useMemo } from 'react'
import { ChipRow, DatePicker, SlotGrid, VISIT_TYPES } from './DatePicker'
import { groupSlotsByPeriod, visitSlotAvailability } from '../lib/slotAvailability'
import './WeeklySchedule.css'

/** Canonical weekly time slots — Doctor Profile is the source of truth. */
export const WEEKLY_SCHEDULE_SLOTS = [
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '1:30 PM',
  '3:00 PM',
  '4:00 PM',
  '6:00 PM',
  '9:00 PM',
]

/**
 * Shared Weekly Schedule — identical on Doctor Profile, Choose Date & Time, and Reschedule.
 * Segmented appointment type, compact date strip, and time-of-day slot groups.
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
}) {
  const periodDomId = useId()
  const periods = useMemo(() => groupSlotsByPeriod(WEEKLY_SCHEDULE_SLOTS), [])
  const openSlots = useMemo(
    () => visitSlotAvailability({
      doctorId,
      date: selectedDate,
      visitType,
      slots: WEEKLY_SCHEDULE_SLOTS,
    }),
    [doctorId, selectedDate, visitType],
  )

  const resolveMeta = (slot) => {
    const parent = getMeta?.(slot) || {}
    const visitClosed = doctorId != null && !openSlots.has(slot)
    return {
      ...parent,
      disabled: Boolean(parent.disabled || visitClosed),
    }
  }

  const selectedDisabled = selectedTime ? resolveMeta(selectedTime).disabled : false

  useEffect(() => {
    if (selectedTime && selectedDisabled) onTimeChange?.(null)
  }, [selectedTime, selectedDisabled, onTimeChange])

  return (
    <div className={`weekly-schedule ${className}`.trim()}>
      {title ? <div className="weekly-schedule-label">{title}</div> : null}
      <div className="weekly-schedule-body">
        <ChipRow
          variant="segmented"
          items={visitTypeItems}
          value={visitType}
          onChange={onVisitTypeChange}
        />
        <DatePicker
          selectedDate={selectedDate}
          onSelect={onDateChange}
          stagger={false}
          density="compact"
        />
        <div className="weekly-slot-periods">
          {periods.map((period) => {
            const headingId = `${periodDomId}-${period.id}`
            const openCount = period.slots.filter((slot) => !resolveMeta(slot).disabled).length
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
                    {openCount === 0 ? 'None available' : `${openCount} available`}
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
          })}
        </div>
      </div>
    </div>
  )
}
