import { TokenTable, DoDont, RelatedLinks, CodeBlock, Section } from '../shared'

export default function BookingFlowPage() {
  return (
    <>
      <div className="ds-page-header">
        <div className="ds-page-breadcrumb">Rovo UI / Booking Flow</div>
        <h1 className="ds-doc-title">Booking Flow</h1>
        <p className="ds-page-description">
          A 4-step wizard for booking doctor appointments — provider selection, slot picker,
          patient selection, and confirmation with payment.
        </p>
      </div>

      <Section title="Overview">
        <p>
          The booking flow is the core transactional pattern in eMedicalls. It guides users
          through selecting a doctor, choosing a time slot, selecting the patient, and confirming
          the booking with payment details. Each step is a separate route under <code>/booking</code>.
        </p>
      </Section>

      <Section title="Flow steps">
        <div style={{ display: 'flex', gap: 12, margin: '0 0 24px', flexWrap: 'wrap' }}>
          {[
            { step: '1', label: 'Select Provider', route: '/booking', desc: 'Choose from recommended or searched doctors' },
            { step: '2', label: 'Select Slot', route: '/booking/slot', desc: 'Pick date and time from available slots' },
            { step: '3', label: 'Select Patient', route: '/booking/patient', desc: 'Choose who the appointment is for' },
            { step: '4', label: 'Confirm', route: '/booking/confirm', desc: 'Review details, add notes, confirm booking' },
          ].map((s) => (
            <div key={s.step} style={{ flex: '1 1 200px', padding: 16, background: 'white', border: '1px solid var(--border)', borderRadius: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#4e2a84', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{s.step}</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{s.label}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.desc}</div>
              <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 4, fontFamily: 'monospace' }}>{s.route}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Route structure">
        <CodeBlock title="Router config (App.jsx)" code={`<Route path="/booking" element={<BookingFlow />}>
  <Route index element={<SelectProvider />} />
  <Route path="slot" element={<SelectSlot />} />
  <Route path="patient" element={<SelectPatient />} />
  <Route path="confirm" element={<ConfirmBooking />} />
</Route>`} />
      </Section>

      <Section title="Step 1: Select Provider">
        <p>
          Displays a list of available doctors with the <code>DoctorCard</code> component
          in <code>row</code> variant. Users can filter by specialty and search by name.
        </p>
        <CodeBlock title="Booking step shell (BookingFlow)" code={`<div className="booking-layout">
  <AppBar title="Choose Date & Time" onBack={goBack} />   {/* + Steps progress */}
  <div className="select-slot-scroll">
    <DoctorCard variant="profile" disableNavigate />
    <WeeklySchedule />                                   {/* ds-segmented + ds-chip slots */}
  </div>
  <div className="app-flow-footer">
    <button className="app-flow-cta" disabled={!selected}>Continue</button>
  </div>
</div>`} />
      </Section>

      <Section title="Step 2: Select Slot">
        <p>
          A calendar view (<code>DatePicker</code>) with available time slots.
          Slots are grouped by day and displayed as selectable chips.
        </p>
      </Section>

      <Section title="Step 3: Select Patient">
        <p>
          Lists family members from the user's profile. Users can select an existing patient
          or add a new one. Uses <code>DoctorCard</code> in <code>identity</code> context.
        </p>
      </Section>

      <Section title="Step 4: Confirm Booking">
        <p>
          Shows a summary of all booking details with the doctor card, slot, patient info,
          and payment details. Includes a notes textarea and the final CTA.
        </p>
        <CodeBlock title="ConfirmBooking structure" code={`<div className="confirm-page">
  <div className="confirm-scroll">
    <DoctorCard variant="profile" disableNavigate />
    <section>
      <SectionHead group title="Patient" action={<Button variant="text" size="sm">Change patient</Button>} />
      <List>
        <DetailRow icon={<Icon.User />} label="Name" value={patient.name} />
        <DetailRow icon={<Icon.Calendar />} label="Date" value={dateStr} />
      </List>
    </section>
    <FormGroup label="Note for the doctor">
      <textarea className="ds-field" rows={4} />
    </FormGroup>
    <MedicalRecordsPicker />                              {/* chip tabs + CheckboxMark rows */}
  </div>
  <div className="app-flow-footer">
    <button className="app-flow-cta">Pay & Confirm · Rs. {fee}<Icon.ArrowRight /></button>
  </div>
</div>`} />
      </Section>

      <Section title="Tokens used">
        <TokenTable tokens={[
          { token: '--app-flow-cta-height', value: '52px', usage: 'CTA button height' },
          { token: '--radius-cta', value: 'pill', usage: 'CTA border radius' },
          { token: '--page-padding', value: '20px', usage: 'Page horizontal padding' },
          { token: '--section-gap', value: '24px', usage: 'Gap between content sections' },
          { token: '--card-padding', value: '16px', usage: 'Card internal padding' },
          { token: '--app-flow-footer-pad-top', value: '14px', usage: 'Footer top padding' },
        ]} />
      </Section>

      <DoDont
        dos={[
          'Show progress clearly — users should always know which step they\'re on.',
          'Allow backward navigation — users need to go back to previous steps.',
          'Validate each step before allowing progression to the next.',
        ]}
        donts={[
          'Skip steps or combine them. Each step has a distinct purpose.',
          'Show the full booking summary on every step. Save it for the confirmation step.',
          'Allow booking without patient selection. Always require a patient.',
        ]}
      />

      <RelatedLinks links={[
        { label: 'Buttons', path: '/design/components/buttons' },
        { label: 'Cards', path: '/design/components/cards' },
        { label: 'Inputs', path: '/design/components/inputs' },
        { label: 'Skeleton Strategy', path: '/design/rovo-ui/skeleton-strategy' },
      ]} />
    </>
  )
}
