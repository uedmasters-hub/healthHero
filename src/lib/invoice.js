import { formatMoney } from './paymentSession'
import { displayDoctorName } from './geometry'

function asDate(value) {
  if (!value) return null
  if (value instanceof Date) return value
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export function buildInvoiceFromBooking(booking) {
  if (!booking) return null
  const payment = booking.payment || {}
  const doctor = booking.doctor || {}
  const patient = booking.patient || {}
  const paidAt = asDate(payment.paidAt) || new Date()
  const amount = Number(payment.amount ?? doctor.fee ?? 0)
  const consultationFee = Number(payment.consultationFee ?? amount)
  const taxes = Number(payment.taxes ?? 0)
  const discount = Number(payment.discount ?? 0)
  const total = Number(payment.amount ?? consultationFee + taxes - discount)

  return {
    bookingId: payment.bookingId || payment.orderId || `BK-${doctor.id || 'HH'}`,
    paymentId: payment.paymentId || payment.orderId || `PAY-${Date.now().toString().slice(-8)}`,
    orderId: payment.orderId || null,
    status: payment.status === 'paid' || payment.status === 'Paid' ? 'Paid' : (payment.status || 'Paid'),
    paidAt,
    method: payment.method || 'Card',
    currency: payment.currency || 'INR',
    doctor: {
      name: displayDoctorName(doctor.name),
      specialty: doctor.specialty || 'Specialist',
      address: doctor.address || '',
    },
    patient: {
      name: patient.name || 'Patient',
      relationship: patient.relationship || 'Self',
      phone: patient.phone || '',
      age: patient.age,
    },
    visit: {
      dateLabel: (() => {
        const full = booking.date?.full ? asDate(booking.date.full) : null
        if (full) {
          return full.toLocaleDateString('en-IN', {
            weekday: 'long',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })
        }
        return booking.date?.dayName || booking.date?.day || null
      })(),
      time: booking.time,
      visitType: booking.visitType || 'In-Person',
      duration: booking.duration || '30 min',
    },
    breakdown: [
      { label: 'Consultation fee', amount: consultationFee },
      ...(taxes > 0 ? [{ label: 'Taxes & fees', amount: taxes }] : []),
      ...(discount > 0 ? [{ label: 'Discount', amount: -discount }] : []),
    ],
    total,
  }
}

export function formatInvoiceDateTime(date) {
  const d = asDate(date)
  if (!d) return '—'
  return d.toLocaleString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export function invoiceToPlainText(invoice) {
  if (!invoice) return ''
  const lines = [
    'HealthHero Invoice',
    `Booking ID: ${invoice.bookingId}`,
    `Payment ID: ${invoice.paymentId}`,
    `Date: ${formatInvoiceDateTime(invoice.paidAt)}`,
    `Status: ${invoice.status}`,
    '',
    `Doctor: ${invoice.doctor.name}`,
    `Specialty: ${invoice.doctor.specialty}`,
    invoice.doctor.address ? `Clinic: ${invoice.doctor.address}` : null,
    '',
    `Patient: ${invoice.patient.name}`,
    `Relationship: ${invoice.patient.relationship}`,
    invoice.patient.phone ? `Contact: ${invoice.patient.phone}` : null,
    '',
    `Payment method: ${invoice.method}`,
    ...invoice.breakdown.map((row) => `${row.label}: ${formatMoney(row.amount, invoice.currency)}`),
    `Total paid: ${formatMoney(invoice.total, invoice.currency)}`,
  ].filter(Boolean)
  return lines.join('\n')
}

export async function downloadInvoiceText(invoice) {
  const text = invoiceToPlainText(invoice)
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `healthhero-invoice-${invoice.bookingId}.txt`
  link.click()
  URL.revokeObjectURL(url)
}

export async function shareInvoice(invoice) {
  const text = invoiceToPlainText(invoice)
  try {
    if (navigator.share) {
      await navigator.share({
        title: `HealthHero Invoice ${invoice.bookingId}`,
        text,
      })
      return 'shared'
    }
  } catch {
    return 'cancelled'
  }
  try {
    await navigator.clipboard.writeText(text)
    return 'copied'
  } catch {
    return 'failed'
  }
}
