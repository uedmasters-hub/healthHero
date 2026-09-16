import { SheetPortal } from './PageTransition'
import { duplicateBookingCopy } from '../lib/duplicateBooking'
import './DuplicateBookingModal.css'

export default function DuplicateBookingModal({ booking, onView, onBookSomeoneElse, onClose }) {
  if (!booking) return null

  return (
    <SheetPortal>
      <div className="dup-overlay" onClick={onClose} role="presentation">
        <div
          className="dup-modal"
          role="dialog"
          aria-labelledby="dup-title"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 id="dup-title">Upcoming appointment</h3>
          <p>{duplicateBookingCopy(booking)}</p>
          <button type="button" className="dup-primary" onClick={onView}>
            View Appointment
          </button>
          <button type="button" className="dup-secondary" onClick={onBookSomeoneElse}>
            Book for Someone Else
          </button>
        </div>
      </div>
    </SheetPortal>
  )
}
