export default function DevelopPage() {
  return (
    <>
      <div className="ds-page-header">
        <div className="ds-page-breadcrumb">Get started / Develop</div>
        <h1 className="ds-page-title">Develop</h1>
        <p className="ds-page-description">
          Technical guidelines for implementing Health Hero components and patterns.
        </p>
      </div>

      <h2>Technology stack</h2>
      <table className="ds-token-table">
        <thead>
          <tr><th>Layer</th><th>Technology</th><th>Version</th></tr>
        </thead>
        <tbody>
          <tr><td>Framework</td><td>React</td><td>19.x</td></tr>
          <tr><td>Build tool</td><td>Vite</td><td>8.x</td></tr>
          <tr><td>Routing</td><td>react-router-dom</td><td>7.x</td></tr>
          <tr><td>Styling</td><td>Plain CSS + CSS Custom Properties</td><td>—</td></tr>
          <tr><td>Language</td><td>JavaScript (JSX)</td><td>ES2022+</td></tr>
          <tr><td>Linter</td><td>oxlint</td><td>latest</td></tr>
        </tbody>
      </table>

      <h2>Token usage</h2>
      <p>
        All design decisions are expressed as CSS custom properties defined in <code>src/index.css</code>.
        Never hardcode colors, spacing, or typography values.
      </p>

      <h3>Accessing tokens in CSS</h3>
      <pre><code>{`.card {
  background: var(--card-bg);
  border: var(--border-width) solid var(--border);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  padding: var(--card-padding);
}`}</code></pre>

      <h3>Accessing tokens in JavaScript</h3>
      <pre><code>{`const primary = getComputedStyle(document.documentElement)
  .getPropertyValue('--primary')
  .trim()`}</code></pre>

      <h2>Component architecture</h2>
      <p>
        Components follow a co-located file structure: each component has a <code>.jsx</code> file
        and a matching <code>.css</code> file in the same directory.
      </p>

      <pre><code>{`src/components/
  DoctorCard.jsx      # Component logic + markup
  DoctorCard.css      # Component styles`}</code></pre>

      <h3>Naming conventions</h3>
      <ul>
        <li>Components: <code>PascalCase</code> (e.g., <code>DoctorCard</code>)</li>
        <li>CSS classes: <code>kebab-case</code> with <code>ds-</code> prefix for design system primitives</li>
        <li>Tokens: <code>--kebab-case</code> with semantic grouping (e.g., <code>--text-primary</code>)</li>
        <li>Files: <code>PascalCase.jsx</code> for components, <code>kebab-case.js</code> for utilities</li>
      </ul>

      <h2>Testing</h2>
      <ul>
        <li><strong>Visual regression</strong> — Storybook + Chromatic for screenshot diffing.</li>
        <li><strong>Unit tests</strong> — Component behavior and utility function testing.</li>
        <li><strong>Accessibility audits</strong> — Automated checks with axe-core, manual screen reader testing.</li>
      </ul>

      <div className="ds-callout ds-callout-warning">
        <span className="ds-callout-icon">⚠</span>
        <div>
          Always run <code>npm run lint</code> before committing. The project uses oxlint for fast,
          strict linting.
        </div>
      </div>

      <h2>Related</h2>
      <ul>
        <li><a href="/design/foundations/tokens">Design Tokens</a></li>
        <li><a href="/design/components/buttons">Components →</a></li>
      </ul>
    </>
  )
}
