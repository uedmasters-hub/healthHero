import { useMemo, useState } from 'react'
import AppBottomSheet from './AppBottomSheet'
import { formatMoney } from '../lib/paymentSession'
import {
  buildInvoiceFromBooking,
  downloadInvoiceText,
  formatInvoiceDateTime,
  shareInvoice,
} from '../lib/invoice'
import './BookingInvoiceSheet.css'

export default function BookingInvoiceSheet({
  open,
  closing = false,
  onClose,
  booking,
}) {
  const invoice = useMemo(() => buildInvoiceFromBooking(booking), [booking])
  const [shareNote, setShareNote] = useState('')

  if (!open || !invoice) return null

  const handleDownload = async () => {
    await downloadInvoiceText(invoice)
    setShareNote('Invoice downloaded')
  }

  const handleShare = async () => {
    const result = await shareInvoice(invoice)
    if (result === 'shared') setShareNote('Invoice shared')
    else if (result === 'copied') setShareNote('Invoice copied to clipboard')
    else if (result === 'failed') setShareNote('Unable to share invoice')
  }

  return (
    <AppBottomSheet
      open={open}
      closing={closing}
      onClose={onClose}
      labelledBy="invoice-sheet-title"
      sheetClassName="invoice-sheet"
      className="is-blurred"
      dismissOnSwipe
    >
      <div className="ds-sheet-header">
        <h3 id="invoice-sheet-title">Invoice</h3>
        <button type="button" className="ds-sheet-close" onClick={onClose} aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="invoice-sheet-body">
        <div className="invoice-status-row">
          <span className={`invoice-status is-${String(invoice.status).toLowerCase()}`}>{invoice.status}</span>
          <span className="invoice-paid-at">{formatInvoiceDateTime(invoice.paidAt)}</span>
        </div>

        <div className="invoice-ids">
          <div>
            <span className="invoice-label">Booking ID</span>
            <strong>{invoice.bookingId}</strong>
          </div>
          <div>
            <span className="invoice-label">Payment ID</span>
            <strong>{invoice.paymentId}</strong>
          </div>
        </div>

        <section className="invoice-section">
          <h4>Doctor</h4>
          <p className="invoice-primary">{invoice.doctor.name}</p>
          <p className="invoice-secondary">{invoice.doctor.specialty}</p>
          {invoice.doctor.address ? <p className="invoice-secondary">{invoice.doctor.address}</p> : null}
        </section>

        <section className="invoice-section">
          <h4>Patient</h4>
          <p className="invoice-primary">{invoice.patient.name}</p>
          <p className="invoice-secondary">
            {invoice.patient.relationship}
            {invoice.patient.age != null ? ` · ${invoice.patient.age} yrs` : ''}
          </p>
          {invoice.patient.phone ? <p className="invoice-secondary">{invoice.patient.phone}</p> : null}
        </section>

        <section className="invoice-section">
          <h4>Visit</h4>
          <p className="invoice-primary">
            {[invoice.visit?.dateLabel, invoice.visit?.time].filter(Boolean).join(' · ') || 'Scheduled visit'}
          </p>
          <p className="invoice-secondary">
            {[invoice.visit?.visitType, invoice.visit?.duration].filter(Boolean).join(' · ')}
          </p>
        </section>

        <section className="invoice-section">
          <h4>Payment method</h4>
          <p className="invoice-primary">{invoice.method}</p>
        </section>

        <section className="invoice-section">
          <h4>Fee breakdown</h4>
          <div className="invoice-breakdown">
            {invoice.breakdown.map((row) => (
              <div key={row.label} className="invoice-row">
                <span>{row.label}</span>
                <strong>{formatMoney(row.amount, invoice.currency)}</strong>
              </div>
            ))}
            <div className="invoice-row is-total">
              <span>Total amount paid</span>
              <strong>{formatMoney(invoice.total, invoice.currency)}</strong>
            </div>
          </div>
        </section>

        {shareNote ? <p className="invoice-toast" role="status">{shareNote}</p> : null}
      </div>

      <div className="invoice-actions">
        <button type="button" className="invoice-btn is-primary" onClick={handleDownload}>
          Download
        </button>
        <button type="button" className="invoice-btn is-secondary" onClick={handleShare}>
          Share
        </button>
        <button type="button" className="invoice-btn is-ghost" onClick={onClose}>
          Close
        </button>
      </div>
    </AppBottomSheet>
  )
}
