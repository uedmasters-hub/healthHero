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
          Structured forms use <code>.ds-field</code> (48×16 radius) for labeled inputs.
          Discovery search keeps the pill <code>SearchField</code>. Both share ink, border, and
          focus tokens — never invent one-off field chrome.
        </p>
      </Section>

      <Section title="Live preview">
        <h3>Structured field</h3>
        <Preview code={`<label className="ds-field-label">Full name</label>
<input className="ds-field" placeholder="Enter your name" />`}>
          <div style={{ width: 300 }}>
            <label className="ds-field-label">Full name</label>
            <input className="ds-field" placeholder="Enter your name" />
          </div>
        </Preview>

        <h3>Search field</h3>
        <Preview code={`<label className="search-field">
  <SearchIcon />
  <input className="search-field-input" placeholder="Search Doctor" />
</label>`}>
          <div className="search-field" style={{ display: 'flex', alignItems: 'center', gap: 8, height: 48, background: 'var(--surface-muted)', borderRadius: 9999, padding: '0 16px', width: 300 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input style={{ flex: 1, border: 'none', background: 'none', fontSize: 16, color: 'var(--text-primary)', outline: 'none' }} placeholder="Search Doctor" />
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
          { token: '--field-height', value: '3rem', usage: 'Default structured field height (PP h-12)' },
          { token: '--field-height-sm', value: '2.75rem', usage: 'Compact field height (PP h-11)' },
          { token: '--field-radius', value: '1rem', usage: 'Structured field corner (PP radius-m)' },
          { token: '--field-pad-x', value: '1rem', usage: 'Horizontal field padding' },
          { token: '--border', value: 'primary-800 @ 12%', usage: 'Hairline lavender border' },
          { token: '--border-focus', value: '#8c60ff', usage: 'Focus accent (primary-500)' },
          { token: '--radius-full', value: '9999px', usage: 'Search field pill radius' },
          { token: '--text-body-size', value: '1rem', usage: 'Field / search input font size' },
          { token: '--text-primary', value: '#180730', usage: 'Input text (neutral-900)' },
          { token: '--text-secondary', value: '#534b74', usage: 'Label / placeholder (neutral-700)' },
          { token: '--surface-muted', value: '#f5f4fa', usage: 'Search field background (neutral-100)' },
          { token: '--touch-min', value: '2.75rem', usage: 'Minimum interactive target' },
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
