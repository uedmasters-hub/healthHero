export default function ToolsPage() {
  return (
    <>
      <div className="ds-page-header">
        <div className="ds-page-breadcrumb">Tools</div>
        <h1 className="ds-page-title">Tools</h1>
        <p className="ds-page-description">
          Design and development tools that power the eMedicalls design system workflow.
        </p>
      </div>

      <h2>Design tools</h2>
      <table className="ds-token-table">
        <thead>
          <tr><th>Tool</th><th>Purpose</th><th>Access</th></tr>
        </thead>
        <tbody>
          <tr><td><strong>Figma</strong></td><td>Primary design tool with component library</td><td>Team workspace</td></tr>
          <tr><td><strong>Figma tokens plugin</strong></td><td>Design token management and sync</td><td>Figma plugin</td></tr>
          <tr><td><strong>Icon library</strong></td><td>SVG icon set with export utilities</td><td>Figma / SVG repo</td></tr>
        </tbody>
      </table>

      <h2>Development tools</h2>
      <table className="ds-token-table">
        <thead>
          <tr><th>Tool</th><th>Purpose</th><th>Command</th></tr>
        </thead>
        <tbody>
          <tr><td><strong>Vite</strong></td><td>Build tool and dev server</td><td><code>npm run dev</code></td></tr>
          <tr><td><strong>oxlint</strong></td><td>Fast, strict linting</td><td><code>npm run lint</code></td></tr>
          <tr><td><strong>React DevTools</strong></td><td>Component inspection</td><td>Browser extension</td></tr>
        </tbody>
      </table>

      <h2>Documentation tools</h2>
      <table className="ds-token-table">
        <thead>
          <tr><th>Tool</th><th>Purpose</th><th>URL</th></tr>
        </thead>
        <tbody>
          <tr><td><strong>This site</strong></td><td>Design system documentation</td><td><code>localhost:5173/design</code></td></tr>
          <tr><td><strong>Storybook</strong></td><td>Component playground and visual testing</td><td><code>localhost:6006</code></td></tr>
        </tbody>
      </table>

      <h2>Quality tools</h2>
      <table className="ds-token-table">
        <thead>
          <tr><th>Tool</th><th>Purpose</th></tr>
        </thead>
        <tbody>
          <tr><td><strong>axe-core</strong></td><td>Automated accessibility testing</td></tr>
          <tr><td><strong>Chromatic</strong></td><td>Visual regression testing</td></tr>
          <tr><td><strong>Lighthouse</strong></td><td>Performance and accessibility audits</td></tr>
        </tbody>
      </table>

      <h2>Setup checklist</h2>
      <ol>
        <li>Install dependencies: <code>npm install</code></li>
        <li>Start dev server: <code>npm run dev</code></li>
        <li>Run linter: <code>npm run lint</code></li>
        <li>Open design system docs: <code>localhost:5173/design</code></li>
        <li>Install Figma plugins: Design Tokens, Iconify</li>
      </ol>

      <h2>Related</h2>
      <ul>
        <li><a href="/design/get-started/develop">Developer setup</a></li>
        <li><a href="/design/get-started/design">Design workflow</a></li>
      </ul>
    </>
  )
}
