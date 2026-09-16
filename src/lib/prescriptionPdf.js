import { jsPDF } from 'jspdf'

const cache = new Map()

function wrapText(doc, text, x, y, maxWidth, lineHeight) {
  const lines = doc.splitTextToSize(text, maxWidth)
  lines.forEach((line, index) => {
    doc.text(line, x, y + index * lineHeight)
  })
  return y + lines.length * lineHeight
}

function drawPlusIcon(doc, x, y, size) {
  doc.setFillColor(37, 99, 235)
  doc.roundedRect(x, y, size, size, 2.2, 2.2, 'F')
  doc.setDrawColor(255, 255, 255)
  doc.setLineWidth(1.1)
  const cx = x + size / 2
  const cy = y + size / 2
  doc.line(cx, y + 3.2, cx, y + size - 3.2)
  doc.line(x + 3.2, cy, x + size - 3.2, cy)
}

function drawSignature(doc, x, y) {
  doc.setDrawColor(37, 99, 235)
  doc.setLineWidth(0.55)
  doc.setLineCap('round')
  doc.setLineJoin('round')
  doc.line(x, y + 4, x + 8, y - 2)
  doc.line(x + 8, y - 2, x + 14, y + 6)
  doc.line(x + 14, y + 6, x + 22, y - 1)
  doc.line(x + 22, y - 1, x + 32, y + 3)
  doc.line(x + 18, y + 1, x + 28, y + 8)
}

function buildPdf(rx) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true })
  const pageW = 210
  const pageH = 297
  const margin = 18
  const contentW = pageW - margin * 2
  let y = 20

  drawPlusIcon(doc, margin, y, 12)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(17, 24, 39)
  doc.text(rx.clinic.name, margin + 16, y + 5)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(75, 85, 99)
  doc.text(rx.clinic.address, margin + 16, y + 10)
  doc.text(`Ph: ${rx.clinic.phone}  •  ${rx.clinic.email}`, margin + 16, y + 15)

  y += 24
  doc.setDrawColor(229, 231, 235)
  doc.setLineWidth(0.3)
  doc.line(margin, y, pageW - margin, y)

  y += 10
  const colW = contentW / 2
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(107, 114, 128)
  doc.text('PATIENT INFO', margin, y)
  doc.text('PRESCRIBER', margin + colW, y)

  y += 6
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(17, 24, 39)
  doc.text(rx.patient.name, margin, y)
  doc.text(rx.prescriber.name, margin + colW, y)

  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(75, 85, 99)
  doc.text(`Age: ${rx.patient.age}  •  ${rx.patient.sex}`, margin, y)
  doc.text(rx.prescriber.specialty, margin + colW, y)
  y += 5
  doc.text(`Date: ${rx.patient.date}`, margin, y)
  doc.text(`Lic: ${rx.prescriber.license}`, margin + colW, y)

  y += 12
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(37, 99, 235)
  doc.text('NOTE', margin, y)

  y += 7
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(55, 65, 81)
  y = wrapText(doc, rx.note, margin, y, contentW, 5.2)

  y += 10
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(37, 99, 235)
  doc.text('Rx', margin, y)
  doc.setFontSize(9)
  doc.setTextColor(17, 24, 39)
  doc.text('PRESCRIBED MEDICATIONS', margin + 10, y)

  y += 6
  rx.medications.forEach((med) => {
    doc.setFillColor(249, 250, 251)
    const boxH = 16
    doc.roundedRect(margin, y, contentW, boxH, 2, 2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(17, 24, 39)
    doc.text(med.name, margin + 5, y + 6.5)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(75, 85, 99)
    doc.text(`${med.instructions}  •  Duration: ${med.duration}`, margin + 5, y + 12)
    y += boxH + 4
  })

  y = Math.max(y + 18, pageH - 52)
  drawSignature(doc, pageW - margin - 42, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(107, 114, 128)
  doc.text(`This prescription is valid for ${rx.validDays} days`, margin, y + 2)
  doc.text('from the date of issue.', margin, y + 6.5)
  doc.setDrawColor(209, 213, 219)
  doc.setLineWidth(0.25)
  doc.line(pageW - margin - 44, y + 10, pageW - margin, y + 10)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(17, 24, 39)
  doc.text(rx.prescriber.name, pageW - margin, y + 15, { align: 'right' })

  return doc
}

function cacheKey(rx) {
  return rx.id || JSON.stringify(rx)
}

export async function getPrescriptionPdf(rx) {
  const key = cacheKey(rx)
  const existing = cache.get(key)
  if (existing) return existing

  const doc = buildPdf(rx)
  const blob = doc.output('blob')
  const fileName = `Prescription-${(rx.patient?.name || 'Patient').replace(/\s+/g, '_')}.pdf`
  const file = new File([blob], fileName, { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const entry = { blob, file, url, fileName }
  cache.set(key, entry)
  return entry
}

export function downloadPrescriptionPdf(entry) {
  const link = document.createElement('a')
  link.href = entry.url
  link.download = entry.fileName
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
}

export async function sharePrescriptionPdf(entry, rx) {
  const payload = {
    files: [entry.file],
    title: 'Prescription',
    text: `Prescription from ${rx.clinic.name}`,
  }
  if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [entry.file] }))) {
    try {
      await navigator.share(payload)
      return
    } catch (error) {
      if (error?.name === 'AbortError') return
    }
  }
  downloadPrescriptionPdf(entry)
}

export function printPrescriptionPdf(entry) {
  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none'
  frame.src = entry.url
  document.body.appendChild(frame)
  const cleanup = () => {
    window.setTimeout(() => frame.remove(), 1500)
  }
  frame.addEventListener('load', () => {
    try {
      frame.contentWindow?.focus()
      frame.contentWindow?.print()
    } finally {
      cleanup()
    }
  })
}
