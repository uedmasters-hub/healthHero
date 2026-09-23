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
          <tr><td><code>--text-primary</code> on <code>--white</code></td><td>~16:1</td><td style={{ color: 'var(--success)' }}>Pass AAA</td></tr>
          <tr><td><code>--text-secondary</code> on <code>--white</code></td><td>~7:1</td><td style={{ color: 'var(--success)' }}>Pass AAA</td></tr>
          <tr><td><code>--text-on-cta</code> on <code>--cta</code></td><td>~12:1</td><td style={{ color: 'var(--success)' }}>Pass AAA</td></tr>
          <tr><td><code>--text-on-primary</code> on <code>--primary-950</code></td><td>~8:1</td><td style={{ color: 'var(--success)' }}>Pass AAA</td></tr>
          <tr><td><code>--text-faint</code> on <code>--white</code></td><td>~3:1</td><td style={{ color: 'var(--warning)' }}>Decorative only</td></tr>
        </tbody>
      </table>

      <h2>Touch targets</h2>
      <p>
        All interactive elements must have a minimum touch target of <code>2.75rem</code>
        (<code>--touch-min</code>, PP h-11). Structured fields use <code>--field-height</code> (3rem) or
        <code>--field-height-sm</code> (2.75rem).
      </p>

      <div className="ds-preview">
        <div className="ds-preview-stage">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="ds-showcase-btn ds-showcase-btn-primary" style={{ minWidth: 44, minHeight: 44 }}>
              2.75rem min
            </button>
            <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>← minimum touch target</span>
          </div>
        </div>
      </div>

      <h2>Focus management</h2>
      <p>
        Keyboard focus uses PocketPills&apos; <strong>3px primary-500</strong> ring with 2px offset.
        Never remove focus indicators.
      </p>

      <h3>Focus ring styles</h3>
      <pre><code>{`button:focus-visible,
a:focus-visible {
  outline: 3px solid var(--primary-500);
  outline-offset: 2px;
  box-shadow: none;
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
