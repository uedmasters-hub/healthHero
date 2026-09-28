import { TokenTable, DoDont, Callout, RelatedLinks, CodeBlock, Section } from '../shared'

export default function AppointmentDetailPage() {
  return (
    <>
      <div className="ds-page-header">
        <div className="ds-page-breadcrumb">Rovo UI / Appointment Detail</div>
        <h1 className="ds-doc-title">Appointment Detail</h1>
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
        <p>
          Built entirely from shared primitives in <code>src/components/ui</code> — the page file only
          lays out sections. Every section is a caps <code>SectionHead group</code> over a white card or
          grouped <code>List</code> on the lavender canvas.
        </p>
        <CodeBlock title="AppointmentDetail layout" code={`<div className="ds-page appointment-page">
  <AppBar title="Appointment details" actions={<IconButton label="More"><Icon.More /></IconButton>} />
  <div className="ds-page__body has-fixed-footer">
    <Badge tone="ready"><Icon.Clock />Appointment in 52 min</Badge>
    <Callout className="relay-panel is-checkin" title={relay.label}>{relay.message}</Callout>

    <div className="ds-card is-padded">           {/* shared-hero target */}
      <DoctorCard context="identity" />
      <InfoGrid>
        <InfoCell icon={<Icon.Calendar />} label="Date" value={dateStr} />
        <InfoCell icon={<Icon.Clock />} label="Time" value={time} />
      </InfoGrid>
      <div className="ds-action-row">
        <QuickAction icon={<Icon.Directions />} label="Directions" />
      </div>
    </div>

    <section>
      <SectionHead group title="Before your visit" />
      <List>{/* role="checkbox" rows with <CheckboxMark /> */}</List>
    </section>
    <List><Disclosure title="When to seek urgent care">…</Disclosure></List>
  </div>
  <StickyFooterCta primaryLabel="I'm ready for my visit" />
</div>`} />
      </Section>

      <Section title="Countdown">
        <p>
          A single <code>Badge</code> — <code>tone="ready"</code> normally, <code>tone="warning"</code> once
          editing is locked close to the visit. It re-renders from <code>useNow()</code>; no bespoke countdown markup.
        </p>
      </Section>

      <Section title="Checklist">
        <p>
          Rows are <code>.ds-list-row</code> buttons with <code>role="checkbox"</code> and
          <code>aria-checked</code>; the shared <code>CheckboxMark</code> fills in CTA ink when checked.
        </p>
        <CodeBlock title="Checklist row" code={`<List>
  {items.map((item, i) => (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked.includes(i)}
      className="ds-list-row"
      onClick={() => toggle(i)}
    >
      <CheckboxMark />
      <span className="ds-list-row__body"><span className="ds-list-row__title">{item}</span></span>
    </button>
  ))}
</List>`} />
      </Section>

      <Section title="AppointmentDetailSkeleton">
        <p>
          A skeleton version of the appointment detail screen that shows during loading.
          Uses the shimmer primitive with shapes that match the final layout.
        </p>
      </Section>

      <Section title="Tokens used">
        <TokenTable tokens={[
          { token: '--card-radius', value: '24px', usage: 'Summary and payment cards' },
          { token: '--card-border', value: '1px primary-800 @ 12%', usage: 'Hairline on every card and list' },
          { token: '--badge-ready-bg', value: 'success-300', usage: 'Countdown badge' },
          { token: '--state-hover / --state-pressed', value: 'primary-300 / mix', usage: 'Row and card interaction' },
          { token: '--sticky-footer-clearance', value: 'calc(…)', usage: 'Body padding above the sticky CTA' },
          { token: '--section-gap', value: '24px', usage: 'Space between sections' },
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
