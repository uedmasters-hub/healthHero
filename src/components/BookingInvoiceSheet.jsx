import { useMemo, useState } from 'react'
import AppBottomSheet from './AppBottomSheet'
import { formatMoney } from '../lib/paymentSession'
import {
  buildInvoiceFromBooking,
  downloadInvoiceText,
  formatInvoiceDateTime,
  shareInvoice,
} from '../lib/invoice'
import { Badge, Button, Callout, DetailRow, Icon, InfoCell, InfoGrid, List, SheetHeader } from './ui'
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
      <SheetHeader titleId="invoice-sheet-title" title="Invoice" onClose={onClose} />

      <div className="invoice-sheet-body">
        <div className="invoice-status-row">
          <Badge tone={String(invoice.status).toLowerCase() === 'paid' ? 'success' : 'neutral'}>{invoice.status}</Badge>
          <span className="ds-caption tnum">{formatInvoiceDateTime(invoice.paidAt)}</span>
        </div>

        <InfoGrid className="invoice-ids">
          <InfoCell label="Booking ID" value={invoice.bookingId} />
          <InfoCell label="Payment ID" value={invoice.paymentId} />
        </InfoGrid>

        <List className="invoice-parties">
          <DetailRow label="Doctor" value={invoice.doctor.name}>
            <span className="ds-list-row__sub">{[invoice.doctor.specialty, invoice.doctor.address].filter(Boolean).join(' · ')}</span>
          </DetailRow>
          <DetailRow label="Patient" value={invoice.patient.name}>
            <span className="ds-list-row__sub">
              {[invoice.patient.relationship, invoice.patient.age != null ? `${invoice.patient.age} yrs` : null, invoice.patient.phone].filter(Boolean).join(' · ')}
            </span>
          </DetailRow>
          <DetailRow
            label="Visit"
            value={[invoice.visit?.dateLabel, invoice.visit?.time].filter(Boolean).join(' · ') || 'Scheduled visit'}
          >
            <span className="ds-list-row__sub">{[invoice.visit?.visitType, invoice.visit?.duration].filter(Boolean).join(' · ')}</span>
          </DetailRow>
          <DetailRow label="Payment method" value={invoice.method} />
        </List>

        <section className="ds-card is-padded invoice-breakdown">
          <h4 className="ds-section-title">Fee breakdown</h4>
          <div className="ds-stack is-tight">
            {invoice.breakdown.map((row) => (
              <div key={row.label} className="ds-kv">
                <span className="ds-kv__key">{row.label}</span>
                <span className="ds-kv__value tnum">{formatMoney(row.amount, invoice.currency)}</span>
              </div>
            ))}
            <div className="ds-kv is-total">
              <span className="ds-kv__key">Total amount paid</span>
              <span className="ds-kv__value tnum">{formatMoney(invoice.total, invoice.currency)}</span>
            </div>
          </div>
        </section>

        {shareNote ? <Callout tone="success" role="status" className="invoice-toast">{shareNote}</Callout> : null}
      </div>

      <div className="ds-btn-row invoice-actions">
        <Button variant="ghost" onClick={onClose}>Close</Button>
        <Button variant="secondary" icon={<Icon.Share />} onClick={handleShare}>Share</Button>
        <Button icon={<Icon.Download />} onClick={handleDownload}>Download</Button>
      </div>
    </AppBottomSheet>
  )
}
