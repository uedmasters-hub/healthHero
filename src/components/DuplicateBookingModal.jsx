import { SheetPortal } from './PageTransition'
import { useAppScrim } from './AppScrim'
import { duplicateBookingCopy } from '../lib/duplicateBooking'

export default function DuplicateBookingModal({ booking, onView, onBookSomeoneElse, onClose }) {
  useAppScrim(Boolean(booking))
  if (!booking) return null

  return (
    <SheetPortal to="screen">
      <div className="ds-dialog-overlay" onClick={onClose} role="presentation">
        <div
          className="ds-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dup-title"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 id="dup-title" className="ds-dialog__title">Upcoming appointment</h3>
          <p className="ds-dialog__copy">{duplicateBookingCopy(booking)}</p>
          <div className="ds-dialog__actions">
            <button type="button" className="ds-btn ds-btn--primary ds-btn--lg" onClick={onView}>
              View Appointment
            </button>
            <button type="button" className="ds-btn ds-btn--secondary ds-btn--lg" onClick={onBookSomeoneElse}>
              Book for Someone Else
            </button>
          </div>
        </div>
      </div>
    </SheetPortal>
  )
}
