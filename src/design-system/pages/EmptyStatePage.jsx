import { TokenTable, DoDont, Callout, RelatedLinks, Preview, CodeBlock, PropsTable, Section } from '../shared'

export default function EmptyStatePage() {
  return (
    <>
      <div className="ds-page-header">
        <div className="ds-page-breadcrumb">Components / Empty States</div>
        <h1 className="ds-page-title">Empty States</h1>
        <p className="ds-page-description">
          Placeholder content shown when a section has no data — providing context and clear next steps.
        </p>
      </div>

      <Section title="Overview">
        <p>
          The <code>EmptyState</code> component displays an image, title, and optional description
          when a section has no data to show. It's used across the app for empty bookings lists,
          pharmacy, centers, calendar, and other sections.
        </p>
      </Section>

      <Section title="Live preview">
        <Preview code={`<EmptyState
  image="/img/empty-appointments.svg"
  alt="No appointments"
  title="No upcoming appointments"
  message="Book your first appointment to get started."
/>`}>
          <div style={{ padding: 20, textAlign: 'center', width: '100%' }}>
            <div style={{ width: 160, height: 120, margin: '0 auto 18px', background: 'var(--neutral-100)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-secondary)' }}>No upcoming appointments</div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 6, maxWidth: 240, margin: '6px auto 0' }}>
              Book your first appointment to get started.
            </div>
          </div>
        </Preview>
      </Section>

      <Section title="Props">
        <PropsTable props={[
          { name: 'image', type: 'string', default: '—', description: 'Image source URL' },
          { name: 'alt', type: 'string', default: "''", description: 'Image alt text for accessibility' },
          { name: 'title', type: 'string', default: "'Coming soon'", description: 'Primary heading text' },
          { name: 'message', type: 'string', default: '—', description: 'Optional description text' },
        ]} />
      </Section>

      <Section title="Implementation">
        <CodeBlock title="Component" code={`function EmptyState({ image, alt = '', title = 'Coming soon', message }) {
  return (
    <div className="empty-state">
      {image && <img className="empty-state-image" src={image} alt={alt} />}
      <p className="empty-state-title">{title}</p>
      {message && <p className="empty-state-copy">{message}</p>}
    </div>
  )
}`} />

        <CodeBlock title="CSS" code={`.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  width: 100%;
  padding: var(--space-3) var(--space-2);
}

.empty-state-image {
  width: min(220px, 68vw);
  height: auto;
  object-fit: contain;
  margin-bottom: 18px;
}

.empty-state-title {
  font-size: var(--text-title-size);      /* 16px */
  font-weight: var(--font-weight-semibold);
  color: var(--text-secondary);
}

.empty-state-copy {
  font-size: var(--text-body-size);       /* 14px */
  color: var(--text-secondary);
  margin-top: var(--space-1-5);           /* 6px */
  max-width: 240px;
}`} />
      </Section>

      <Section title="Where empty states appear">
        <ul>
          <li><code>PharmacyPage</code> — "Coming soon" placeholder</li>
          <li><code>CentersPage</code> — "Coming soon" placeholder</li>
          <li><code>CalendarPage</code> — Empty calendar state</li>
          <li><code>TreatPage</code> — Empty care history (inline text, not EmptyState component)</li>
          <li><code>SearchSuggestions</code> — "No results" message (inline, not EmptyState component)</li>
        </ul>
      </Section>

      <DoDont
        dos={[
          'Use empty states for sections that might have data but currently don\'t (e.g., no appointments).',
          'Provide a clear title that explains what the section is for.',
          'Include a primary action when possible ("Book appointment", "Add record").',
        ]}
        donts={[
          'Use empty states for features that don\'t exist yet. Use Coming Soon or placeholder content.',
          'Show empty states for content that loads asynchronously. Use skeletons instead.',
          'Leave empty states without a clear next step. Users should always know what to do.',
        ]}
      />

      <RelatedLinks links={[
        { label: 'Skeletons', path: '/design/components/skeletons' },
        { label: 'Color', path: '/design/foundations/color' },
      ]} />
    </>
  )
}
