export default function AboutPage() {
  return (
    <>
      <div className="ds-page-header">
        <div className="ds-page-breadcrumb">Get started / About</div>
        <h1 className="ds-page-title">About the design system</h1>
        <p className="ds-page-description">
          History, goals, and governance of the eMedicalls Design System.
        </p>
      </div>

      <h2>Why a design system?</h2>
      <p>
        As eMedicalls grew from a single mobile app to a multi-surface healthcare platform,
        inconsistencies emerged. Different teams used different shades of purple, different
        border radii, different spacing scales. The design system was created to solve this —
        providing a shared vocabulary that keeps every screen feeling like part of the same product.
      </p>

      <h2>Goals</h2>
      <ul>
        <li><strong>Consistency</strong> — Every eMedicalls surface should feel familiar.</li>
        <li><strong>Speed</strong> — Ship features faster by composing from a shared component library.</li>
        <li><strong>Quality</strong> — Built-in accessibility, performance, and responsive behavior.</li>
        <li><strong>Scalability</strong> — New teams and products adopt the system without reinventing patterns.</li>
        <li><strong>Trust</strong> — A premium, polished experience that reflects our commitment to healthcare.</li>
      </ul>

      <h2>Governance</h2>
      <p>
        The design system is maintained by the eMedicalls Design Systems team with contributions
        from product squads. Changes follow a structured process:
      </p>
      <ol>
        <li><strong>Proposal</strong> — Anyone can propose a new component, token, or pattern via the contribution process.</li>
        <li><strong>Review</strong> — The DS team reviews for consistency, accessibility, and cross-team need.</li>
        <li><strong>Implementation</strong> — Once approved, the component is built, documented, and tested.</li>
        <li><strong>Release</strong> — Published as part of the regular release cycle (see <a href="/design/release-phases">Release phases</a>).</li>
      </ol>

      <h2>Release phases</h2>
      <table className="ds-token-table">
        <thead>
          <tr><th>Phase</th><th>Description</th><th>Stability</th></tr>
        </thead>
        <tbody>
          <tr><td>Experimental</td><td>Internal testing, API may change.</td><td>Low</td></tr>
          <tr><td>Beta</td><td>Stable API, open for early adoption.</td><td>Medium</td></tr>
          <tr><td>Stable</td><td>Production-ready, fully documented.</td><td>High</td></tr>
          <tr><td>Deprecated</td><td>Slated for removal. Migrate to replacement.</td><td>None</td></tr>
        </tbody>
      </table>

      <h2>Versioning</h2>
      <p>
        The design system follows semantic versioning. Major versions include breaking changes
        to tokens or component APIs. Minor versions add features. Patch versions fix bugs.
      </p>

      <div className="ds-callout ds-callout-info">
        <span className="ds-callout-icon">ℹ</span>
        <div>
          This documentation site is the canonical source of truth. Figma files and Storybook
          are kept in sync, but this site always reflects the latest state.
        </div>
      </div>

      <h2>Related</h2>
      <ul>
        <li><a href="/design/release-phases">Release phases</a></li>
        <li><a href="/design/contact">Contact the team</a></li>
        <li><a href="/design/get-started/develop">Developer setup</a></li>
      </ul>
    </>
  )
}
