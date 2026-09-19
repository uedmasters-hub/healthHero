import { TokenTable, DoDont, Callout, RelatedLinks, CodeBlock, Section } from '../shared'

export default function RovoUIPage() {
  return (
    <>
      <div className="ds-page-header">
        <div className="ds-page-breadcrumb">Rovo UI</div>
        <h1 className="ds-page-title">Rovo UI patterns</h1>
        <p className="ds-page-description">
          Internal reusable patterns and product-level compositions built on top of the core design system.
          These patterns represent real implementations in the Health Hero application.
        </p>
      </div>

      <Section title="Overview">
        <p>
          Rovo UI extends the core design system with domain-specific patterns for healthcare.
          Each pattern is a composition of design system primitives (tokens, components, layouts)
          organized around a specific user journey.
        </p>
        <Callout type="info">
          Rovo UI patterns are documented here as reference. They are implemented in the main
          application codebase under <code>src/components/</code> and are not a separate package.
        </Callout>
      </Section>

      <Section title="Pattern catalog">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16, margin: '0 0 32px' }}>
          {[
            { title: 'Booking Flow', desc: '4-step appointment booking wizard with provider selection, slot picker, patient selection, and confirmation.', path: '/design/rovo-ui/booking-flow' },
            { title: 'Profile Hub', desc: 'Patient profile with personal, medical, records, insurance, and support workspaces.', path: '/design/rovo-ui/profile-hub' },
            { title: 'Authentication Flow', desc: 'Login, register, and forgot password with progressive auth gating.', path: '/design/rovo-ui/auth-flow' },
            { title: 'Appointment Detail', desc: 'Comprehensive appointment view with countdown, checklist, records, payment, and FAQ.', path: '/design/rovo-ui/appointment-detail' },
            { title: 'Skeleton Strategy', desc: 'Stagger reveal system with shimmer animations and cached loading states.', path: '/design/rovo-ui/skeleton-strategy' },
            { title: 'Overlay System', desc: 'Bottom sheets, modals, lightboxes, and full-screen overlays with transitions.', path: '/design/rovo-ui/overlay-system' },
          ].map((p) => (
            <a key={p.path} href={p.path} style={{
              display: 'block', padding: 24, background: 'white',
              border: '1px solid #eef0f3', borderRadius: 16, textDecoration: 'none',
              transition: 'box-shadow 0.15s ease, transform 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(91,95,198,0.12)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none' }}
            >
              <div style={{ fontSize: 16, fontWeight: 600, color: '#1a1a2e', marginBottom: 4 }}>{p.title}</div>
              <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>{p.desc}</div>
            </a>
          ))}
        </div>
      </Section>

      <Section title="Architecture">
        <p>
          Rovo UI patterns follow a layered architecture:
        </p>
        <ul>
          <li><strong>Tokens</strong> — CSS custom properties for colors, spacing, typography, etc.</li>
          <li><strong>Primitives</strong> — Base components: buttons, inputs, cards, icons.</li>
          <li><strong>Patterns</strong> — Compositions of primitives for specific use cases.</li>
          <li><strong>Products</strong> — Full pages and flows built from patterns.</li>
        </ul>
        <CodeBlock title="Layer hierarchy" code={`/* Tokens — src/index.css */
:root {
  --primary: #5B5FC6;
  --card-bg: #FFFFFF;
  --radius-card: 22px;
  /* ... */
}

/* Primitives — src/components/ */
.ds-icon-btn { /* icon button */ }
.app-flow-cta { /* primary CTA */ }
.ds-card { /* elevated card */ }

/* Patterns — src/components/ */
DoctorCard       /* doctor provider card (4 variants) */
SearchBar        /* search with suggestions */
AppBottomSheet   /* modal bottom sheet */
EmptyState       /* empty content placeholder */

/* Products — src/components/ + src/components/profile/ */
BookingFlow      /* 4-step booking wizard */
AppointmentDetail /* appointment view */
PatientProfile   /* patient profile hub */
TreatPage        /* care history + booking */`} />
      </Section>

      <RelatedLinks links={[
        { label: 'Booking Flow', path: '/design/rovo-ui/booking-flow' },
        { label: 'Profile Hub', path: '/design/rovo-ui/profile-hub' },
        { label: 'Auth Flow', path: '/design/rovo-ui/auth-flow' },
        { label: 'Appointment Detail', path: '/design/rovo-ui/appointment-detail' },
        { label: 'Skeleton Strategy', path: '/design/rovo-ui/skeleton-strategy' },
        { label: 'Overlay System', path: '/design/rovo-ui/overlay-system' },
      ]} />
    </>
  )
}
