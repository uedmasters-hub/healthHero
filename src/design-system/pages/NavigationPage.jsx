import { TokenTable, DoDont, Callout, RelatedLinks, Preview, CodeBlock, Section } from '../shared'

export default function NavigationPage() {
  return (
    <>
      <div className="ds-page-header">
        <div className="ds-page-breadcrumb">Components / Navigation</div>
        <h1 className="ds-page-title">Navigation</h1>
        <p className="ds-page-description">
          Patterns for moving between screens — the animated bottom navigation bar, screen headers
          with back actions, and contextual overlays.
        </p>
      </div>

      <Section title="Overview">
        <p>
          Health Hero uses three navigation patterns: a persistent bottom navigation bar with an
          animated pill indicator, screen headers with back/title/actions, and overlay navigation
          for specialisations and top doctors lists.
        </p>
      </Section>

      <Section title="Live preview">
        <h3>Bottom navigation</h3>
        <Preview code={`<nav className="bottom-nav">
  <div className="bottom-nav-inner">
    <div className="bottom-nav-bar">
      <div className="bottom-nav-pill" />
      {tabs.map(tab => (
        <button className="bottom-nav-tab" aria-label={tab.label}>
          <span className="bottom-nav-tab-icon">{tab.icon}</span>
        </button>
      ))}
    </div>
  </div>
</nav>`}>
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #eef0f3', padding: '8px 0', width: '100%', maxWidth: 440 }}>
            <div style={{ display: 'flex', gap: 0, justifyContent: 'space-around', position: 'relative' }}>
              {[
                { label: 'Home', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4' },
                { label: 'Book', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
                { label: 'Treat', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
                { label: 'Profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
              ].map((tab, i) => (
                <div key={tab.label} style={{ textAlign: 'center', padding: '4px 20px', position: 'relative' }}>
                  {i === 0 && (
                    <div style={{
                      position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
                      width: 56, height: 48, background: '#5b5fc6', borderRadius: 14,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={tab.icon}/></svg>
                    </div>
                  )}
                  <div style={{ position: 'relative', zIndex: 2 }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={i === 0 ? 'transparent' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto' }}><path d={tab.icon}/></svg>
                    <div style={{ fontSize: 10, fontWeight: i === 0 ? 600 : 400, color: i === 0 ? '#5b5fc6' : '#9ca3af', marginTop: 2 }}>{tab.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Preview>
      </Section>

      <Section title="Bottom nav animation">
        <p>
          The active tab uses an animated pill that slides between tabs using the Web Animations API.
          The pill uses <code>--primary</code> background with <code>--radius-card</code> corners
          and 420ms <code>--ease-emphasized</code> timing.
        </p>
        <CodeBlock title="Pill animation" code={`// Web Animations API — smooth pill transition
pill.animate([
  { transform: \`translateX(\${prevLeft}px) scaleX(\${prevScale})\` },
  { transform: \`translateX(\${newLeft}px) scaleX(\${newScale})\` },
], {
  duration: 420,
  easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
  fill: 'forwards',
})`} />
      </Section>

      <Section title="Tokens">
        <TokenTable tokens={[
          { token: '--nav-height', value: '64px', usage: 'Bottom nav bar height' },
          { token: '--z-header', value: '50', usage: 'Header z-index' },
          { token: '--z-footer', value: '100', usage: 'Footer/nav z-index' },
          { token: '--icon-btn-size', value: '44px', usage: 'Nav icon touch target' },
          { token: '--icon-2xl', value: '24px', usage: 'Nav icon size' },
          { token: '--radius-card', value: '22px', usage: 'Active pill border-radius' },
          { token: '--primary', value: '#5B5FC6', usage: 'Active pill background' },
          { token: '--text-body-lg-size', value: '15px', usage: 'Pill label font size' },
          { token: '--ease-emphasized', value: 'cubic-bezier(0.22, 1, 0.36, 1)', usage: 'Pill animation easing' },
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
