const easings = [
  { name: '--ease-standard', value: 'ease', desc: 'Default for most transitions' },
  { name: '--ease-emphasized', value: 'cubic-bezier(0.22, 1, 0.36, 1)', desc: 'Entrance and emphasis' },
]

const durations = [
  { name: '--duration-fast', value: '0.15s', desc: 'Micro-interactions, opacity changes' },
  { name: '--duration-normal', value: '0.2s', desc: 'Standard transitions' },
  { name: '--duration-moderate', value: '0.28s', desc: 'Content reveals, panel slides' },
  { name: '--duration-slow', value: '0.4s', desc: 'Page transitions, modals' },
]

export default function MotionPage() {
  return (
    <>
      <div className="ds-page-header">
        <div className="ds-page-breadcrumb">Foundations / Motion</div>
        <h1 className="ds-page-title">Motion</h1>
        <p className="ds-page-description">
          Animation principles that add life to interfaces without sacrificing performance or accessibility.
        </p>
      </div>

      <h2>Motion philosophy</h2>
      <p>
        Motion in eMedicalls serves three purposes: it guides attention, provides feedback,
        and creates spatial relationships. Every animation should feel purposeful — never decorative.
      </p>

      <div className="ds-callout ds-callout-warning">
        <span className="ds-callout-icon">⚠</span>
        <div>
          All animations respect <code>prefers-reduced-motion</code>. Users who have requested
          reduced motion will see instant state changes instead of animations.
        </div>
      </div>

      <h2>Easing functions</h2>
      <table className="ds-token-table">
        <thead>
          <tr><th>Token</th><th>Value</th><th>Usage</th></tr>
        </thead>
        <tbody>
          {easings.map((e) => (
            <tr key={e.name}>
              <td className="ds-token-name">{e.name}</td>
              <td className="ds-token-value">{e.value}</td>
              <td>{e.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Durations</h2>
      <table className="ds-token-table">
        <thead>
          <tr><th>Token</th><th>Value</th><th>Usage</th></tr>
        </thead>
        <tbody>
          {durations.map((d) => (
            <tr key={d.name}>
              <td className="ds-token-name">{d.name}</td>
              <td className="ds-token-value">{d.value}</td>
              <td>{d.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Motion patterns</h2>

      <div className="ds-motion-grid">
        <div className="ds-motion-item">
          <div className="ds-motion-box" style={{ animation: 'none' }} />
          <div className="ds-motion-label">Fade in</div>
          <div className="ds-motion-value">opacity 0→1</div>
        </div>
        <div className="ds-motion-item">
          <div className="ds-motion-box" />
          <div className="ds-motion-label">Pop in</div>
          <div className="ds-motion-value">scale 0.8→1 + opacity</div>
        </div>
        <div className="ds-motion-item">
          <div className="ds-motion-box" />
          <div className="ds-motion-label">Slide up</div>
          <div className="ds-motion-value">translateY 20px→0</div>
        </div>
      </div>

      <h3>Page transitions</h3>
      <pre><code>{`/* Child pages slide in from below */
.page-layer-inner {
  transition: transform 0.36s var(--ease-emphasized),
              filter 0.36s var(--ease-emphasized);
}

.page-layer-inner.is-dimmed {
  transform: scale(0.96);
  filter: brightness(0.75);
}`}</code></pre>

      <h3>Reveal animations</h3>
      <pre><code>{`/* Staggered reveal for lists */
.reveal-body {
  opacity: 0;
  transform: translateY(8px);
  transition: opacity 0.28s ease, transform 0.32s var(--ease-emphasized);
}

.reveal-body.is-visible {
  opacity: 1;
  transform: none;
}`}</code></pre>

      <h2>Keyframes</h2>
      <pre><code>{`@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

@keyframes popIn {
  from { transform: scale(0.8); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}`}</code></pre>

      <h2>Related</h2>
      <ul>
        <li><a href="/design/foundations/tokens">Design Tokens</a></li>
        <li><a href="/design/foundations/accessibility">Accessibility</a></li>
      </ul>
    </>
  )
}
