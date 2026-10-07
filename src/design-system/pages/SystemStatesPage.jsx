import { useState } from 'react'
import { DoDont, Preview, PropsTable, RelatedLinks, Section } from '../shared'
import { SYSTEM_STATES, SYSTEM_STATE_GROUPS, SystemState } from '../../components/system'

const ACTION_ROWS = [
  { name: 'retry', type: 'Try again', default: 'onRetry or reload', description: 'Transient failures — 408, 5xx, slow, generic' },
  { name: 'refresh', type: 'Refresh', default: 'reload', description: 'Whole-app states — maintenance, configuration' },
  { name: 'back', type: 'Go back', default: 'history, else Home', description: 'Request problems and private areas' },
  { name: 'home', type: 'Go to Home', default: 'replace → /', description: 'Every dead end has a way Home' },
  { name: 'signIn', type: 'Sign in', default: '/login, returns here', description: '401 and session expired' },
  { name: 'checkConnection', type: 'Check connection', default: 'probe, then retry', description: 'Offline — also auto-retries on reconnect' },
  { name: 'contact', type: 'Contact support', default: '/chat', description: '403, 500, maintenance' },
]

export default function SystemStatesPage() {
  const [previewKey, setPreviewKey] = useState('not-found')

  return (
    <>
      <div className="ds-page-header">
        <div className="ds-page-breadcrumb">Components / System States</div>
        <h1 className="ds-doc-title">System States</h1>
        <p className="ds-page-description">
          One pattern for every error, connection, empty and loading state — so no screen is ever left blank.
        </p>
      </div>

      <Section title="Overview">
        <p>
          <code>SystemState</code> renders illustration → eyebrow → title → message → recovery actions from a single
          catalog (<code>src/components/system/systemStates.js</code>). Pass a catalog key or an HTTP status
          (<code>state=&quot;offline&quot;</code>, <code>state={'{503}'}</code>), or hand it any error and
          <code> stateFromError</code> picks the right state.
        </p>
        <p>
          Three densities share the same copy: <strong>page</strong> (full screen), <strong>inline</strong> (card in a feed)
          and <strong>compact</strong> (one row). Any state can also be opened at <code>/status/&lt;key-or-code&gt;</code>.
        </p>
      </Section>

      <Section title="Full-page preview">
        <div className="ds-chip-row" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {Object.keys(SYSTEM_STATES).map((key) => (
            <button
              key={key}
              type="button"
              className={`ds-chip${previewKey === key ? ' is-selected' : ''}`}
              aria-pressed={previewKey === key}
              onClick={() => setPreviewKey(key)}
            >
              {SYSTEM_STATES[key].code ? `${SYSTEM_STATES[key].code} · ` : ''}{key}
            </button>
          ))}
        </div>
        <div style={{ width: 390, maxWidth: '100%', height: 720, display: 'flex', border: '1px solid var(--border-default)', borderRadius: 32, overflow: 'hidden' }}>
          <SystemState key={previewKey} state={previewKey} inert />
        </div>
      </Section>

      {SYSTEM_STATE_GROUPS.map((group) => (
        <Section key={group.label} title={group.label}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {group.keys.map((key) => (
              <SystemState key={key} state={key} variant="inline" inert />
            ))}
          </div>
        </Section>
      ))}

      <Section title="Compact">
        <div style={{ display: 'grid', gap: 12, maxWidth: 420 }}>
          <SystemState state="offline" variant="compact" actions={['checkConnection']} inert />
          <SystemState state="timeout" variant="compact" actions={['retry']} inert />
          <SystemState state="empty" variant="compact" title="No orders yet" message="Your medicine orders will appear here." inert />
        </div>
      </Section>

      <Section title="Usage">
        <Preview code={`// Data failed to load inside a section
<SystemState variant="inline" error={error} onRetry={reload} />

// Routed screen whose context is gone
<UnavailablePage title="This appointment is no longer available" />

// Unknown URL (already wired as the catch-all route)
<SystemState state="not-found" autoRedirect={{ to: '/', seconds: 10 }} />`}>
          <div style={{ width: '100%', maxWidth: 360 }}>
            <SystemState variant="inline" error={{ status: 503 }} inert />
          </div>
        </Preview>
      </Section>

      <Section title="Props">
        <PropsTable props={[
          { name: 'state', type: 'string | number', default: "'generic'", description: 'Catalog key or HTTP status (400–504)' },
          { name: 'error', type: 'unknown', default: '—', description: 'Mapped with stateFromError when state is omitted' },
          { name: 'variant', type: "'page' | 'inline' | 'compact'", default: "'page'", description: 'Density' },
          { name: 'title / message / eyebrow', type: 'string', default: 'catalog', description: 'Contextual copy overrides' },
          { name: 'actions', type: 'array', default: 'catalog', description: 'Action keys or { label, onClick, variant }' },
          { name: 'onRetry', type: 'function', default: 'reload', description: 'Target for Try again / Check connection' },
          { name: 'autoRedirect', type: '{ to, seconds, label, silent }', default: '—', description: 'Countdown hand-off so no screen is a dead end' },
          { name: 'image', type: 'string', default: '—', description: 'Replace the spot illustration with artwork' },
          { name: 'details', type: 'string', default: '—', description: 'Reference / debug line (dev builds)' },
        ]} />
      </Section>

      <Section title="Recovery actions">
        <PropsTable props={ACTION_ROWS} />
      </Section>

      <Section title="Where states are wired">
        <ul>
          <li><strong>Unknown URL</strong> — 404 page, returns Home after 10s</li>
          <li><strong>Render crash</strong> — <code>AppErrorBoundary</code> → generic (or offline) state, auto-returns Home</li>
          <li><strong>Session ended on its own</strong> — Session expired page, hands over to Login with the origin page remembered</li>
          <li><strong>Offline / slow</strong> — global <code>ConnectionBanner</code>; offline pages retry on reconnect</li>
          <li><strong>Maintenance</strong> — <code>VITE_MAINTENANCE_MODE=true</code> shows the maintenance page app-wide</li>
          <li><strong>Missing context</strong> — booking, visit, article and reschedule screens use <code>UnavailablePage</code> / <code>RedirectingPage</code></li>
          <li><strong>Before the app loads</strong> — <code>index.html</code> boot shell with a Reload fallback</li>
        </ul>
      </Section>

      <DoDont
        dos={[
          'Always give at least one way forward — Retry, Go back or Go to Home.',
          'Override title and message with context ("This appointment is no longer available").',
          'Use inline states inside feeds so the rest of the page keeps working.',
        ]}
        donts={[
          'Return null from a routed screen — use UnavailablePage or RedirectingPage.',
          'Show raw error text to patients; keep it in details for dev builds.',
          'Use a full-page state for a single failed section.',
        ]}
      />

      <RelatedLinks links={[
        { label: 'Empty States', path: '/design/components/empty-states' },
        { label: 'Skeletons', path: '/design/components/skeletons' },
      ]} />
    </>
  )
}
