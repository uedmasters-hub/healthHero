import { TokenTable, DoDont, Callout, RelatedLinks, Preview, CodeBlock, PropsTable, StatesTable, Section } from '../shared'

export default function InputsPage() {
  return (
    <>
      <div className="ds-page-header">
        <div className="ds-page-breadcrumb">Components / Inputs</div>
        <h1 className="ds-page-title">Inputs</h1>
        <p className="ds-page-description">
          Form controls for collecting user data — text fields, search inputs, and textareas.
          Used across booking forms, authentication, appointment notes, and city selection.
        </p>
      </div>

      <Section title="Overview">
        <p>
          eMedicalls uses two input patterns: the standard form input (<code>AuthField</code>)
          for authentication and forms, and the search field (<code>SearchField</code>) for
          discovery. Both share the same visual language but serve different interaction contexts.
        </p>
      </Section>

      <Section title="Live preview">
        <h3>Text input</h3>
        <Preview code={`<input className="ds-input" placeholder="Enter your name" />`}>
          <input className="ds-showcase-input" placeholder="Enter your name" />
        </Preview>

        <h3>Search field</h3>
        <Preview code={`<label className="search-field">
  <SearchIcon />
  <input className="search-field-input" placeholder="Search Doctor" />
</label>`}>
          <div className="search-field" style={{ display: 'flex', alignItems: 'center', gap: 8, height: 48, background: '#f3f4f8', borderRadius: 999, padding: '0 16px', width: 300 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input style={{ flex: 1, border: 'none', background: 'none', fontSize: 16, color: '#1a1a2e', outline: 'none' }} placeholder="Search Doctor" />
          </div>
        </Preview>

        <h3>Textarea (appointment notes)</h3>
        <Preview code={`<textarea className="appointment-notes-input"
  placeholder="Add notes about your visit..."
  rows={3}
/>`}>
          <textarea className="ds-showcase-input" placeholder="Add notes about your visit..." rows={3} style={{ width: 300, resize: 'vertical' }} />
        </Preview>
      </Section>

      <Section title="Props">
        <h3>SearchField</h3>
        <PropsTable props={[
          { name: 'placeholder', type: 'string', default: "'Search Doctor'", description: 'Input placeholder text' },
          { name: 'value', type: 'string', default: '—', description: 'Controlled input value' },
          { name: 'onChange', type: 'function', default: '—', description: 'Change handler callback' },
          { name: 'showMic', type: 'boolean', default: 'true', description: 'Show microphone icon' },
          { name: 'showClear', type: 'boolean', default: 'false', description: 'Show clear button' },
          { name: 'onClear', type: 'function', default: '—', description: 'Clear button handler' },
          { name: 'autoFocus', type: 'boolean', default: 'false', description: 'Auto-focus input on mount' },
          { name: 'readOnly', type: 'boolean', default: 'false', description: 'Make input read-only' },
          { name: 'inputRef', type: 'ref', default: '—', description: 'Forward ref to input element' },
        ]} />
      </Section>

      <Section title="Tokens">
        <TokenTable tokens={[
          { token: '--border', value: '#EEEFF3', usage: 'Input border color' },
          { token: '--border-focus', value: 'var(--primary)', usage: 'Focus border color' },
          { token: '--radius-sm', value: '8px', usage: 'Input border radius' },
          { token: '--radius-full', value: '999px', usage: 'Search field border radius (pill)' },
          { token: '--text-body-size', value: '14px', usage: 'Input font size' },
          { token: '--text-title-size', value: '16px', usage: 'Search input font size' },
          { token: '--text-primary', value: '#1A1A2E', usage: 'Input text color' },
          { token: '--text-secondary', value: '#6B7280', usage: 'Placeholder text color' },
          { token: '--text-faint', value: '#9CA3AF', usage: 'Placeholder color (decorative)' },
          { token: '--surface-muted', value: '#F3F4F8', usage: 'Search field background' },
          { token: '--shadow-focus', value: '0 0 0 3px rgba(91,95,198,0.28)', usage: 'Focus ring glow' },
          { token: '--app-flow-cta-height', value: '52px', usage: 'Search field height' },
          { token: '--icon-xl', value: '22px', usage: 'Search icon size' },
        ]} />
      </Section>

      <Section title="States">
        <StatesTable states={[
          { state: 'Default', visual: 'Border --border, white background', trigger: 'Resting state' },
          { state: 'Focus', visual: 'Border --border-focus, focus ring shadow', trigger: 'User focus (search only)' },
          { state: 'Read-only', visual: 'No focus indicators, background --bg', trigger: 'readOnly attribute (home page search)' },
          { state: 'Disabled', visual: 'Opacity 0.45, background --surface-muted', trigger: 'disabled attribute' },
          { state: 'Active (search)', visual: 'Cancel button slides in, wider gap', trigger: 'searchOpen state in TreatPage' },
        ]} />
      </Section>

      <Section title="Search behavior">
        <p>
          The search system consists of three components working together:
        </p>
        <ul>
          <li><code>SearchBar</code> — Contains the search field and cancel button. Manages active state.</li>
          <li><code>SearchField</code> — Reusable input with icon, clear, and mic support.</li>
          <li><code>SearchSuggestions</code> — Dropdown with filtered results, highlighted matches, and empty state.</li>
        </ul>
        <CodeBlock title="Search flow" code={`// Home page: search triggers overlay
<SearchBar active={isSearch} query={query} onQueryChange={setQuery} onCancel={closeSearch} />
{isSearch && <SearchSuggestions query={query} active={isSearch} />}

// Treat page: inline search with cancel
<div className="treat-search">
  <SearchField value={query} onChange={setQuery} showClear onClear={() => setQuery('')} />
</div>`} />
      </Section>

      <DoDont
        dos={[
          'Always provide a visible label or placeholder. Users need to know what data to enter.',
          'Use the search field (pill shape) for discovery contexts and standard inputs for forms.',
          'Use autoCorrect="off" and spellCheck="false" on search inputs to prevent autocorrect.',
        ]}
        donts={[
          'Use placeholder text as the only label. It disappears when the user starts typing.',
          'Add custom focus rings to search inputs. The search field deliberately removes all focus chrome.',
          'Use the search field pattern for non-search contexts like forms and authentication.',
        ]}
      />

      <Callout type="info">
        The search field deliberately removes all focus indicators (outline, box-shadow, border-color)
        via <code>.search-field:focus-within</code>. This is intentional — the search bar's visual
        context (pill shape, muted background) already communicates focus.
      </Callout>

      <RelatedLinks links={[
        { label: 'Buttons', path: '/design/components/buttons' },
        { label: 'Color', path: '/design/foundations/color' },
        { label: 'Accessibility', path: '/design/foundations/accessibility' },
      ]} />
    </>
  )
}
