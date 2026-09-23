const iconSizes = [
  { token: '--icon-xs', value: '12px', usage: 'Inline indicators, badges' },
  { token: '--icon-sm', value: '16px', usage: 'Compact UI, chips' },
  { token: '--icon-md', value: '18px', usage: 'Default icon size' },
  { token: '--icon-lg', value: '20px', usage: 'Standard buttons, nav items' },
  { token: '--icon-xl', value: '22px', usage: 'Emphasized icons' },
  { token: '--icon-2xl', value: '24px', usage: 'Feature icons, heroes' },
]

export default function IconographyPage() {
  return (
    <>
      <div className="ds-page-header">
        <div className="ds-page-breadcrumb">Foundations / Iconography</div>
        <h1 className="ds-page-title">Iconography</h1>
        <p className="ds-page-description">
          Consistent icon usage across eMedicalls — sizing, styling, and placement guidelines.
        </p>
      </div>

      <h2>Icon system</h2>
      <p>
        eMedicalls uses SVG icons with a consistent 2px stroke weight
        (<code>--icon-stroke</code>). Default glyph size for chrome is 20×20
        (<code>--icon-lg</code>) inside a 44×44 touch target. Icons clarify meaning —
        every icon needs a text label or accessible <code>aria-label</code>.
      </p>

      <h2>Icon sizes</h2>
      <table className="ds-token-table">
        <thead>
          <tr><th>Token</th><th>Value</th><th>Usage</th></tr>
        </thead>
        <tbody>
          {iconSizes.map((s) => (
            <tr key={s.token}>
              <td className="ds-token-name">{s.token}</td>
              <td className="ds-token-value">{s.value}</td>
              <td>{s.usage}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Icon containers</h2>
      <h3>Icon buttons</h3>
      <p>
        Interactive icons use <code>.ds-icon-btn</code> with a minimum <code>2.75rem</code> touch target.
        The visual icon is smaller than the hit area for comfortable tapping.
      </p>

      <div className="ds-preview">
        <div className="ds-preview-stage">
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="ds-showcase-btn ds-showcase-btn-ghost" style={{ width: 44, height: 44, padding: 0, borderRadius: '50%' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            </button>
            <button className="ds-showcase-btn ds-showcase-btn-ghost" style={{ width: 44, height: 44, padding: 0, borderRadius: '50%' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
            </button>
            <button className="ds-showcase-btn ds-showcase-btn-ghost" style={{ width: 44, height: 44, padding: 0, borderRadius: '50%' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </button>
          </div>
        </div>
        <div className="ds-preview-code">
          <pre><code>{`<button className="ds-icon-btn">
  <svg>...</svg>
</button>`}</code></pre>
        </div>
      </div>

      <h3>Icon wells</h3>
      <p>
        Soft circular backgrounds for decorative icons. Use <code>.ds-icon-well</code> with
        optional semantic variants.
      </p>

      <div className="ds-preview">
        <div className="ds-preview-stage">
          <div style={{ display: 'flex', gap: 12 }}>
            {['info', 'success', 'warning', 'danger'].map((variant) => (
              <div key={variant} className={`ds-icon-well is-${variant}`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
                </svg>
              </div>
            ))}
          </div>
        </div>
      </div>

      <h2>Stroke consistency</h2>
      <p>
        All icons use a single stroke weight defined by <code>--icon-stroke: 2</code>.
        We do not vary stroke weight for emphasis — use color and size instead.
      </p>

      <div className="ds-do-dont-grid">
        <div className="ds-do-card">
          <h4>Do</h4>
          <p>Always pair icon-only buttons with <code>aria-label</code> for screen reader accessibility.</p>
        </div>
        <div className="ds-dont-card">
          <h4>Don't</h4>
          <p>Use icons without labels in navigation. Users should never have to guess what an icon means.</p>
        </div>
      </div>

      <h2>Related</h2>
      <ul>
        <li><a href="/design/foundations/tokens">Design Tokens</a></li>
        <li><a href="/design/foundations/accessibility">Accessibility</a></li>
        <li><a href="/design/components/buttons">Buttons</a></li>
      </ul>
    </>
  )
}
