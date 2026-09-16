import { useCallback, useEffect, useRef, useState } from 'react'
import { SheetPortal } from './PageTransition'
import {
  downloadPrescriptionPdf,
  getPrescriptionPdf,
  printPrescriptionPdf,
  sharePrescriptionPdf,
} from '../lib/prescriptionPdf'
import './PrescriptionLightbox.css'

function ActionIcon({ name }) {
  if (name === 'download') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    )
  }
  if (name === 'share') {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
      </svg>
    )
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  )
}

export default function PrescriptionLightbox({ prescription, isPresented, isClosing, onClose }) {
  const [busy, setBusy] = useState(null)

  useEffect(() => {
    if (!isPresented || !prescription) return undefined
    getPrescriptionPdf(prescription).catch(() => {})
    return undefined
  }, [isPresented, prescription])

  useEffect(() => {
    const screen = document.getElementById('phone-screen')
    if (!isPresented || !screen) return undefined
    screen.classList.add('rx-open')
    return () => screen.classList.remove('rx-open')
  }, [isPresented])

  if (!isPresented || !prescription) return null

  const runPdfAction = async (action) => {
    if (busy) return
    setBusy(action)
    try {
      const entry = await getPrescriptionPdf(prescription)
      if (action === 'download') downloadPrescriptionPdf(entry)
      if (action === 'share') await sharePrescriptionPdf(entry, prescription)
      if (action === 'print') printPrescriptionPdf(entry)
    } finally {
      setBusy(null)
    }
  }

  return (
    <SheetPortal to="screen">
      <div className={`rx-overlay ${isClosing ? 'is-closing' : ''}`}>
        <div className="rx-header">
          <div className="rx-header-spacer" />
          <h2 className="rx-title">Prescription</h2>
          <button type="button" className="rx-close" onClick={onClose} aria-label="Close prescription">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="rx-preview-scroll">
          <article className="rx-card">
            <div className="rx-clinic">
              <div className="rx-clinic-mark" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="3" />
                  <path d="M12 8v8M8 12h8" />
                </svg>
              </div>
              <div>
                <div className="rx-clinic-name">{prescription.clinic.name}</div>
                <div className="rx-clinic-meta">{prescription.clinic.address}</div>
                <div className="rx-clinic-meta">Ph: {prescription.clinic.phone} • {prescription.clinic.email}</div>
              </div>
            </div>

            <div className="rx-parties">
              <div>
                <div className="rx-kicker">Patient info</div>
                <div className="rx-party-name">{prescription.patient.name}</div>
                <div className="rx-party-meta">Age: {prescription.patient.age} • {prescription.patient.sex}</div>
                <div className="rx-party-meta">Date: {prescription.patient.date}</div>
              </div>
              <div>
                <div className="rx-kicker">Prescriber</div>
                <div className="rx-party-name">{prescription.prescriber.name}</div>
                <div className="rx-party-meta">{prescription.prescriber.specialty}</div>
                <div className="rx-party-meta">Lic: {prescription.prescriber.license}</div>
              </div>
            </div>

            <div className="rx-note-block">
              <div className="rx-kicker rx-kicker-note">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                Note
              </div>
              <p className="rx-note-text">{prescription.note}</p>
            </div>

            <div className="rx-meds-block">
              <div className="rx-kicker rx-kicker-rx">
                <span className="rx-symbol">Rx</span>
                Prescribed medications
              </div>
              <div className="rx-med-list">
                {prescription.medications.map((med) => (
                  <div className="rx-med" key={med.name}>
                    <div className="rx-med-name">{med.name}</div>
                    <div className="rx-med-meta">{med.instructions} • Duration: {med.duration}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rx-footer">
              <p className="rx-legal">This prescription is valid for {prescription.validDays} days from the date of issue.</p>
              <div className="rx-sign">
                <svg className="rx-sign-mark" viewBox="0 0 72 28" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round">
                  <path d="M4 18 C14 4 18 22 28 10 C34 4 40 20 50 12 C56 8 62 16 68 14" />
                </svg>
                <div className="rx-sign-name">{prescription.prescriber.name}</div>
              </div>
            </div>
          </article>
        </div>

        <div className="rx-actions">
          <button type="button" className="rx-action is-primary" onClick={() => runPdfAction('download')} disabled={Boolean(busy)}>
            <ActionIcon name="download" />
            {busy === 'download' ? 'Preparing…' : 'Download'}
          </button>
          <button type="button" className="rx-action" onClick={() => runPdfAction('share')} disabled={Boolean(busy)}>
            <ActionIcon name="share" />
            {busy === 'share' ? 'Sharing…' : 'Share'}
          </button>
          <button type="button" className="rx-action" onClick={() => runPdfAction('print')} disabled={Boolean(busy)}>
            <ActionIcon name="print" />
            {busy === 'print' ? 'Opening…' : 'Print'}
          </button>
        </div>
      </div>
    </SheetPortal>
  )
}

export function usePrescriptionLightbox() {
  const [visible, setVisible] = useState(false)
  const [closing, setClosing] = useState(false)
  const closingRef = useRef(false)

  const show = useCallback(() => {
    closingRef.current = false
    setClosing(false)
    setVisible(true)
  }, [])

  const hide = useCallback((after) => {
    if (closingRef.current) return
    closingRef.current = true
    setClosing(true)
    window.setTimeout(() => {
      closingRef.current = false
      setVisible(false)
      setClosing(false)
      after?.()
    }, 250)
  }, [])

  return { isPresented: visible, isClosing: closing, show, hide }
}
