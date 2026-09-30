/*
 * Type roles — each sample renders with the real role tokens, so the specimen
 * is the scale the app uses (PocketPills steps: 11 · 12 · 13 · 15 · 16 · 18 ·
 * 20 · 23 · 26 · 29 · 41).
 */
const typeScale = [
  { name: 'Stat', px: 41, role: '--text-stat-size', line: '--leading-none', weight: 500, tracking: '--letter-tight', sample: '4.8', use: 'Big ratings' },
  { name: 'Figure', px: 29, role: '--text-figure-size', line: '--leading-tight', weight: 500, tracking: '--letter-tight', sample: 'Rs. 1,200', use: 'Amounts to pay' },
  { name: 'Hero', px: 26, role: '--text-hero-size', line: '--leading-tight', weight: 500, tracking: '--letter-tight', sample: 'Pharmacy', use: 'Tab root page titles' },
  { name: 'Display', px: 23, role: '--text-display-size', line: '--leading-tight', weight: 500, tracking: '--letter-tight', sample: 'Booking confirmed', use: 'Result moments, hero cards' },
  { name: 'Heading', px: 20, role: '--text-heading-size', line: '--leading-tight', weight: 500, tracking: '--letter-tight', sample: 'Upcoming appointments', use: 'h6 · sheet and card headings' },
  { name: 'Subtitle', px: 18, role: '--text-subtitle-size', line: '--leading-tight', weight: 500, tracking: '--letter-body', sample: 'Appointment details', use: 'App bar, section and dialog titles' },
  { name: 'Body L', px: 18, role: '--text-body-lg-size', line: '--leading-body', weight: 400, tracking: '--letter-body', sample: 'Your appointment is confirmed.', use: 'Lead copy' },
  { name: 'Body / Title', px: 16, role: '--text-body-size · --text-title-size', line: '--leading-body · --leading-snug', weight: '400 · 500', tracking: '--letter-body', sample: 'Available slots for today.', use: 'Default copy · row and card titles' },
  { name: 'Label', px: 15, role: '--text-label-size', line: '--leading-dense', weight: 500, tracking: '--letter-body', sample: 'Specialisation', use: 'Field labels, buttons (md), chips' },
  { name: 'Overline', px: 13, role: '--text-overline-size', line: '--leading-dense', weight: 700, tracking: '--letter-caps', caps: true, sample: 'Upcoming', use: 'Caps eyebrows, group labels' },
  { name: 'Caption', px: 12, role: '--text-caption-size', line: '--leading-body', weight: 400, tracking: '--letter-body', sample: '2 hours ago · Kathmandu', use: 'Meta, hints, legal' },
  { name: 'Micro', px: 11, role: '--text-micro-size', line: '--leading-snug', weight: 500, tracking: '--letter-body', sample: '24/7', use: 'Badges, nav labels — the floor' },
]

export default function TypographyPage() {
  return (
    <>
      <div className="ds-page-header">
        <div className="ds-page-breadcrumb">Foundations / Typography</div>
        <h1 className="ds-doc-title">Typography</h1>
        <p className="ds-page-description">
          Satoshi on the PocketPills production scale — 16px body at 1.5, medium headings at 1.2, caps eyebrows at 700.
        </p>
      </div>

      <h2>Typeface</h2>
      <p>
        <strong>Satoshi</strong> is self-hosted (<code>/public/fonts/satoshi</code>) in 400, 500 and 700 — the only weights the
        product uses. <strong>Noto Sans Devanagari</strong> follows it in the stack so Nepali text renders; Latin text never falls back.
      </p>
      <pre><code>{`font-family: var(--font-sans);
/* "Satoshi", "Noto Sans Devanagari", "Noto Sans", …, Arial, system-ui */`}</code></pre>

      <h2>Type roles</h2>
      <p>
        Screens set <code>font-size</code> through role tokens only (<code>--text-*-size</code>). Primitive steps
        (<code>--font-size-h3…body-xxs</code>) stay inside <code>tokens.css</code>.
      </p>
      {typeScale.map((t) => (
        <div key={t.name} className="ds-type-specimen">
          <div
            className="ds-type-specimen-sample"
            style={{
              fontSize: `${t.px / 16}rem`,
              fontWeight: String(t.weight).split(' ')[0],
              lineHeight: `var(${t.line.split(' ')[0]})`,
              letterSpacing: `var(${t.tracking})`,
              textTransform: t.caps ? 'uppercase' : 'none',
              color: t.weight === 700 ? 'var(--color-eyebrow)' : 'var(--pp-headline)',
            }}
          >
            {t.sample}
          </div>
          <div className="ds-type-specimen-meta">
            {t.name} — {t.px}px · {t.weight} · <code>{t.role}</code> · <code>{t.line}</code> — {t.use}
          </div>
        </div>
      ))}

      <h2>Weights</h2>
      <table className="ds-token-table">
        <thead>
          <tr><th>Weight</th><th>Token</th><th>Value</th><th>Usage</th></tr>
        </thead>
        <tbody>
          <tr><td>Regular</td><td><code>--font-weight-regular</code></td><td>400</td><td>Body copy, captions, meta</td></tr>
          <tr><td>Medium</td><td><code>--font-weight-medium</code></td><td>500</td><td>Headings, titles, labels, buttons</td></tr>
          <tr><td>Bold</td><td><code>--font-weight-bold</code></td><td>700</td><td>Caps eyebrows and counts only</td></tr>
        </tbody>
      </table>

      <h2>Leading and tracking</h2>
      <table className="ds-token-table">
        <thead>
          <tr><th>Token</th><th>Value</th><th>Usage</th></tr>
        </thead>
        <tbody>
          <tr><td><code>--leading-none</code></td><td>1</td><td>Controls, badges, big figures</td></tr>
          <tr><td><code>--leading-tight</code></td><td>1.2</td><td>Headings, titles 18px and up</td></tr>
          <tr><td><code>--leading-snug</code></td><td>1.3</td><td>Row and card titles</td></tr>
          <tr><td><code>--leading-dense</code></td><td>1.35</td><td>Labels, caps</td></tr>
          <tr><td><code>--leading-body</code></td><td>1.5</td><td>Body copy, captions</td></tr>
          <tr><td><code>--letter-body</code> · <code>--letter-caps</code> · <code>--letter-tight</code></td><td>0.02em · 0.04em · 0</td><td>
            Set through <code>--tracking</code>, so every element resolves the em against its own size.
          </td></tr>
        </tbody>
      </table>

      <h2>Related</h2>
      <ul>
        <li><a href="/design/foundations/tokens">Design Tokens</a></li>
        <li><a href="/design/foundations/color">Color</a></li>
        <li><a href="/design/foundations/accessibility">Accessibility</a></li>
      </ul>
    </>
  )
}
