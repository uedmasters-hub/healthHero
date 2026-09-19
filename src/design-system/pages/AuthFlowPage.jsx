import { TokenTable, DoDont, Callout, RelatedLinks, CodeBlock, Section } from '../shared'

export default function AuthFlowPage() {
  return (
    <>
      <div className="ds-page-header">
        <div className="ds-page-breadcrumb">Rovo UI / Auth Flow</div>
        <h1 className="ds-page-title">Authentication Flow</h1>
        <p className="ds-page-description">
          Login, register, and password reset — with progressive auth gating that requires
          authentication only at the moment of action.
        </p>
      </div>

      <Section title="Overview">
        <p>
          Health Hero uses a "lazy auth" pattern: users can browse without logging in.
          Authentication is only required when they perform actions that need a session
          (booking, profile access, insights). The auth flow supports login, registration,
          OTP verification, and password reset.
        </p>
      </Section>

      <Section title="Auth screens">
        <div style={{ display: 'flex', gap: 12, margin: '0 0 24px', flexWrap: 'wrap' }}>
          {[
            { label: 'Login', route: '/auth/login', desc: 'Email + password with forgot password link' },
            { label: 'Register', route: '/auth/register', desc: 'Full name + email + password with show/hide toggles' },
            { label: 'Forgot Password', route: '/auth/forgot-password', desc: 'Email input with success message' },
            { label: 'Auth Gate', route: 'modal', desc: 'Modal prompt for unauthenticated actions' },
          ].map((s) => (
            <div key={s.label} style={{ flex: '1 1 200px', padding: 16, background: 'white', border: '1px solid #eef0f3', borderRadius: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{s.label}</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>{s.desc}</div>
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4, fontFamily: 'monospace' }}>{s.route}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="AuthGate pattern">
        <p>
          <code>AuthGate</code> is a modal that appears when an unauthenticated user tries
          to perform a gated action. It shows a login/register prompt with a confetti image,
          keeping users in context while requiring auth.
        </p>
        <CodeBlock title="AuthGate usage" code={`// Protect a route or action with AuthGate
<AuthGate message="Please sign in to book appointments">
  <BookingFlow />
</AuthGate>

// Or use the hook for programmatic gating
const { requireAuth } = useAuthGate()
await requireAuth({ message: 'Sign in to save your progress' })`} />
      </Section>

      <Section title="Form structure">
        <p>
          Auth forms use the <code>AuthField</code> component with consistent layout:
          decorative label (positioned above the input), input with pill border-radius,
          optional show/hide password toggle, and a primary CTA.
        </p>
        <CodeBlock title="AuthField component" code={`function AuthField({ label, error, inputProps, type = 'text', ...rest }) {
  const [isPassword, setIsPassword] = useState(type === 'password')

  return (
    <div className="auth-field">
      {label && <label className="auth-field-label">{label}</label>}
      <div className="auth-field-row">
        <input className="auth-field-input" type={isPassword ? 'password' : type} {...inputProps} />
        {type === 'password' && (
          <button className="auth-field-eye" onClick={() => setIsPassword(p => !p)}>
            {isPassword ? <EyeClosed /> : <EyeOpen />}
          </button>
        )}
      </div>
      {error && <p className="auth-field-error">{error}</p>}
    </div>
  )
}`} />
      </Section>

      <Section title="Auth tokens">
        <TokenTable tokens={[
          { token: '--radius-full', value: '999px', usage: 'Auth input border-radius (pill)' },
          { token: '--border-focus', value: 'var(--primary)', usage: 'Input focus border color' },
          { token: '--text-body-size', value: '14px', usage: 'Input font size' },
          { token: '--app-flow-cta-height', value: '52px', usage: 'Auth CTA button height' },
          { token: '--page-padding', value: '20px', usage: 'Auth page horizontal padding' },
          { token: '--space-4', value: '16px', usage: 'Auth field spacing' },
        ]} />
      </Section>

      <Section title="Lazy auth behavior">
        <p>
          Users can browse treatments, doctors, and cities without authentication. Auth is
          only required when they: book an appointment, access their profile, view insights,
          or manage family members. This reduces friction for new users.
        </p>
        <CodeBlock title="Lazy auth routing" code={`// Public routes — no auth required
<Route path="/" element={<AppGate><HomePage /></AppGate>} />
<Route path="/treat" element={<AppGate><TreatPage /></AppGate>} />
<Route path="/doctor/:id" element={<AppGate><DoctorProfile /></AppGate>} />

// Protected routes — auth required
<Route path="/booking" element={<AppGate><BookingFlow /></AppGate>} />
<Route path="/profile" element={<AppGate><PatientProfile /></AppGate>} />
<Route path="/settings" element={<AppGate><SettingsPage /></AppGate>} />`} />
      </Section>

      <DoDont
        dos={[
          'Keep auth forms minimal. Only ask for what\'s necessary (email + password for login, name + email + password for register).',
          'Show clear error messages inline below the input that caused the error.',
          'Provide a "forgot password" link on the login screen.',
        ]}
        donts={[
          'Require authentication before users can see any content. Use lazy auth to reduce friction.',
          'Show generic "Something went wrong" for auth errors. Show specific messages ("Invalid password").',
          'Use toast notifications for auth errors. Show them inline below the relevant input.',
        ]}
      />

      <RelatedLinks links={[
        { label: 'Inputs', path: '/design/components/inputs' },
        { label: 'Buttons', path: '/design/components/buttons' },
        { label: 'Booking Flow', path: '/design/rovo-ui/booking-flow' },
      ]} />
    </>
  )
}
