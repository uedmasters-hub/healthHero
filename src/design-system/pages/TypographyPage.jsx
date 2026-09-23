const typeScale = [
  { name: 'H4 / Hero', size: '1.625rem', line: '1.2', weight: '500', sample: 'eMedicalls', token: '--font-size-h4 / --text-hero-size' },
  { name: 'H5 / Display', size: '1.4375rem', line: '1.2', weight: '500', sample: 'Manage your care', token: '--font-size-h5 / --text-display-size' },
  { name: 'H6 / Heading', size: '1.25rem', line: '1.2', weight: '500', sample: 'Upcoming appointments', token: '--font-size-h6' },
  { name: 'Body M', size: '1.125rem', line: '1.5', weight: '400', sample: 'Your appointment is confirmed.', token: '--font-size-body-m' },
  { name: 'Body S', size: '1rem', line: '1.5', weight: '400', sample: 'Available slots for today.', token: '--font-size-body-s' },
  { name: 'Body XS / Label', size: '0.9375rem', line: '1.35', weight: '500', sample: 'Specialisation', token: '--font-size-body-xs' },
  { name: 'Body XXS / Caption', size: '0.75rem', line: '1.5', weight: '500', sample: '2 hours ago', token: '--font-size-body-xxs' },
  { name: 'Overline', size: '0.8125rem', line: '1.35', weight: '700', sample: 'UPCOMING', token: '--text-overline-size' },
]

export default function TypographyPage() {
  return (
    <>
      <div className="ds-page-header">
        <div className="ds-page-breadcrumb">Foundations / Typography</div>
        <h1 className="ds-page-title">Typography</h1>
        <p className="ds-page-description">
          Satoshi + PocketPills production type scale — 16px body, 1.5 line-height, medium headings.
        </p>
      </div>

      <h2>Typeface</h2>
      <p>
        eMedicalls uses <strong>Satoshi</strong> (PocketPills production face) with system fallbacks.
      </p>
      <pre><code>{`font-family: var(--font-sans);
/* "Satoshi", Arial, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif */`}</code></pre>

      <h2>Type scale</h2>
      {typeScale.map((t) => (
        <div key={t.name} className="ds-type-specimen">
          <div className="ds-type-specimen-sample" style={{ fontSize: t.size, lineHeight: t.line, fontWeight: t.weight, letterSpacing: t.name.includes('Body S') || t.name.includes('Body M') ? '0.02em' : 0 }}>
            {t.sample}
          </div>
          <div className="ds-type-specimen-meta">
            {t.name} — {t.size} / {t.line} / {t.weight}w — <code>{t.token}</code>
          </div>
        </div>
      ))}

      <h2>Weights</h2>
      <table className="ds-token-table">
        <thead>
          <tr><th>Weight</th><th>Token</th><th>Value</th><th>Usage</th></tr>
        </thead>
        <tbody>
          <tr><td>Regular</td><td><code>--font-weight-regular</code></td><td>400</td><td>Body</td></tr>
          <tr><td>Medium</td><td><code>--font-weight-medium</code></td><td>500</td><td>Headings, CTAs, titles</td></tr>
          <tr><td>Bold</td><td><code>--font-weight-bold</code></td><td>700</td><td>Overlines / emphasis</td></tr>
          <tr><td>Black</td><td><code>--font-weight-black</code></td><td>900</td><td>Rare display emphasis</td></tr>
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
