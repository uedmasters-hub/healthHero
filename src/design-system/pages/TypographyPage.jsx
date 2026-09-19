const typeScale = [
  { name: 'Display', size: '22px', line: '1.25', weight: '700', sample: 'Health Hero', token: '--text-display-size' },
  { name: 'Subtitle', size: '18px', line: '1.3', weight: '600', sample: 'Your health, simplified', token: '--text-subtitle-size' },
  { name: 'Heading', size: '17px', line: '1.3', weight: '600', sample: 'Upcoming appointments', token: '--text-heading-size' },
  { name: 'Title', size: '16px', line: '1.3', weight: '600', sample: 'Dr. Priya Sharma', token: '--text-title-size' },
  { name: 'Body LG', size: '15px', line: '1.45', weight: '400', sample: 'Your appointment is confirmed.', token: '--text-body-lg-size' },
  { name: 'Body', size: '14px', line: '1.45', weight: '400', sample: 'Available slots for today and tomorrow.', token: '--text-body-size' },
  { name: 'Label', size: '13px', line: '1.35', weight: '500', sample: 'Specialisation', token: '--text-label-size' },
  { name: 'Caption', size: '12px', line: '1.35', weight: '500', sample: '2 hours ago', token: '--text-caption-size' },
  { name: 'Overline', size: '11px', line: '1.3', weight: '600', sample: 'UPCOMING', token: '--text-overline-size' },
  { name: 'Micro', size: '10px', line: '1.3', weight: '400', sample: '₹ 500', token: '--text-micro-size' },
]

export default function TypographyPage() {
  return (
    <>
      <div className="ds-page-header">
        <div className="ds-page-breadcrumb">Foundations / Typography</div>
        <h1 className="ds-page-title">Typography</h1>
        <p className="ds-page-description">
          The typographic system that ensures clear, legible, and hierarchical text across all surfaces.
        </p>
      </div>

      <h2>Typeface</h2>
      <p>
        Health Hero uses <strong>Inter</strong> as the primary typeface. It is a highly legible
        sans-serif designed for screen readability, with excellent support for Indian languages.
      </p>
      <pre><code>{`font-family: var(--font-sans);
/* 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif */`}</code></pre>

      <h2>Type scale</h2>
      {typeScale.map((t) => (
        <div key={t.name} className="ds-type-specimen">
          <div className="ds-type-specimen-sample" style={{ fontSize: t.size, lineHeight: t.line, fontWeight: t.weight }}>
            {t.sample}
          </div>
          <div className="ds-type-specimen-meta">
            {t.name} — {t.size} / {t.line} / {t.weight}w — <code>{t.token}</code>
          </div>
        </div>
      ))}

      <h2>Font weights</h2>
      <table className="ds-token-table">
        <thead>
          <tr><th>Weight</th><th>Token</th><th>Value</th><th>Usage</th></tr>
        </thead>
        <tbody>
          <tr><td>Regular</td><td><code>--font-weight-regular</code></td><td>400</td><td>Body text, descriptions</td></tr>
          <tr><td>Medium</td><td><code>--font-weight-medium</code></td><td>500</td><td>Labels, captions, metadata</td></tr>
          <tr><td>Semibold</td><td><code>--font-weight-semibold</code></td><td>600</td><td>Headings, titles, buttons</td></tr>
          <tr><td>Bold</td><td><code>--font-weight-bold</code></td><td>700</td><td>Page titles, display text</td></tr>
        </tbody>
      </table>

      <h2>Line heights</h2>
      <p>
        Line height is proportional to font size. Smaller text gets tighter line heights for
        compact layouts; larger text gets more breathing room.
      </p>

      <h2>Letter spacing</h2>
      <table className="ds-token-table">
        <thead>
          <tr><th>Token</th><th>Value</th><th>Usage</th></tr>
        </thead>
        <tbody>
          <tr><td><code>--letter-tight</code></td><td>-0.25px</td><td>Display and large headings</td></tr>
          <tr><td><code>--letter-snug</code></td><td>-0.15px</td><td>Regular headings</td></tr>
          <tr><td><code>--text-overline-tracking</code></td><td>0.06em</td><td>Overline / uppercase labels</td></tr>
        </tbody>
      </table>

      <div className="ds-do-dont-grid">
        <div className="ds-do-card">
          <h4>Do</h4>
          <p>Use the semantic text tokens (ds-display, ds-heading, ds-body, etc.) for consistent typography throughout.</p>
        </div>
        <div className="ds-dont-card">
          <h4>Don't</h4>
          <p>Use arbitrary font sizes like 15px or 13.5px. Stick to the type scale to maintain visual harmony.</p>
        </div>
      </div>

      <h2>Related</h2>
      <ul>
        <li><a href="/design/foundations/tokens">Design Tokens</a></li>
        <li><a href="/design/foundations/content">Content</a></li>
        <li><a href="/design/foundations/accessibility">Accessibility</a></li>
      </ul>
    </>
  )
}
