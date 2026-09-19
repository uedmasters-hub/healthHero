import { TokenTable, DoDont, Callout, RelatedLinks, Preview, CodeBlock, PropsTable, StatesTable, Section } from '../shared'

export default function ButtonsPage() {
  return (
    <>
      <div className="ds-page-header">
        <div className="ds-page-breadcrumb">Components / Buttons</div>
        <h1 className="ds-page-title">Buttons</h1>
        <p className="ds-page-description">
          Interactive elements that trigger actions — the primary way users interact with Health Hero.
          Used across booking flows, appointment details, navigation, and more.
        </p>
      </div>

      <Section title="Overview">
        <p>
          Health Hero uses three button patterns defined in <code>src/index.css</code>:
          the full-width CTA button (<code>.app-flow-cta</code>), the sticky footer CTA
          (<code>.sticky-footer-cta__primary</code>), and icon buttons (<code>.ds-icon-btn</code>).
          Each serves a specific layout context.
        </p>
      </Section>

      <Section title="Live preview">
        <h3>Primary CTA</h3>
        <Preview code={`<button className="app-flow-cta">Book Appointment</button>`}>
          <button className="app-flow-cta" style={{ width: '100%', maxWidth: 340 }}>Book Appointment</button>
        </Preview>

        <h3>Secondary</h3>
        <Preview code={`<button className="sticky-footer-cta__secondary">Back to Home</button>`}>
          <button className="sticky-footer-cta__secondary" style={{ width: '100%', maxWidth: 340 }}>Back to Home</button>
        </Preview>

        <h3>Ghost</h3>
        <Preview code={`<button className="ds-icon-btn is-muted">
  <svg>...</svg>
</button>`}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="ds-icon-btn" style={{ width: 44, height: 44, borderRadius: '50%' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
            </button>
            <button className="ds-icon-btn is-muted" style={{ width: 44, height: 44, borderRadius: '50%' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            </button>
            <button className="ds-icon-btn is-brand" style={{ width: 44, height: 44, borderRadius: '50%' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            </button>
          </div>
        </Preview>
      </Section>

      <Section title="Variants">
        <h3>App flow CTA (primary action)</h3>
        <p>Full-width button for the primary action in booking and care flows. Always at the bottom of the screen.</p>
        <CodeBlock title="CSS" code={`.app-flow-cta {
  width: 100%;
  min-height: var(--app-flow-cta-height);   /* 52px */
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);                       /* 8px */
  padding: var(--space-3-5) var(--space-4);  /* 14px 16px */
  border: none;
  border-radius: var(--radius-cta);         /* 26px */
  background: var(--primary);               /* #5B5FC6 */
  color: var(--text-on-primary);            /* #FFFFFF */
  font-size: var(--text-title-size);        /* 16px */
  font-weight: var(--font-weight-semibold); /* 600 */
  font-family: inherit;
  cursor: pointer;
  transition: background var(--transition), opacity var(--transition);
}

.app-flow-cta:hover:not(:disabled) {
  background: var(--primary-dark);          /* #4A4EB0 */
}

.app-flow-cta:active:not(:disabled) {
  opacity: var(--opacity-pressed);          /* 0.9 */
}

.app-flow-cta:disabled {
  opacity: var(--opacity-disabled);         /* 0.45 */
  cursor: not-allowed;
}`} />

        <h3>Sticky footer CTA</h3>
        <p>Fixed-position CTA at the bottom of appointment details, ready-for-visit, and other detail screens.</p>
        <CodeBlock title="CSS" code={`.sticky-footer-cta__primary {
  width: 100%;
  min-height: var(--app-flow-cta-height);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-3-5) var(--space-4);
  border: none;
  border-radius: var(--radius-cta);
  background: var(--primary);
  color: var(--text-on-primary);
  font-size: var(--text-title-size);
  font-weight: var(--font-weight-semibold);
  font-family: inherit;
  cursor: pointer;
  transition: background var(--transition), opacity var(--transition);
}`} />

        <h3>Icon buttons</h3>
        <p>Circular 44×44px touch targets for header actions, card actions, and navigation controls.</p>
        <CodeBlock title="CSS" code={`.ds-icon-btn {
  width: var(--icon-btn-size);    /* 44px */
  height: var(--icon-btn-size);
  border-radius: var(--icon-btn-radius);  /* 999px (circle) */
  border: none;
  background: var(--icon-surface-ghost);  /* transparent */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--icon-color-default);
  padding: 0;
  flex-shrink: 0;
  font: inherit;
  transition: background var(--transition), color var(--transition);
}

/* Variants: is-muted, is-subtle, is-brand, is-danger, is-selected */
.ds-icon-btn.is-subtle {
  border: var(--icon-btn-border);
  background: var(--icon-surface-subtle);
  color: var(--icon-color-muted);
}`} />
      </Section>

      <Section title="Tokens">
        <TokenTable tokens={[
          { token: '--app-flow-cta-height', value: '52px', usage: 'Primary CTA min-height' },
          { token: '--radius-cta', value: '26px', usage: 'CTA button border radius' },
          { token: '--primary', value: '#5B5FC6', usage: 'CTA background (normal)' },
          { token: '--primary-dark', value: '#4A4EB0', usage: 'CTA background (hover)' },
          { token: '--text-on-primary', value: '#FFFFFF', usage: 'CTA text color' },
          { token: '--text-title-size', value: '16px', usage: 'CTA font size' },
          { token: '--font-weight-semibold', value: '600', usage: 'CTA font weight' },
          { token: '--opacity-disabled', value: '0.45', usage: 'Disabled state opacity' },
          { token: '--opacity-pressed', value: '0.9', usage: 'Active/pressed state opacity' },
          { token: '--icon-btn-size', value: '44px', usage: 'Icon button touch target' },
          { token: '--icon-btn-visual', value: '40px', usage: 'Icon button visual chrome' },
          { token: '--icon-btn-radius', value: '999px', usage: 'Icon button border-radius (circle)' },
          { token: '--touch-min', value: '44px', usage: 'Minimum touch target size (accessibility)' },
        ]} />
      </Section>

      <Section title="States">
        <StatesTable states={[
          { state: 'Default', visual: 'Primary background, white text', trigger: 'Resting state' },
          { state: 'Hover', visual: 'Darker background (--primary-dark)', trigger: 'Mouse hover' },
          { state: 'Active', visual: 'Opacity 0.9 (--opacity-pressed)', trigger: 'Mouse down / tap' },
          { state: 'Disabled', visual: 'Opacity 0.45, cursor: not-allowed', trigger: 'disabled attribute' },
          { state: 'Focus-visible', visual: '2px outline + --shadow-focus ring', trigger: 'Keyboard tab focus' },
        ]} />
      </Section>

      <Section title="Usage guidelines">
        <p>
          The <code>.app-flow-cta</code> pattern is used in:
          <code>BookingFlow</code>, <code>SelectProvider</code>, <code>SelectSlot</code>,
          <code>SelectPatient</code>, <code>ConfirmBooking</code>, <code>PreVisitCheckIn</code>,
          <code>ProcessPayment</code>, <code>VerifyPayment</code>.
        </p>
        <p>
          The <code>.sticky-footer-cta</code> pattern is used in:
          <code>AppointmentDetail</code>, <code>PreVisitCheckIn</code>, <code>TreatPage</code>,
          <code>RescheduleAppointment</code>.
        </p>
        <p>
          The <code>.ds-icon-btn</code> pattern is used in:
          <code>Header</code> (notification bell, avatar), <code>DoctorCard</code> (call button),
          <code>AppointmentDetail</code> (menu, action row), <code>PostVisitSummary</code> (back, share).
        </p>
      </Section>

      <DoDont
        dos={[
          'Use one primary CTA per view. It should represent the most important action.',
          'Use action verbs: "Book appointment", "Send message", "View details".',
          'Maintain 44×44px minimum touch target for all interactive buttons.',
          'Use the disabled state (not hidden) when the action is temporarily unavailable.',
        ]}
        donts={[
          'Use multiple primary CTAs competing for attention — this creates decision paralysis.',
          'Use vague labels like "Submit" or "Click here". Be specific about what the button does.',
          'Use custom colors. Always reference design tokens for consistency.',
        ]}
      />

      <Callout type="info">
        All button variants respect <code>prefers-reduced-motion</code>. Transitions are disabled
        automatically when the user has requested reduced motion.
      </Callout>

      <RelatedLinks links={[
        { label: 'Color', path: '/design/foundations/color' },
        { label: 'Radius', path: '/design/foundations/radius' },
        { label: 'Iconography', path: '/design/foundations/iconography' },
        { label: 'Accessibility', path: '/design/foundations/accessibility' },
      ]} />
    </>
  )
}
