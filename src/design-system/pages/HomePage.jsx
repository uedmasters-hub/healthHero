import { Link } from 'react-router-dom'

const cards = [
  { title: 'Get started', desc: 'Set up your environment, learn our principles, and start building.', link: '/design/get-started/design', icon: '🚀' },
  { title: 'Foundations', desc: 'Design tokens, color, typography, spacing, motion, and more.', link: '/design/foundations/color', icon: '🧱' },
  { title: 'Components', desc: 'Reusable UI components with usage guidelines and code examples.', link: '/design/components/buttons', icon: '🧩' },
  { title: 'Rovo UI', desc: 'Internal reusable patterns and AI-powered design tools.', link: '/design/rovo-ui', icon: '🤖' },
  { title: 'Tools', desc: 'Design and development tools for the Health Hero ecosystem.', link: '/design/tools', icon: '🛠' },
  { title: 'Contact', desc: 'Reach the design system team for support and contributions.', link: '/design/contact', icon: '📬' },
]

export default function HomePage() {
  return (
    <>
      <div className="ds-page-header">
        <div className="ds-page-breadcrumb">Health Hero</div>
        <h1 className="ds-page-title">Design System</h1>
        <p className="ds-page-description">
          The single source of truth for designers and developers building Health Hero products.
          Clean, scalable, and documentation-first.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16, margin: '0 0 40px' }}>
        {cards.map((card) => (
          <Link
            key={card.link}
            to={card.link}
            style={{
              display: 'block', padding: 24, background: 'white',
              border: '1px solid #eef0f3', borderRadius: 16,
              textDecoration: 'none', color: 'inherit',
              transition: 'box-shadow 0.15s ease, transform 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(91, 95, 198, 0.12)'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none'
              e.currentTarget.style.transform = 'none'
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 12 }}>{card.icon}</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#1a1a2e', marginBottom: 4 }}>{card.title}</div>
            <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>{card.desc}</div>
          </Link>
        ))}
      </div>

      <h2>What is the Health Hero Design System?</h2>
      <p>
        The Health Hero Design System is a comprehensive set of design standards, documentation,
        and reusable components that ensure consistency across all Health Hero products. It serves
        as the single source of truth for both designers and developers.
      </p>

      <div className="ds-callout ds-callout-info">
        <span className="ds-callout-icon">ℹ</span>
        <div>
          This documentation site is an internal tool. It is completely isolated from the main
          Health Hero application and uses the full browser width for optimal reading experience.
        </div>
      </div>

      <h2>Core principles</h2>
      <ul>
        <li><strong>Clarity</strong> — Every interface should communicate with purpose and precision.</li>
        <li><strong>Consistency</strong> — Shared tokens and patterns eliminate drift across surfaces.</li>
        <li><strong>Accessibility</strong> — Inclusive by default; WCAG 2.1 AA compliance is the baseline.</li>
        <li><strong>Efficiency</strong> — Reusable primitives reduce cognitive load and ship speed.</li>
        <li><strong>Premium feel</strong> — Refined motion, spacing, and typography that reflect Health Hero's quality.</li>
      </ul>
    </>
  )
}
