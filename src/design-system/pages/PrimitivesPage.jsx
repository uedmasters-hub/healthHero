import { useState } from 'react'
import { Section, Preview, TokenTable, Callout as DocCallout } from '../shared'
import {
  AppBar, Badge, Button, Callout, Card, CheckboxMark, Chip, ChipRow, Choice, ChoiceChips, ChoiceList,
  DetailRow, Disclosure, EmptyState, FormGroup, Icon, IconButton, InfoCell, InfoGrid, List, ListRow,
  Progress, QuickAction, SearchField, SectionHead, SheetHeader, Skeleton, SkeletonText, Steps, Switch,
} from '../../components/ui'

/**
 * Living reference — every block below renders the real primitive from
 * src/components/ui, so this page cannot drift from the product.
 */
export default function PrimitivesPage() {
  const [chip, setChip] = useState('All')
  const [gender, setGender] = useState('Female')
  const [choice, setChoice] = useState('self')
  const [on, setOn] = useState(true)
  const [checked, setChecked] = useState(true)
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="ds-page-header">
        <div className="ds-page-breadcrumb">Components / Primitives</div>
        <h1 className="ds-doc-title">Primitives</h1>
        <p className="ds-page-description">
          The shared building blocks every screen composes. Styles live in <code>src/styles/primitives.css</code>
          and <code>overlays.css</code>; React wrappers live in <code>src/components/ui</code>. Pages add layout only.
        </p>
      </div>

      <DocCallout type="info">
        Rendered live from <code>components/ui</code>. If a screen needs a variant that is missing here, add it to the
        primitive — never restyle a primitive from a page stylesheet.
      </DocCallout>

      <Section title="Buttons">
        <Preview code={`<Button>Book appointment</Button>
<Button variant="secondary">Reschedule</Button>
<Button variant="text" size="sm">Edit</Button>
<Button variant="danger" size="lg" block>Cancel visit</Button>`}>
          <div className="ds-stack" style={{ width: '100%', maxWidth: 360 }}>
            <Button>Book appointment</Button>
            <Button variant="secondary">Reschedule</Button>
            <Button variant="outline" icon={<Icon.Plus />}>Add patient</Button>
            <Button variant="text" size="sm">Edit</Button>
            <Button variant="danger-quiet">Delete</Button>
            <Button size="lg" block trailingIcon={<Icon.ArrowRight />}>Pay & confirm</Button>
          </div>
        </Preview>
        <Preview code={`<IconButton label="More"><Icon.More /></IconButton>
<IconButton tone="subtle" label="Share"><Icon.Share /></IconButton>
<IconButton tone="filled" label="Call"><Icon.Phone /></IconButton>`}>
          <IconButton label="More"><Icon.More /></IconButton>
          <IconButton tone="subtle" label="Share"><Icon.Share /></IconButton>
          <IconButton tone="filled" label="Call"><Icon.Phone /></IconButton>
          <IconButton tone="brand" label="Chat"><Icon.Message /></IconButton>
        </Preview>
      </Section>

      <Section title="Chips, segmented and badges">
        <Preview code={`<ChipRow label="Filter">
  <Chip selected>All</Chip><Chip>Consults</Chip>
</ChipRow>
<ChoiceChips label="Gender" options={['Male','Female','Other']} value={v} onChange={set} />
<Badge tone="success">Paid</Badge>`} vertical>
          <ChipRow label="Filter">
            {['All', 'Consults', 'Labs', 'Rx'].map((item) => (
              <Chip key={item} selected={chip === item} onClick={() => setChip(item)}>{item}</Chip>
            ))}
          </ChipRow>
          <ChoiceChips label="Gender" options={['Male', 'Female', 'Other']} value={gender} onChange={setGender} />
          <div className="ds-chip-row is-wrap">
            {['neutral', 'primary', 'info', 'success', 'warning', 'danger', 'ready', 'solid'].map((tone) => (
              <Badge key={tone} tone={tone}>{tone}</Badge>
            ))}
          </div>
        </Preview>
      </Section>

      <Section title="Cards, lists and rows">
        <Preview code={`<SectionHead group title="Patient" action={<Button variant="text" size="sm">Change</Button>} />
<List>
  <DetailRow icon={<Icon.User />} label="Name" value="Asha Sharma" />
  <ListRow icon={…} title="Health records" onClick={…} />
</List>`} vertical>
          <div style={{ width: '100%', maxWidth: 380 }}>
            <SectionHead group as="h3" title="Patient" action={<Button variant="text" size="sm">Change</Button>} />
            <List>
              <DetailRow icon={<Icon.User />} label="Name" value="Asha Sharma" />
              <DetailRow icon={<Icon.Calendar />} label="Date of birth" emptyLabel="Add date of birth" />
              <ListRow
                icon={<span className="ds-icon-well" aria-hidden="true"><Icon.File /></span>}
                title="Health records"
                trailing={<Badge tone="solid">2</Badge>}
                onClick={() => {}}
              />
              <Disclosure title="When to seek urgent care" open={open} onToggle={() => setOpen((v) => !v)}>
                <p>Severe chest pain, difficulty breathing or signs of stroke need immediate care.</p>
              </Disclosure>
            </List>
          </div>
          <Card padded style={{ width: '100%', maxWidth: 380 }}>
            <InfoGrid>
              <InfoCell icon={<Icon.Calendar />} label="Date" value="Mon, Sep 28" />
              <InfoCell icon={<Icon.Clock />} label="Time" value="9:00 AM" />
            </InfoGrid>
            <div className="ds-action-row" style={{ marginTop: 16 }}>
              <QuickAction icon={<Icon.Directions />} label="Directions" />
              <QuickAction icon={<Icon.Calendar />} label="Calendar" />
              <QuickAction icon={<Icon.Phone />} label="Call" />
            </div>
          </Card>
        </Preview>
      </Section>

      <Section title="Fields and selection">
        <Preview code={`<FormGroup label="Name"><input className="ds-field" /></FormGroup>
<SearchField placeholder="Search doctors" />
<ChoiceList label="Patient"><Choice selected title="Myself" /></ChoiceList>
<Switch checked={on} onChange={setOn} label="SMS reminder" />`} vertical>
          <div className="ds-form" style={{ width: '100%', maxWidth: 380 }}>
            <FormGroup label="Name"><input className="ds-field" placeholder="Full name" /></FormGroup>
            <FormGroup label="Note for the doctor"><textarea className="ds-field" rows={3} /></FormGroup>
            <SearchField placeholder="Search doctors" />
            <ChoiceList label="Who is this for?">
              <Choice selected={choice === 'self'} title="Myself" subtitle="33 yrs · Self" onClick={() => setChoice('self')} />
              <Choice selected={choice === 'mum'} title="Sita Sharma" subtitle="61 yrs · Parent" onClick={() => setChoice('mum')} />
            </ChoiceList>
            <List>
              <div className="ds-list-row">
                <span className="ds-list-row__body"><span className="ds-list-row__title">SMS reminder</span></span>
                <Switch checked={on} onChange={setOn} label="SMS reminder" />
              </div>
              <button type="button" role="checkbox" aria-checked={checked} className="ds-list-row" onClick={() => setChecked((v) => !v)}>
                <CheckboxMark />
                <span className="ds-list-row__body"><span className="ds-list-row__title">Bring photo ID</span></span>
              </button>
            </List>
          </div>
        </Preview>
      </Section>

      <Section title="Feedback">
        <Preview code={`<Callout tone="success" icon={<Icon.Check />} title="Checked in">…</Callout>
<Progress thin tone="brand" value={60} />
<Steps items={[{ title: 'Checked in', state: 'done' }, …]} />
<EmptyState card icon={<Icon.Bell />} title="No notifications yet" />`} vertical>
          <div className="ds-stack" style={{ width: '100%', maxWidth: 380 }}>
            <Callout tone="success" icon={<Icon.Check />} title="Successfully checked in">The clinic team is preparing for your visit.</Callout>
            <Callout tone="warning" icon={<Icon.Alert />} title="Editing locked">Changes close 2 hours before the visit.</Callout>
            <Progress thin tone="brand" value={60} label="Profile completion" />
            <Card padded>
              <Steps
                items={[
                  { key: 1, title: 'Pre-visit checked in', state: 'done', marker: <Icon.Check /> },
                  { key: 2, title: 'Arrive at the clinic', body: 'Arrive by 8:45 AM', state: 'active' },
                  { key: 3, title: 'Meet your doctor' },
                ]}
              />
            </Card>
            <EmptyState card compact icon={<Icon.Bell />} title="No notifications yet" message="Visit updates will appear here." />
            <Card padded>
              <Skeleton shape="circle" width="2.5rem" height="2.5rem" />
              <SkeletonText lines={2} />
            </Card>
          </div>
        </Preview>
      </Section>

      <Section title="Chrome">
        <Preview code={`<AppBar title="Appointment details" onBack={goBack} actions={…} />
<SheetHeader title="Invoice" onClose={close} />`} vertical>
          <div style={{ width: '100%', maxWidth: 380 }}>
            <AppBar title="Appointment details" onBack={() => {}} actions={<IconButton label="More"><Icon.More /></IconButton>} />
          </div>
          <div className="ds-card is-padded" style={{ width: '100%', maxWidth: 380 }}>
            <SheetHeader title="Invoice" onClose={() => {}} />
          </div>
        </Preview>
      </Section>

      <Section title="Rules">
        <TokenTable tokens={[
          { token: 'Buttons', value: 'pill, CTA ink', usage: 'Every tappable action is a Button, IconButton or a ListRow' },
          { token: 'Surfaces', value: 'white + hairline', usage: 'Cards and lists sit on the lavender canvas; no shadows' },
          { token: 'Selection', value: 'ink fill / lavender', usage: 'Chip selected = CTA ink; soft chip & choice = lavender' },
          { token: 'Section labels', value: 'caps group head', usage: 'SectionHead group over grouped lists' },
          { token: 'Motion', value: '200ms ease-in-out', usage: 'Colour-only interaction; reveals 380ms; skeleton sheen 1.55s' },
        ]} />
      </Section>
    </>
  )
}
