import { TokenTable, DoDont, Callout, RelatedLinks, CodeBlock, Section } from '../shared'

export default function BookingFlowPage() {
  return (
    <>
      <div className="ds-page-header">
        <div className="ds-page-breadcrumb">Rovo UI / Booking Flow</div>
        <h1 className="ds-page-title">Booking Flow</h1>
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
            <div key={s.step} style={{ flex: '1 1 200px', padding: 16, background: 'white', border: '1px solid #eef0f3', borderRadius: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#5b5fc6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{s.step}</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{s.label}</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>{s.desc}</div>
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4, fontFamily: 'monospace' }}>{s.route}</div>
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
        <CodeBlock title="SelectProvider structure" code={`<div className="booking-page">
  <div className="booking-header">
    <button className="booking-back-btn" />
    <h1 className="booking-title">Select Provider</h1>
  </div>
  <div className="booking-body">
    <SearchField placeholder="Search Doctor" />
    <div className="booking-doctor-list">
      {doctors.map(doctor => (
        <DoctorCard key={doctor.id} doctor={doctor} variant="row" context="booking" />
      ))}
    </div>
  </div>
  <AppFlowFooter>
    <button className="app-flow-cta" disabled={!selected}>Continue</button>
  </AppFlowFooter>
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
        <CodeBlock title="ConfirmBooking structure" code={`<div className="booking-page">
  <BookingHero />                    {/* DoctorCard with shared hero transition */}
  <div className="booking-confirm-body">
    <ConfirmSummaryRow label="Date" value={date} />
    <ConfirmSummaryRow label="Time" value={time} />
    <ConfirmSummaryRow label="Patient" value={patient.name} />
    <ConfirmSummaryRow label="Type" value={visitType} />
    <textarea className="booking-notes" placeholder="Add notes..." />
  </div>
  <AppFlowFooter>
    <button className="app-flow-cta" onClick={confirm}>
      Confirm Booking — ₹{fee}
    </button>
  </AppFlowFooter>
</div>`} />
      </Section>

      <Section title="Tokens used">
        <TokenTable tokens={[
          { token: '--app-flow-cta-height', value: '52px', usage: 'CTA button height' },
          { token: '--radius-cta', value: '26px', usage: 'CTA border radius' },
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
