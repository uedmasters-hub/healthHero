import { useState, useCallback } from 'react'

/* CodeBlock — syntax-highlighted code with copy button */
export function CodeBlock({ code, language = 'jsx', title }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [code])
  return (
    <div className="ds-code-block">
      {title && <div className="ds-code-block-header"><span>{title}</span></div>}
      <div className="ds-code-block-actions">
        <button className="ds-code-copy" onClick={handleCopy} aria-label="Copy code">
          {copied ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
          )}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre><code>{code}</code></pre>
    </div>
  )
}

/* DoDont — paired do/don't cards */
export function DoDont({ dos, donts }) {
  return (
    <div className="ds-do-dont-grid">
      {dos && (
        <div className="ds-do-card">
          <h4>Do</h4>
          {Array.isArray(dos) ? dos.map((d, i) => <p key={i}>{d}</p>) : <p>{dos}</p>}
        </div>
      )}
      {donts && (
        <div className="ds-dont-card">
          <h4>Don't</h4>
          {Array.isArray(donts) ? donts.map((d, i) => <p key={i}>{d}</p>) : <p>{donts}</p>}
        </div>
      )}
    </div>
  )
}

/* TokenTable — displays token name, value, and usage */
export function TokenTable({ tokens }) {
  return (
    <table className="ds-token-table">
      <thead><tr><th>Token</th><th>Value</th><th>Usage</th></tr></thead>
      <tbody>
        {tokens.map((t) => (
          <tr key={t.token}>
            <td className="ds-token-name">{t.token}</td>
            <td className="ds-token-value">{t.value}</td>
            <td>{t.usage}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/* SwatchGrid — color swatches */
export function SwatchGrid({ colors }) {
  return (
    <div className="ds-color-grid">
      {colors.map((c) => (
        <div key={c.name} className="ds-color-swatch">
          <div className="ds-color-swatch-block" style={{ background: c.hex || c.value }} />
          <div className="ds-color-swatch-info">
            <div className="ds-color-swatch-name">{c.name}</div>
            <div className="ds-color-swatch-value">{c.value}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

/* Preview — live component preview container */
export function Preview({ children, code, vertical }) {
  return (
    <div className="ds-preview">
      <div className={`ds-preview-stage ${vertical ? 'is-vertical' : ''}`}>{children}</div>
      {code && (
        <div className="ds-preview-code"><pre><code>{code}</code></pre></div>
      )}
    </div>
  )
}

/* Callout — info/warning/success callout box */
export function Callout({ type = 'info', icon, children }) {
  return (
    <div className={`ds-callout ds-callout-${type}`}>
      <span className="ds-callout-icon">{icon || (type === 'info' ? 'ℹ' : type === 'warning' ? '⚠' : '✓')}</span>
      <div>{children}</div>
    </div>
  )
}

/* Section — page section with heading and description */
export function Section({ title, description, children }) {
  return (
    <div className="ds-section">
      {title && <h2>{title}</h2>}
      {description && <p>{description}</p>}
      {children}
    </div>
  )
}

/* PropsTable — component props documentation */
export function PropsTable({ props }) {
  return (
    <table className="ds-token-table">
      <thead><tr><th>Prop</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
      <tbody>
        {props.map((p) => (
          <tr key={p.name}>
            <td className="ds-token-name">{p.name}</td>
            <td><code>{p.type}</code></td>
            <td>{p.default || '—'}</td>
            <td>{p.description}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/* Anatomy — visual anatomy diagram */
export function Anatomy({ children }) {
  return <div className="ds-anatomy">{children}</div>
}

/* StatesTable — component states documentation */
export function StatesTable({ states }) {
  return (
    <table className="ds-token-table">
      <thead><tr><th>State</th><th>Visual change</th><th>Trigger</th></tr></thead>
      <tbody>
        {states.map((s) => (
          <tr key={s.state}>
            <td><strong>{s.state}</strong></td>
            <td>{s.visual}</td>
            <td>{s.trigger}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/* RelatedLinks — cross-links to related pages */
export function RelatedLinks({ links }) {
  return (
    <div className="ds-related">
      <h2>Related</h2>
      <ul>
        {links.map((l) => (
          <li key={l.path}><a href={l.path}>{l.label}</a></li>
        ))}
      </ul>
    </div>
  )
}
