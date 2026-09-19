export default function ContactPage() {
  return (
    <>
      <div className="ds-page-header">
        <div className="ds-page-breadcrumb">Contact</div>
        <h1 className="ds-page-title">Contact us</h1>
        <p className="ds-page-description">
          Reach the Health Hero Design System team for support, contributions, and feedback.
        </p>
      </div>

      <h2>Get in touch</h2>
      <p>
        The design system team is here to help. Whether you need guidance on implementing
        a component, want to propose a new pattern, or have feedback on existing documentation,
        we'd love to hear from you.
      </p>

      <h2>Contact channels</h2>
      <table className="ds-token-table">
        <thead>
          <tr><th>Channel</th><th>Purpose</th><th>Response time</th></tr>
        </thead>
        <tbody>
          <tr><td><strong>Slack</strong></td><td>Quick questions, discussions, announcements</td><td>Within 4 hours</td></tr>
          <tr><td><strong>GitHub Issues</strong></td><td>Bug reports, feature requests, component proposals</td><td>Within 24 hours</td></tr>
          <tr><td><strong>Email</strong></td><td>Private inquiries, partnership requests</td><td>Within 48 hours</td></tr>
          <tr><td><strong>Office hours</strong></td><td>Live support, design reviews, architecture discussions</td><td>Weekly (Thursdays)</td></tr>
        </tbody>
      </table>

      <h2>Contributing</h2>
      <p>
        We welcome contributions from all teams. Here's how to get involved:
      </p>
      <ol>
        <li><strong>Report issues</strong> — Found a bug or inconsistency? Open a GitHub issue with reproduction steps.</li>
        <li><strong>Propose components</strong> — Have a pattern that other teams could use? Submit a component proposal.</li>
        <li><strong>Submit PRs</strong> — Want to fix a bug or add a feature? Fork the repo and submit a pull request.</li>
        <li><strong>Review RFCs</strong> — Participate in design system RFCs to shape the future of the system.</li>
      </ol>

      <h2>Office hours</h2>
      <div className="ds-callout ds-callout-success">
        <span className="ds-callout-icon">📅</span>
        <div>
          <strong>Thursdays, 2:00 - 3:00 PM IST</strong><br />
          Drop in for live support, design reviews, or architecture discussions.
          No agenda required — just bring your questions.
        </div>
      </div>

      <h2>FAQ</h2>
      <h3>Can I use the design system in a non-Health Hero project?</h3>
      <p>
        The design system is internal to Health Hero. However, the design principles and
        documentation approach may be useful as reference for building your own system.
      </p>

      <h3>How do I request a new component?</h3>
      <p>
        Open a GitHub issue with the "component proposal" label. Include the use case,
        existing patterns you've considered, and any design mockups.
      </p>

      <h3>Where do I report accessibility issues?</h3>
      <p>
        Open a GitHub issue with the "accessibility" label. Include the screen, component,
        and specific WCAG criterion that isn't being met.
      </p>

      <h2>Related</h2>
      <ul>
        <li><a href="/design/get-started/about">About the design system</a></li>
        <li><a href="/design/release-phases">Release phases</a></li>
        <li><a href="/design/tools">Tools</a></li>
      </ul>
    </>
  )
}
