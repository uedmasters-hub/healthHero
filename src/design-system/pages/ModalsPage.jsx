import { useState } from 'react'

export default function ModalsPage() {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <div className="ds-page-header">
        <div className="ds-page-breadcrumb">Components / Modals</div>
        <h1 className="ds-page-title">Modals</h1>
        <p className="ds-page-description">
          Overlay dialogs that require user attention or confirmation before proceeding.
        </p>
      </div>

      <h2>Modal preview</h2>
      <div className="ds-preview">
        <div className="ds-preview-stage">
          <button className="ds-showcase-btn ds-showcase-btn-primary" onClick={() => setShowModal(true)}>
            Open modal
          </button>
        </div>
      </div>

      {showModal && (
        <div className="ds-showcase-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="ds-showcase-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ds-showcase-modal-title">Cancel appointment?</div>
            <div className="ds-showcase-modal-body">
              This will cancel your appointment with Dr. Sharma on March 15. You can rebook later.
            </div>
            <div className="ds-showcase-modal-actions">
              <button className="ds-showcase-btn ds-showcase-btn-secondary" onClick={() => setShowModal(false)}>Keep appointment</button>
              <button className="ds-showcase-btn ds-showcase-btn-danger" onClick={() => setShowModal(false)}>Yes, cancel</button>
            </div>
          </div>
        </div>
      )}

      <h2>Modal anatomy</h2>
      <ul>
        <li><strong>Scrim</strong> — Semi-transparent overlay behind the modal (<code>--overlay-strong</code>).</li>
        <li><strong>Container</strong> — White panel with <code>--radius-lg</code> and <code>--shadow-modal</code>.</li>
        <li><strong>Title</strong> — Bold heading that states the purpose of the modal.</li>
        <li><strong>Body</strong> — Supporting content, description, or form fields.</li>
        <li><strong>Actions</strong> — Button group aligned to the right. Primary action on the left, destructive on the right.</li>
      </ul>

      <h2>Tokens</h2>
      <table className="ds-token-table">
        <thead>
          <tr><th>Property</th><th>Token</th><th>Value</th></tr>
        </thead>
        <tbody>
          <tr><td>Scrim</td><td><code>--overlay-strong</code></td><td>rgba(15, 23, 42, 0.5)</td></tr>
          <tr><td>Background</td><td><code>--card-bg</code></td><td>#FFFFFF</td></tr>
          <tr><td>Border radius</td><td><code>--radius-lg</code></td><td>16px</td></tr>
          <tr><td>Shadow</td><td><code>--shadow-modal</code></td><td>0 16px 40px rgba(17,24,39,0.18)</td></tr>
          <tr><td>Z-index</td><td><code>--z-overlay</code></td><td>1000</td></tr>
        </tbody>
      </table>

      <h2>Usage guidelines</h2>
      <div className="ds-do-dont-grid">
        <div className="ds-do-card">
          <h4>Do</h4>
          <p>Use modals for critical decisions that need user confirmation (cancellation, deletion, payment).</p>
        </div>
        <div className="ds-dont-card">
          <h4>Don't</h4>
          <p>Use modals for non-urgent information. Prefer inline content or bottom sheets for less critical content.</p>
        </div>
      </div>

      <h2>Accessibility</h2>
      <ul>
        <li>Focus is trapped inside the modal when open.</li>
        <li>Escape key closes the modal.</li>
        <li>Clicking the scrim closes the modal.</li>
        <li>Focus returns to the trigger element when closed.</li>
        <li>Modal has <code>role="dialog"</code> and <code>aria-modal="true"</code>.</li>
      </ul>

      <h2>Related</h2>
      <ul>
        <li><a href="/design/foundations/elevation">Elevation</a></li>
        <li><a href="/design/components/buttons">Buttons</a></li>
        <li><a href="/design/foundations/motion">Motion</a></li>
      </ul>
    </>
  )
}
