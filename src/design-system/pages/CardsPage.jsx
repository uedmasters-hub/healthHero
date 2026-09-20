import { TokenTable, DoDont, Callout, RelatedLinks, Preview, CodeBlock, PropsTable, StatesTable, Section } from '../shared'

export default function CardsPage() {
  return (
    <>
      <div className="ds-page-header">
        <div className="ds-page-breadcrumb">Components / Cards</div>
        <h1 className="ds-page-title">Cards</h1>
        <p className="ds-page-description">
          Surface containers that group related content — the primary content unit in eMedicalls.
          Includes standard cards, doctor cards with 4 variants, and appointment cards.
        </p>
      </div>

      <Section title="Overview">
        <p>
          eMedicalls uses two card primitives defined in <code>src/index.css</code>:
          <code>.ds-card</code> (elevated with shadow) and <code>.ds-card-flat</code> (no shadow).
          The <code>DoctorCard</code> component extends these with 4 layout variants:
          <code>row</code>, <code>grid</code>, <code>list</code>, and <code>profile</code>.
        </p>
      </Section>

      <Section title="Live preview">
        <h3>Standard card (.ds-card)</h3>
        <Preview code={`<div className="ds-card" style={{ padding: 16, borderRadius: 22 }}>
  <h3 style={{ fontSize: 16, fontWeight: 600 }}>Card Title</h3>
  <p style={{ fontSize: 14, color: '#6B7280' }}>Card description text.</p>
</div>`}>
          <div className="ds-card" style={{ padding: 20, maxWidth: 320 }}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Card Title</div>
            <div style={{ fontSize: 14, color: '#6b7280' }}>Card description text with supporting content.</div>
          </div>
        </Preview>

        <h3>Flat card (.ds-card-flat)</h3>
        <Preview code={`<div className="ds-card-flat" style={{ padding: 16, borderRadius: 16 }}>
  <h3 style={{ fontSize: 16, fontWeight: 600 }}>Flat Card</h3>
  <p style={{ fontSize: 14, color: '#6B7280' }}>No shadow, subtle border.</p>
</div>`}>
          <div className="ds-card-flat" style={{ padding: 20, maxWidth: 320 }}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Flat Card</div>
            <div style={{ fontSize: 14, color: '#6b7280' }}>No shadow, subtle border.</div>
          </div>
        </Preview>
      </Section>

      <Section title="Card tokens">
        <TokenTable tokens={[
          { token: '--card-bg', value: '#FFFFFF', usage: 'Card background' },
          { token: '--border', value: '#EEEFF3', usage: 'Card border color' },
          { token: '--border-width', value: '1px', usage: 'Card border width' },
          { token: '--radius-card', value: '22px', usage: 'Card border radius' },
          { token: '--shadow-card', value: '0 4px 16px rgba(17,24,39,0.05)', usage: 'Card elevation shadow' },
          { token: '--shadow-hover', value: '0 4px 16px rgba(91,95,198,0.12)', usage: 'Card hover shadow (brand-tinted)' },
          { token: '--card-padding', value: '16px', usage: 'Internal card padding' },
          { token: '--card-gap', value: '16px', usage: 'Gap between adjacent cards' },
          { token: '--radius-lg', value: '16px', usage: 'Flat card border radius' },
        ]} />
      </Section>

      <Section title="Card anatomy">
        <ul>
          <li><strong>Container</strong> — The card surface (background, border, radius, shadow).</li>
          <li><strong>Media</strong> — Optional image or illustration at the top of the card.</li>
          <li><strong>Title</strong> — Primary text, usually the card's subject.</li>
          <li><strong>Description</strong> — Supporting text that provides context.</li>
          <li><strong>Actions</strong> — Buttons, links, or interactive elements at the bottom.</li>
        </ul>
      </Section>

      <Section title="Card variants">
        <h3>Elevated card (.ds-card)</h3>
        <p>Used for doctor cards, feature panels, and primary content containers. Has shadow and border.</p>

        <h3>Flat card (.ds-card-flat)</h3>
        <p>Used for secondary content, nested containers, and list items within elevated cards.</p>

        <CodeBlock title="CSS" code={`/* Elevated card — primary surfaces */
.ds-card {
  background: var(--card-bg);
  border: var(--border-width) solid var(--border);
  border-radius: var(--radius-card);      /* 22px */
  box-shadow: var(--shadow-card);         /* 0 4px 16px rgba(17,24,39,0.05) */
}

/* Flat card — secondary surfaces */
.ds-card-flat {
  background: var(--card-bg);
  border: var(--border-width) solid var(--border);
  border-radius: var(--radius-lg);        /* 16px */
  box-shadow: none;
}`} />
      </Section>

      <Section title="Usage guidelines">
        <DoDont
          dos={[
            'Use cards to group related content. A card should represent one concept or item.',
            'Use .ds-card for primary content that needs elevation and visual prominence.',
            'Use .ds-card-flat for secondary content or nested containers.',
            'Maintain consistent padding (--card-padding) across all card instances.',
          ]}
          donts={[
            'Nest cards inside cards. This creates confusing visual hierarchy and wasted space.',
            'Use heavy shadows on cards that are already elevated. This looks muddy.',
            'Use different border radii for cards. Stick to --radius-card for consistency.',
          ]}
        />
      </Section>

      <Callout type="info">
        Cards are used extensively in the app: <code>DoctorCard</code> (4 variants),
        <code>AppointmentDetail</code> (summary card), <code>InsightCard</code>,
        <code>PostVisitSummary</code> (doctor card, care summary, follow-up, resources).
        Each adapts the card primitive to its specific context.
      </Callout>

      <RelatedLinks links={[
        { label: 'Elevation', path: '/design/foundations/elevation' },
        { label: 'Radius', path: '/design/foundations/radius' },
        { label: 'Border', path: '/design/foundations/border' },
        { label: 'Buttons', path: '/design/components/buttons' },
      ]} />
    </>
  )
}
