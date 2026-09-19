export default function ReleasePhasesPage() {
  return (
    <>
      <div className="ds-page-header">
        <div className="ds-page-breadcrumb">Release phases</div>
        <h1 className="ds-page-title">Release phases</h1>
        <p className="ds-page-description">
          How design system components move from experimental to stable — our lifecycle process.
        </p>
      </div>

      <h2>Phases overview</h2>
      <p>
        Every component and token follows a structured lifecycle. This ensures stability,
        documentation quality, and backward compatibility before production adoption.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, margin: '0 0 32px' }}>
        {[
          { phase: 'Experimental', color: '#f59e0b', bg: '#fef3c7', desc: 'Internal testing. API may change without notice.' },
          { phase: 'Beta', color: '#9333ea', bg: '#f3e8ff', desc: 'Stable API. Open for early adoption with known limitations.' },
          { phase: 'Stable', color: '#059669', bg: '#ecfdf5', desc: 'Production-ready. Fully documented and tested.' },
          { phase: 'Deprecated', color: '#dc2626', bg: '#fef2f2', desc: 'Slated for removal. Migrate to replacement.' },
        ].map((p) => (
          <div key={p.phase} style={{
            padding: 20, borderRadius: 12, border: `1px solid ${p.color}22`,
            background: p.bg,
          }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: p.color, marginBottom: 4 }}>{p.phase}</div>
            <div style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.5 }}>{p.desc}</div>
          </div>
        ))}
      </div>

      <h2>Phase criteria</h2>
      <table className="ds-token-table">
        <thead>
          <tr><th>Criterion</th><th>Experimental</th><th>Beta</th><th>Stable</th></tr>
        </thead>
        <tbody>
          <tr><td>API stability</td><td>None</td><td>Frozen</td><td>Semver</td></tr>
          <tr><td>Documentation</td><td>Internal notes</td><td>Basic guidelines</td><td>Full documentation</td></tr>
          <tr><td>Test coverage</td><td>Minimal</td><td>Core paths</td><td>Comprehensive</td></tr>
          <tr><td>Accessibility</td><td>Manual check</td><td>Automated + manual</td><td>Full WCAG AA</td></tr>
          <tr><td>Visual review</td><td>Internal</td><td>Cross-team</td><td>Design system team</td></tr>
          <tr><td>Breaking changes</td><td>Anytime</td><td>Major version only</td><td>Major version only</td></tr>
        </tbody>
      </table>

      <h2>Graduation process</h2>
      <ol>
        <li><strong>Proposal</strong> — Submit a component proposal with use cases and requirements.</li>
        <li><strong>Experimental</strong> — Build a minimum viable version for internal testing.</li>
        <li><strong>Beta</strong> — Stabilize API, add documentation, open for early adoption.</li>
        <li><strong>Stable</strong> — Complete documentation, accessibility audit, visual regression tests.</li>
        <li><strong>Deprecated</strong> — When a component is superseded, mark deprecated with migration guide.</li>
      </ol>

      <h2>Versioning</h2>
      <pre><code>{`// Semantic versioning
MAJOR.MINOR.PATCH

// Breaking change → MAJOR bump
// New feature → MINOR bump
// Bug fix → PATCH bump

// Example
1.0.0 → 1.1.0 (added new chip variant)
1.1.0 → 1.1.1 (fixed chip focus ring)
1.1.1 → 2.0.0 (removed deprecated chip API)`}</code></pre>

      <div className="ds-callout ds-callout-warning">
        <span className="ds-callout-icon">⚠</span>
        <div>
          Always check the release phase before adopting a component. Experimental components
          may change without notice and should not be used in production.
        </div>
      </div>

      <h2>Related</h2>
      <ul>
        <li><a href="/design/get-started/about">About the design system</a></li>
        <li><a href="/design/contact">Contact the team</a></li>
      </ul>
    </>
  )
}
