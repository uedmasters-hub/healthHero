import { DoDont, RelatedLinks, Preview, PropsTable, Section } from '../shared'
import { Button, EmptyState, Icon } from '../../components/ui'

export default function EmptyStatePage() {
  return (
    <>
      <div className="ds-page-header">
        <div className="ds-page-breadcrumb">Components / Empty States</div>
        <h1 className="ds-doc-title">Empty States</h1>
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
  card
  icon={<Icon.Calendar />}
  title="No upcoming appointments"
  message="Book your first appointment to get started."
  action={<Button size="sm">Book appointment</Button>}
/>`}>
          <div style={{ width: '100%', maxWidth: 360 }}>
            <EmptyState
              card
              icon={<Icon.Calendar />}
              title="No upcoming appointments"
              message="Book your first appointment to get started."
              action={<Button size="sm">Book appointment</Button>}
            />
          </div>
        </Preview>
      </Section>

      <Section title="Props">
        <PropsTable props={[
          { name: 'icon', type: 'node', default: '—', description: 'Icon rendered in a large icon well' },
          { name: 'image', type: 'string', default: '—', description: 'Illustration URL (takes precedence over icon)' },
          { name: 'title', type: 'string', default: '—', description: 'Primary line — medium, brand ink' },
          { name: 'message', type: 'string', default: '—', description: 'Supporting copy — secondary text' },
          { name: 'action', type: 'node', default: '—', description: 'Usually one Button' },
          { name: 'card / compact', type: 'boolean', default: 'false', description: 'White hairline card / tighter spacing' },
        ]} />
      </Section>

      <Section title="Implementation">
        <p>
          <code>EmptyState</code> lives in <code>src/components/ui</code> and renders <code>.ds-empty</code>
          (<code>__media</code>, <code>__title</code>, <code>__copy</code>, <code>__actions</code>) from
          <code>primitives.css</code>. The legacy <code>components/EmptyState.jsx</code> adapter forwards to it.
        </p>
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
