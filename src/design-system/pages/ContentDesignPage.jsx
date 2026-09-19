export default function ContentDesignPage() {
  return (
    <>
      <div className="ds-page-header">
        <div className="ds-page-breadcrumb">Get started / Content design</div>
        <h1 className="ds-page-title">Content design</h1>
        <p className="ds-page-description">
          Writing guidelines for Health Hero interfaces — clear, compassionate, and action-oriented.
        </p>
      </div>

      <h2>Voice and tone</h2>
      <p>
        Health Hero speaks with clarity and warmth. We are professional but never cold,
        reassuring but never patronizing. Our language helps users feel confident in their
        healthcare decisions.
      </p>

      <h3>Voice attributes</h3>
      <ul>
        <li><strong>Clear</strong> — Plain language, no medical jargon unless contextually appropriate.</li>
        <li><strong>Compassionate</strong> — Acknowledge the user's situation without being dramatic.</li>
        <li><strong>Direct</strong> — Lead with the action or information the user needs.</li>
        <li><strong>Trustworthy</strong> — Be precise and honest about what we can and cannot do.</li>
      </ul>

      <div className="ds-do-dont-grid">
        <div className="ds-do-card">
          <h4>Do</h4>
          <p>"Your appointment is confirmed for March 15 at 2:30 PM with Dr. Sharma."</p>
        </div>
        <div className="ds-dont-card">
          <h4>Don't</h4>
          <p>"Your booking has been successfully processed and is now pending confirmation in the system."</p>
        </div>
      </div>

      <div className="ds-do-dont-grid">
        <div className="ds-do-card">
          <h4>Do</h4>
          <p>"We couldn't find available slots for this date. Try another date?"</p>
        </div>
        <div className="ds-dont-card">
          <h4>Don't</h4>
          <p>"Error: No data available for the selected parameters."</p>
        </div>
      </div>

      <h2>UI writing principles</h2>
      <ol>
        <li><strong>Lead with the action</strong> — "Book appointment" not "Appointment booking option".</li>
        <li><strong>Be concise</strong> — Every word should earn its place. If a sentence can be shorter, make it shorter.</li>
        <li><strong>Use active voice</strong> — "We sent your prescription" not "Your prescription was sent."</li>
        <li><strong>Be specific</strong> — "Available tomorrow at 3 PM" not "Available soon."</li>
        <li><strong>Error messages should help</strong> — Explain what went wrong and what to do next.</li>
      </ol>

      <h2>Microcopy patterns</h2>
      <h3>Empty states</h3>
      <p>Explain what the space is for, then give a clear next step.</p>
      <pre><code>{`// Good
"No upcoming appointments"
"Book your first appointment to get started."

// Bad
"Nothing here yet."`}</code></pre>

      <h3>Loading states</h3>
      <p>Use descriptive loading text when the action matters.</p>
      <pre><code>{`// Good
"Finding available slots..."
"Processing your payment..."

// Bad
"Please wait..."
"Loading..."`}</code></pre>

      <h3>Confirmation dialogs</h3>
      <p>State the consequence clearly, then offer the action.</p>
      <pre><code>{`// Good
Title: "Cancel appointment?"
Body: "This will cancel your appointment with Dr. Sharma on March 15. You can rebook later."
Action: "Yes, cancel"`}</code></pre>

      <h2>Formatting conventions</h2>
      <ul>
        <li>Use sentence case for UI text (not Title Case).</li>
        <li>Use numerals for numbers 10+ ("12 patients") and words for 1-9 ("3 doctors").</li>
        <li>Use relative dates for recent events ("2 hours ago") and absolute for future ("March 15").</li>
        <li>Use "Cancel" as the dismiss action; "Done" for completion.</li>
      </ul>

      <h2>Related</h2>
      <ul>
        <li><a href="/design/foundations/content">Content foundations</a></li>
        <li><a href="/design/foundations/typography">Typography</a></li>
        <li><a href="/design/get-started/design">Design principles</a></li>
      </ul>
    </>
  )
}
