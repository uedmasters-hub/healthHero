import { DoDont, RelatedLinks, Preview, Section, TokenTable } from '../shared'
import { Card, Icon, List, ListRow } from '../../components/ui'

export default function CardsPage() {
  return (
    <>
      <div className="ds-page-header">
        <div className="ds-page-breadcrumb">Components / Cards</div>
        <h1 className="ds-doc-title">Cards</h1>
        <p className="ds-page-description">
          White islands on the lavender canvas — the primary content unit. One primitive, a few modifiers.
        </p>
      </div>

      <Section title="Card">
        <p>
          <code>.ds-card</code> (React: <code>Card</code>) is white with a 12% primary-800 hairline and 24px corners.
          No resting shadow. Modifiers: <code>is-padded</code>, <code>is-compact</code> (16px corners),
          <code>is-interactive</code> (button with hover/pressed tint), <code>is-selected</code>,
          <code>is-tinted</code> (lavender) and <code>is-muted</code>.
        </p>
        <Preview code={`<Card padded>…</Card>
<Card padded compact>…</Card>
<Card interactive padded onClick={open}>…</Card>
<div className="ds-card is-padded is-tinted">…</div>`}>
          <Card padded style={{ width: 200 }}><strong>Card</strong><p className="ds-caption">Default surface</p></Card>
          <Card padded compact style={{ width: 200 }}><strong>Compact</strong><p className="ds-caption">16px corners</p></Card>
          <Card interactive padded style={{ width: 200 }}><strong>Interactive</strong><p className="ds-caption">Hover me</p></Card>
          <div className="ds-card is-padded is-tinted" style={{ width: 200 }}><strong>Tinted</strong><p className="ds-caption">Hero / callout</p></div>
        </Preview>
      </Section>

      <Section title="Grouped list">
        <p>
          Settings-style groups use <code>List</code> (<code>.ds-list</code>) — a card whose rows share hairline dividers.
        </p>
        <Preview code={`<List>
  <ListRow icon={…} title="Personal" onClick={…} />
  <ListRow icon={…} title="Medical" onClick={…} />
</List>`}>
          <div style={{ width: 320 }}>
            <List>
              <ListRow icon={<span className="ds-icon-well"><Icon.User /></span>} title="Personal" onClick={() => {}} />
              <ListRow icon={<span className="ds-icon-well"><Icon.Heart /></span>} title="Medical" onClick={() => {}} />
            </List>
          </div>
        </Preview>
      </Section>

      <Section title="Tokens">
        <TokenTable tokens={[
          { token: '--card-bg', value: 'neutral-0', usage: 'Card and list surface' },
          { token: '--card-border', value: '1px primary-800 @ 12%', usage: 'Hairline edge' },
          { token: '--card-radius / --card-radius-sm', value: '24px / 16px', usage: 'Default / compact corners' },
          { token: '--card-padding', value: '16px', usage: 'is-padded inset' },
          { token: '--state-hover / --state-pressed', value: 'primary-300 / mix', usage: 'Interactive cards and rows' },
        ]} />
      </Section>

      <DoDont
        dos={['Put cards on the lavender canvas (--bg) so the hairline reads.', 'Use List for grouped rows instead of stacking tiny cards.']}
        donts={['Add drop shadows to resting cards.', 'Restyle .ds-card from a page stylesheet — add a modifier to the primitive instead.']}
      />

      <RelatedLinks links={[
        { label: 'Primitives', path: '/design/components/primitives' },
        { label: 'Elevation', path: '/design/foundations/elevation' },
      ]} />
    </>
  )
}
