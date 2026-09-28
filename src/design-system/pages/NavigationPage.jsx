import { TokenTable, DoDont, RelatedLinks, Preview, Section } from '../shared'
import { Icon } from '../../components/ui'

export default function NavigationPage() {
  return (
    <>
      <div className="ds-page-header">
        <div className="ds-page-breadcrumb">Components / Navigation</div>
        <h1 className="ds-doc-title">Navigation</h1>
        <p className="ds-page-description">
          Patterns for moving between screens — the animated bottom navigation bar, screen headers
          with back actions, and contextual overlays.
        </p>
      </div>

      <Section title="Overview">
        <p>
          eMedicalls uses three navigation patterns: a persistent bottom navigation bar with an
          animated pill indicator, screen headers with back/title/actions, and overlay navigation
          for specialisations and top doctors lists.
        </p>
      </Section>

      <Section title="Live preview">
        <h3>Bottom navigation</h3>
        <Preview code={`<nav className="bottom-nav" aria-label="Main">
  <div className="bottom-nav-bar">
    {tabs.map((tab) => (
      <button className={\`bottom-nav-tab \${active ? 'is-active' : ''}\`} aria-current={active ? 'page' : undefined}>
        <span className="bottom-nav-tab-icon">{icon}</span>
        <span className="bottom-nav-tab-label">{tab.label}</span>
      </button>
    ))}
  </div>
</nav>`}>
          <div className="ds-card" style={{ width: '100%', maxWidth: 440, overflow: 'hidden' }}>
            <div className="bottom-nav-bar">
              {[
                { label: 'Home', icon: <Icon.User /> },
                { label: 'Treat', icon: <Icon.Heart /> },
                { label: 'Pharmacy', icon: <Icon.Pill /> },
                { label: 'Centers', icon: <Icon.Pin /> },
                { label: 'Settings', icon: <Icon.Info /> },
              ].map((tab, i) => (
                <button key={tab.label} type="button" className={`bottom-nav-tab ${i === 0 ? 'is-active' : ''}`} aria-current={i === 0 ? 'page' : undefined}>
                  <span className="bottom-nav-tab-icon" aria-hidden="true">{tab.icon}</span>
                  <span className="bottom-nav-tab-label">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </Preview>
      </Section>

      <Section title="Bottom nav states">
        <p>
          PocketPills tab pattern: icon tile + label. The active tab changes colour only — the icon tile fills
          lavender and the label turns CTA ink — with the shared 200ms <code>--interact-transition</code>.
          No sliding pill and no scale; state is also exposed through <code>aria-current="page"</code>.
        </p>
      </Section>

      <Section title="Tokens">
        <TokenTable tokens={[
          { token: '--nav-height', value: '4rem', usage: 'Bottom nav bar height' },
          { token: '--z-header', value: '50', usage: 'Header z-index' },
          { token: '--z-footer', value: '100', usage: 'Footer/nav z-index' },
          { token: '--icon-btn-size', value: '2.75rem', usage: 'Nav icon touch target' },
          { token: '--icon-2xl', value: '1.5rem', usage: 'Nav icon size' },
          { token: '--radius-card', value: '1.5rem', usage: 'Active pill border-radius' },
          { token: '--cta', value: '#362952', usage: 'Active pill background (neutral-800)' },
          { token: '--text-body-lg-size', value: '1.125rem', usage: 'Pill label font size' },
          { token: '--ease-emphasized', value: 'cubic-bezier(0.22, 1, 0.36, 1)', usage: 'Pill animation easing (preserved)' },
        ]} />
      </Section>

      <Section title="Navigation patterns in the app">
        <ul>
          <li><strong>Bottom nav</strong> — Visible on Home, Treat, Pharmacy, Centers, Settings. Hidden during search and booking flows.</li>
          <li><strong>Screen headers</strong> — Each screen has a sticky header with back button, centered title, and optional actions.</li>
          <li><strong>Overlay navigation</strong> — Specialisations and Top Doctors overlays slide in from the right.</li>
          <li><strong>Bottom sheets</strong> — City picker, sort/filter options, and contextual actions use bottom sheets.</li>
        </ul>
      </Section>

      <DoDont
        dos={[
          'Keep navigation labels short — 1-2 words max. Icons should be universally understood.',
          'Show the bottom nav on primary screens (Home, Treat, etc.) and hide it during focused flows.',
          'Use aria-current="page" on the active tab for screen reader accessibility.',
        ]}
        donts={[
          'Hide the back button on non-root screens. Users always need a way to go back.',
          'Show the bottom nav during booking flows or full-screen overlays.',
          'Use more than 5 bottom nav items. This creates cramped, unusable targets.',
        ]}
      />

      <RelatedLinks links={[
        { label: 'Iconography', path: '/design/foundations/iconography' },
        { label: 'Accessibility', path: '/design/foundations/accessibility' },
        { label: 'Motion', path: '/design/foundations/motion' },
      ]} />
    </>
  )
}
