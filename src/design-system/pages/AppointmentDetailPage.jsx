import { TokenTable, DoDont, Callout, RelatedLinks, CodeBlock, Section } from '../shared'

export default function AppointmentDetailPage() {
  return (
    <>
      <div className="ds-page-header">
        <div className="ds-page-breadcrumb">Rovo UI / Appointment Detail</div>
        <h1 className="ds-page-title">Appointment Detail</h1>
        <p className="ds-page-description">
          Comprehensive appointment view with countdown, pre-visit checklist, records, payment,
          and FAQ — the primary screen for managing a specific appointment.
        </p>
      </div>

      <Section title="Overview">
        <p>
          The Appointment Detail screen is a full-page view at <code>/appointment/:id</code> that
          displays everything a patient needs to know about a specific booking. It includes
          a skeleton loading state, hero card, countdown timer, checklist, records, payment info,
          and FAQ sections.
        </p>
      </Section>

      <Section title="Screen structure">
        <CodeBlock title="AppointmentDetail layout" code={`<div className="appointment-detail-page">
  {/* Skeleton loading */}
  <AppointmentDetailSkeleton />

  {/* Hero card with doctor image */}
  <div className="appointment-detail-hero">
    <img className="appointment-detail-hero-img" src={doctorImage} />
  </div>

  {/* Main content */}
  <div className="appointment-detail-content">
    <AppointmentCountdown />     {/* Countdown or "completed" status */}
    <PostVisitSummary />         {/* Doctor card + care summary */}
    <AppointmentChecklist />     {/* Pre-visit checklist with progress */}
    <AppointmentRecords />       {/* Medical records */}
    <AppointmentPayment />       {/* Payment details */}
    <AppointmentFAQ />           {/* Frequently asked questions */}
  </div>
</div>`} />
      </Section>

      <Section title="AppointmentCountdown">
        <p>
          Shows days, hours, and minutes until the appointment. Uses <code>useCountdown</code>
          hook with 1-second intervals. Displays "Appointment completed" for past appointments.
        </p>
        <CodeBlock title="Countdown display" code={`<div className="countdown-bar">
  <div className="countdown-item">
    <span className="countdown-value">3</span>
    <span className="countdown-label">Days</span>
  </div>
  <div className="countdown-separator">:</div>
  <div className="countdown-item">
    <span className="countdown-value">14</span>
    <span className="countdown-label">Hrs</span>
  </div>
  <div className="countdown-separator">:</div>
  <div className="countdown-item">
    <span className="countdown-value">27</span>
    <span className="countdown-label">Min</span>
  </div>
</div>`} />
      </Section>

      <Section title="AppointmentChecklist">
        <p>
          A progress bar with checklist items that patients need to complete before their appointment.
          Each item is a tappable row with a checkbox and label. Progress is shown as a colored bar.
        </p>
        <CodeBlock title="Checklist structure" code={`<div className="appointment-checklist">
  <div className="appointment-checklist-header">
    <h3>Checklist</h3>
    <span className="appointment-checklist-count">2 of 4</span>
  </div>
  <div className="appointment-checklist-progress">
    <div className="appointment-checklist-progress-bar" style={{ width: '50%' }} />
  </div>
  {items.map(item => (
    <button className="appointment-checklist-item" onClick={() => toggle(item)}>
      <div className={\`appointment-checklist-checkbox \${item.checked ? 'checked' : ''}\`} />
      <span>{item.label}</span>
    </button>
  ))}
</div>`} />
      </Section>

      <Section title="AppointmentDetailSkeleton">
        <p>
          A skeleton version of the appointment detail screen that shows during loading.
          Uses the shimmer primitive with shapes that match the final layout.
        </p>
      </Section>

      <Section title="Tokens used">
        <TokenTable tokens={[
          { token: '--countdown-value', value: '22px', usage: 'Countdown number font size' },
          { token: '--countdown-label', value: '10px', usage: 'Countdown label font size' },
          { token: '--progress-bar-height', value: '3px', usage: 'Checklist progress bar height' },
          { token: '--radius-full', value: '999px', usage: 'Checklist checkbox border-radius' },
          { token: '--icon-btn-size', value: '44px', usage: 'Checklist item touch target' },
          { token: '--space-4', value: '16px', usage: 'Section spacing' },
          { token: '--shadow-card', value: '0 4px 16px rgba(17,24,39,0.05)', usage: 'Card shadow' },
        ]} />
      </Section>

      <DoDont
        dos={[
          'Show a skeleton while the appointment data loads. This prevents layout shift.',
          'Display the countdown prominently — it\'s the most time-sensitive information.',
          'Organize content into clear sections with consistent spacing.',
        ]}
        donts={[
          'Show all sections at once without hierarchy. Prioritize countdown and checklist.',
          'Hide the back button. Users always need to return to the appointments list.',
          'Use static counts for the countdown. It should update in real-time.',
        ]}
      />

      <RelatedLinks links={[
        { label: 'Skeleton Strategy', path: '/design/rovo-ui/skeleton-strategy' },
        { label: 'Cards', path: '/design/components/cards' },
        { label: 'Motion', path: '/design/foundations/motion' },
      ]} />
    </>
  )
}
