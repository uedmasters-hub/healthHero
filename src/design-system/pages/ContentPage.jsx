export default function ContentPage() {
  return (
    <>
      <div className="ds-page-header">
        <div className="ds-page-breadcrumb">Foundations / Content</div>
        <h1 className="ds-page-title">Content</h1>
        <p className="ds-page-description">
          Patterns and guidelines for content structure across Health Hero surfaces.
        </p>
      </div>

      <h2>Content hierarchy</h2>
      <p>
        Every screen has a clear information hierarchy. Users should be able to scan a page
        and understand the most important information within 3 seconds.
      </p>

      <h3>Page structure</h3>
      <ol>
        <li><strong>Page title</strong> — What is this page about? (1 per page)</li>
        <li><strong>Primary action</strong> — What should the user do next? (1 prominent CTA)</li>
        <li><strong>Supporting content</strong> — Context and details that inform the action.</li>
        <li><strong>Secondary actions</strong> — Less important options, visually subordinate.</li>
      </ol>

      <h2>Text styles</h2>
      <table className="ds-token-table">
        <thead>
          <tr><th>Style</th><th>Use case</th><th>Token</th></tr>
        </thead>
        <tbody>
          <tr><td>Display</td><td>Hero numbers, stats</td><td><code>--text-display-size</code></td></tr>
          <tr><td>Heading</td><td>Section headers</td><td><code>--text-heading-size</code></td></tr>
          <tr><td>Title</td><td>Card titles, list items</td><td><code>--text-title-size</code></td></tr>
          <tr><td>Body</td><td>Paragraphs, descriptions</td><td><code>--text-body-size</code></td></tr>
          <tr><td>Label</td><td>Form labels, metadata</td><td><code>--text-label-size</code></td></tr>
          <tr><td>Caption</td><td>Timestamps, fine print</td><td><code>--text-caption-size</code></td></tr>
          <tr><td>Overline</td><td>Category tags, section labels</td><td><code>--text-overline-size</code></td></tr>
        </tbody>
      </table>

      <h2>Content patterns</h2>
      <h3>List items</h3>
      <p>
        Each list item should have a clear primary text and optional secondary text.
        Keep list items scannable — aim for 1-2 lines of text per item.
      </p>

      <h3>Cards</h3>
      <p>
        Cards contain a title, optional description, and a primary action.
        Avoid cramming too much content into a single card.
      </p>

      <h3>Empty states</h3>
      <p>Every empty state needs three things:</p>
      <ol>
        <li>A clear heading explaining the state</li>
        <li>A brief description of what the user can do</li>
        <li>A primary action button to resolve the state</li>
      </ol>

      <h2>Writing for healthcare</h2>
      <ul>
        <li>Use plain language — avoid medical jargon when possible.</li>
        <li>Be specific about timeframes and actions.</li>
        <li>Avoid alarming language for error states.</li>
        <li>Include relevant context for medical information.</li>
      </ul>

      <h2>Related</h2>
      <ul>
        <li><a href="/design/get-started/content-design">Content design guidelines</a></li>
        <li><a href="/design/foundations/typography">Typography</a></li>
        <li><a href="/design/foundations/color">Color</a></li>
      </ul>
    </>
  )
}
