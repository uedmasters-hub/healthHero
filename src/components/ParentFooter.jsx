import AppFooter from './AppFooter'
import { useDemoPreview } from './DemoPreviewModal'
import { RxImage } from './pharmacy/PharmacyHome'
import { BRAND_NAME } from '../lib/brand'
import './ParentFooter.css'

/** Tab-root pages only (Home, Treat, Pharmacy, Centers) — never child/detail screens. */

const APP_DOWNLOAD = Object.freeze({
  title: `Download the ${BRAND_NAME} app`,
  body: 'Manage your health, anytime anywhere.',
  image: '/img/centers/app/phone.png',
})

function AppleLogo() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M16.4 12.6c0-2.4 2-3.6 2.1-3.7-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.7.9-.8 0-1.9-.9-3.2-.8-1.6 0-3.1 1-4 2.4-1.7 3-.4 7.4 1.2 9.8.8 1.2 1.8 2.5 3 2.4 1.2 0 1.7-.8 3.2-.8s1.9.8 3.2.8c1.3 0 2.2-1.2 3-2.4.9-1.4 1.3-2.7 1.3-2.8 0 0-2.6-1-2.6-3.9zM14 5.5c.7-.8 1.1-1.9 1-3-1 0-2.1.7-2.8 1.5-.6.7-1.2 1.8-1 2.9 1.1.1 2.1-.6 2.8-1.4z" />
    </svg>
  )
}

function PlayLogo() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#00d7fe" d="M3.6 2.3 13.4 12l-9.8 9.7c-.3-.2-.5-.6-.5-1.1V3.4c0-.5.2-.9.5-1.1z" />
      <path fill="#ffce00" d="m16.8 8.6 3.4 1.9c1 .6 1 2.4 0 3l-3.4 1.9-3.4-3.4z" />
      <path fill="#ff3a44" d="M16.8 15.4 13.4 12l-9.8 9.7c.4.4 1 .4 1.6.1z" />
      <path fill="#00f076" d="M16.8 8.6 5.2 2.2c-.6-.3-1.2-.3-1.6.1L13.4 12z" />
    </svg>
  )
}

function TileGlyph({ children }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
}

function PhoneMockup() {
  return (
    <span className="hc-phone">
      <span className="hc-phone__notch" />
      <span className="hc-phone__bar">
        <span className="hc-phone__brand" />
        <span className="hc-phone__dot" />
      </span>
      <span className="hc-phone__line" />
      <span className="hc-phone__tiles">
        <span className="hc-phone__tile">
          <TileGlyph>
            <path d="M5 3v5a5 5 0 0 0 10 0V3M4 3h2M14 3h2" />
            <path d="M10 13v2a5 5 0 0 0 10 0v-1" />
            <circle cx="20" cy="12" r="2" />
          </TileGlyph>
        </span>
        <span className="hc-phone__tile">
          <TileGlyph>
            <path d="M4 21V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v16" />
            <path d="M2 21h20M12 7v4M10 9h4M9 21v-4h6v4" />
          </TileGlyph>
        </span>
      </span>
      <span className="hc-phone__line is-short" />
    </span>
  )
}

function AppDownloadCard({ app, onStore }) {
  return (
    <section className="hc-app" aria-label={app.title}>
      <div className="hc-app__copy">
        <h2 className="hc-app__title">{app.title}</h2>
        <p className="hc-app__body">{app.body}</p>
        <div className="hc-app__stores">
          <button type="button" className="hc-store" onClick={() => onStore('ios')}>
            <AppleLogo />
            <span className="hc-store__text">
              <span className="hc-store__kicker">Download on the</span>
              <span className="hc-store__name">App Store</span>
            </span>
          </button>
          <button type="button" className="hc-store" onClick={() => onStore('android')}>
            <PlayLogo />
            <span className="hc-store__text">
              <span className="hc-store__kicker">Get it on</span>
              <span className="hc-store__name">Google Play</span>
            </span>
          </button>
        </div>
      </div>
      <div className="hc-app__art" aria-hidden="true">
        <RxImage src={app.image} className="hc-app__img" fallback={<PhoneMockup />} />
      </div>
    </section>
  )
}

export default function ParentFooter({ page }) {
  const { show: showDemoPreview } = useDemoPreview()
  return (
    <div className="parent-footer">
      <AppDownloadCard app={APP_DOWNLOAD} onStore={() => showDemoPreview?.()} />
      <AppFooter page={page} variant="band" />
    </div>
  )
}
