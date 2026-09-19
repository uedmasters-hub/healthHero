export default function AccessibilityPage() {
  return (
    <>
      <div className="ds-page-header">
        <div className="ds-page-breadcrumb">Foundations / Accessibility</div>
        <h1 className="ds-page-title">Accessibility</h1>
        <p className="ds-page-description">
          Building inclusive interfaces that work for everyone — our baseline is WCAG 2.1 AA.
        </p>
      </div>

      <h2>Why accessibility matters</h2>
      <p>
        Healthcare is for everyone. Our users include people with visual, motor, cognitive,
        and auditory disabilities. Accessible design isn't an edge case — it's the foundation
        of trustworthy healthcare technology.
      </p>

      <h2>Color contrast</h2>
      <p>
        All text must meet WCAG AA contrast ratios. This means 4.5:1 for normal text and 3:1
        for large text (18px+ or 14px bold+).
      </p>

      <table className="ds-token-table">
        <thead>
          <tr><th>Token pair</th><th>Ratio</th><th>Status</th></tr>
        </thead>
        <tbody>
          <tr><td><code>--text-primary</code> on <code>--white</code></td><td>15.4:1</td><td style={{ color: '#059669' }}>Pass AAA</td></tr>
          <tr><td><code>--text-secondary</code> on <code>--white</code></td><td>5.0:1</td><td style={{ color: '#059669' }}>Pass AA</td></tr>
          <tr><td><code>--text-on-primary</code> on <code>--primary</code></td><td>4.6:1</td><td style={{ color: '#059669' }}>Pass AA</td></tr>
          <tr><td><code>--text-faint</code> on <code>--white</code></td><td>2.9:1</td><td style={{ color: '#d97706' }}>Decorative only</td></tr>
        </tbody>
      </table>

      <h2>Touch targets</h2>
      <p>
        All interactive elements must have a minimum touch target of <code>44×44px</code>.
        Use the <code>.touch-target</code> class or <code>--touch-min</code> token.
      </p>

      <div className="ds-preview">
        <div className="ds-preview-stage">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="ds-showcase-btn ds-showcase-btn-primary" style={{ minWidth: 44, minHeight: 44 }}>
              44px min
            </button>
            <span style={{ fontSize: 13, color: '#6b7280' }}>← minimum touch target</span>
          </div>
        </div>
      </div>

      <h2>Focus management</h2>
      <p>
        Keyboard users must be able to navigate every interactive element. Focus indicators
        are never removed — they are styled with the <code>--border-focus</code> token and
        <code>--shadow-focus</code> for visibility.
      </p>

      <h3>Focus ring styles</h3>
      <pre><code>{`button:focus-visible,
a:focus-visible {
  outline: 2px solid var(--border-focus);
  outline-offset: 2px;
  box-shadow: var(--shadow-focus);
}`}</code></pre>

      <h2>Screen reader support</h2>
      <ul>
        <li>Use semantic HTML elements (<code>button</code>, <code>nav</code>, <code>main</code>).</li>
        <li>Add <code>aria-label</code> for icon-only buttons.</li>
        <li>Use <code>aria-live</code> for dynamic content updates.</li>
        <li>Provide <code>alt</code> text for all meaningful images.</li>
        <li>Use <code>role</code> attributes for custom widgets.</li>
      </ul>

      <h2>Reduced motion</h2>
      <p>
        Respect the <code>prefers-reduced-motion</code> media query. All animations are
        automatically disabled when the user has requested reduced motion.
      </p>
      <pre><code>{`@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}`}</code></pre>

      <h2>Related</h2>
      <ul>
        <li><a href="/design/foundations/color">Color contrast</a></li>
        <li><a href="/design/foundations/typography">Typography legibility</a></li>
        <li><a href="/design/foundations/motion">Motion preferences</a></li>
      </ul>
    </>
  )
}
