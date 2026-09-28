import { TokenTable, DoDont, RelatedLinks, CodeBlock, Section } from '../shared'

export default function OverlaySystemPage() {
  return (
    <>
      <div className="ds-page-header">
        <div className="ds-page-breadcrumb">Rovo UI / Overlay System</div>
        <h1 className="ds-doc-title">Overlay System</h1>
        <p className="ds-page-description">
          Bottom sheets, modals, lightboxes, and full-screen overlays — the spatial layering
          system for contextual content in eMedicalls.
        </p>
      </div>

      <Section title="Overview">
        <p>
          eMedicalls uses a layered overlay system to present contextual content without
          leaving the current screen. Each overlay type serves a specific purpose and follows
          consistent patterns for dismissal, animation, and interaction.
        </p>
      </Section>

      <Section title="Overlay hierarchy">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, maxWidth: 400, margin: '0 0 24px' }}>
          {[
            { z: '1200', label: 'Lightbox', desc: 'Full-screen image viewer with backdrop', bg: 'var(--text-primary)', color: 'white' },
            { z: '1100', label: 'Full Screen Overlay', desc: 'City picker, doctor list overlay', bg: '#2d2d4e', color: 'white' },
            { z: '1000', label: 'Modal', desc: 'Auth gate, payment, confirmation', bg: '#4e2a84', color: 'white' },
            { z: '900', label: 'Bottom Sheet', desc: 'City picker, sort/filter, actions', bg: 'var(--primary-300)', color: 'var(--text-primary)' },
            { z: '100', label: 'Sticky Footer', desc: 'Persistent CTAs above nav', bg: 'var(--neutral-100)', color: 'var(--text-primary)' },
          ].map((layer, i) => (
            <div key={layer.label} style={{ padding: '12px 16px', background: layer.bg, color: layer.color, borderRadius: i === 0 ? '12px 12px 0 0' : i === 4 ? '0 0 12px 12px' : 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{layer.label}</div>
                <div style={{ fontSize: 11, opacity: 0.7 }}>{layer.desc}</div>
              </div>
              <div style={{ fontSize: 11, fontFamily: 'monospace', opacity: 0.7 }}>z-{layer.z}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="AppBottomSheet">
        <p>
          The primary bottom sheet component. Slides up from the bottom with a drag handle
          and backdrop overlay. Used for city picker, sort/filter, appointments list, and
          member management.
        </p>
        <CodeBlock title="AppBottomSheet usage" code={`const { isPresented, isClosing, show, hide } = useAppSheet()

<AppBottomSheet open={isPresented} closing={isClosing} onClose={hide} labelledBy="invoice-title">
  <SheetHeader titleId="invoice-title" title="Invoice" onClose={hide} />
  <List>…</List>
  <Button size="lg" block>Download</Button>
</AppBottomSheet>`} />

        <CodeBlock title="Styles (src/styles/overlays.css)" code={`.ds-sheet-overlay   /* scrim, fadeIn / fadeOut */
.ds-sheet           /* white, 24px top corners, dsSheetSlideUp / Down */
.ds-sheet-handle    /* 36×4 neutral-300 grab handle */
.ds-sheet-header    /* SheetHeader: .ds-sheet-title + .ds-sheet-close */
.ds-sheet-option    /* menu rows (AppointmentMenuOptions) */
.ds-dialog-overlay / .ds-dialog   /* centred confirm dialogs */`} />
      </Section>

      <Section title="CityPickerSheet">
        <p>
          A specialized bottom sheet for selecting a city. Includes a search field,
          "Use current location" option, and a scrollable list of cities with radio selection.
        </p>
        <CodeBlock title="Location sheet" code={`<AppBottomSheet open={open} onClose={close} labelledBy="location-title">
  <SheetHeader titleId="location-title" title="Choose location" onClose={close} />
  <SearchField placeholder="Search for a city" value={query} onChange={onQuery} />
  <button className="ds-card is-interactive">…Use current location</button>
  <h3 className="ds-section-title">Recent</h3>
  <List>{cities.map((city) => <ListRow title={city} onClick={() => select(city)} />)}</List>
</AppBottomSheet>`} />
      </Section>

      <Section title="Shared transitions">
        <p>
          eMedicalls uses View Transitions API for smooth transitions between screens.
          The <code>useSharedHeroTransition</code> hook enables doctor images and elements
          to animate between list and detail views.
        </p>
        <CodeBlock title="Shared transition" code={`// DoctorCard — start transition
navigate(\`/doctor/\${doctor.id}\`, {
  state: { sharedHeroTransition: true },
})

// DoctorProfile — receive transition
const location = useLocation()
const { performSharedHeroTransition } = useSharedHeroTransition(
  location.state?.sharedHeroTransition
)

// Target card hides while the ghost morphs into it
<div className={\`ds-card appointment-summary-card \${hideHero ? 'is-morphing' : ''}\`} ref={heroRef}>
  <DoctorCard context="identity" />
</div>`} />
      </Section>

      <Section title="Animation tokens">
        <TokenTable tokens={[
          { token: 'Sheet slide-up', value: '0.25s', usage: 'Bottom sheet entrance animation' },
          { token: 'Backdrop fade', value: '0.2s', usage: 'Overlay backdrop fade-in' },
          { token: 'Easing', value: 'cubic-bezier(0.22, 1, 0.36, 1)', usage: 'Emphasized easing for sheets' },
          { token: '--radius-xl', value: '20px', usage: 'Sheet top border-radius' },
          { token: '--z-modal', value: '1000', usage: 'Modal z-index' },
          { token: '--z-overlay', value: '1100', usage: 'Full-screen overlay z-index' },
          { token: '--z-lightbox', value: '1200', usage: 'Lightbox z-index' },
        ]} />
      </Section>

      <Section title="Dismissal patterns">
        <ul>
          <li><strong>Backdrop tap</strong> — All overlays dismiss when tapping the backdrop.</li>
          <li><strong>Swipe down</strong> — Bottom sheets support swipe-to-dismiss via drag handle.</li>
          <li><strong>Close button</strong> — Overlays with titles include a close button in the header.</li>
          <li><strong>Escape key</strong> — All overlays respond to Escape key for keyboard users.</li>
          <li><strong>Selection</strong> — Some overlays auto-dismiss after a selection (city picker, sort).</li>
        </ul>
      </Section>

      <DoDont
        dos={[
          'Use the correct overlay type for the content. Bottom sheets for selections, modals for confirmations.',
          'Always provide a way to dismiss (backdrop tap, close button, escape key).',
          'Animate overlays in from the bottom for a natural, thumb-friendly pattern.',
        ]}
        donts={[
          'Stack multiple overlays on top of each other. This creates confusion.',
          'Use full-screen overlays for simple selections. Use bottom sheets.',
          'Show overlays without a backdrop. The backdrop communicates that the underlying content is inactive.',
        ]}
      />

      <RelatedLinks links={[
        { label: 'Motion', path: '/design/foundations/motion' },
        { label: 'Accessibility', path: '/design/foundations/accessibility' },
        { label: 'Bottom Sheets', path: '/design/components/inputs' },
      ]} />
    </>
  )
}
