export default function DesignPage() {
  return (
    <>
      <div className="ds-page-header">
        <div className="ds-page-breadcrumb">Get started / Design</div>
        <h1 className="ds-page-title">Design</h1>
        <p className="ds-page-description">
          Principles, guidelines, and workflows for designing eMedicalls products.
        </p>
      </div>

      <h2>Design principles</h2>
      <p>
        Every design decision in eMedicalls should be grounded in these principles.
        They guide us toward products that feel cohesive, trustworthy, and premium.
      </p>

      <h3>User-first</h3>
      <p>
        eMedicalls serves patients during vulnerable moments. Every interface must prioritize
        clarity over decoration. Reduce cognitive load by presenting only what the user needs,
        when they need it.
      </p>

      <h3>Systematic thinking</h3>
      <p>
        Design tokens, component variants, and layout patterns exist so you never solve the same
        problem twice. Before creating something new, check if an existing pattern can be adapted.
      </p>

      <h3>Progressive disclosure</h3>
      <p>
        Health workflows are complex. Reveal complexity gradually — start with essentials, then
        let users drill deeper. This applies to navigation, forms, and information hierarchy.
      </p>

      <div className="ds-do-dont-grid">
        <div className="ds-do-card">
          <h4>Do</h4>
          <p>Use the token system for all colors, spacing, and typography. This ensures consistency and makes theme changes automatic.</p>
        </div>
        <div className="ds-dont-card">
          <h4>Don't</h4>
          <p>Hardcode hex values, pixel sizes, or font families. This creates drift and makes future updates painful.</p>
        </div>
      </div>

      <div className="ds-do-dont-grid">
        <div className="ds-do-card">
          <h4>Do</h4>
          <p>Design for the smallest screen first, then scale up. Mobile constraints enforce clarity.</p>
        </div>
        <div className="ds-dont-card">
          <h4>Don't</h4>
          <p>Shrink desktop layouts to fit mobile. This creates cramped, unusable interfaces.</p>
        </div>
      </div>

      <h2>Design workflow</h2>
      <ol>
        <li><strong>Understand the problem</strong> — Review user stories, data, and existing patterns.</li>
        <li><strong>Explore solutions</strong> — Sketch low-fidelity concepts before committing to pixel-perfect designs.</li>
        <li><strong>Apply the system</strong> — Use existing tokens, components, and patterns. Document new additions.</li>
        <li><strong>Test accessibility</strong> — Check contrast ratios, touch targets, and screen reader flow.</li>
        <li><strong>Hand off with context</strong> — Annotate interactions, edge states, and responsive behavior.</li>
      </ol>

      <h2>Tools we use</h2>
      <ul>
        <li><strong>Figma</strong> — Primary design tool with the eMedicalls component library.</li>
        <li><strong>Storybook</strong> — Component documentation and visual testing.</li>
        <li><strong>This documentation site</strong> — The canonical source for guidelines and token references.</li>
      </ul>

      <h2>Related</h2>
      <ul>
        <li><a href="/design/foundations/tokens">Design Tokens</a></li>
        <li><a href="/design/foundations/color">Color</a></li>
        <li><a href="/design/foundations/typography">Typography</a></li>
        <li><a href="/design/get-started/develop">Develop →</a></li>
      </ul>
    </>
  )
}
