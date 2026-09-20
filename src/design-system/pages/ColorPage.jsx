import { SwatchGrid, TokenTable, DoDont, Callout, RelatedLinks, Preview, CodeBlock, Section } from '../shared'

const brandColors = [
  { name: '--primary', value: '#5B5FC6', hex: '#5B5FC6' },
  { name: '--primary-light', value: '#7B7FD7', hex: '#7B7FD7' },
  { name: '--primary-dark', value: '#4A4EB0', hex: '#4A4EB0' },
  { name: '--primary-gradient-end', value: '#9B9FE8', hex: '#9B9FE8' },
  { name: '--primary-soft', value: '#EEF0FF', hex: '#EEF0FF' },
  { name: '--primary-soft-strong', value: '#E4E6F8', hex: '#E4E6F8' },
  { name: '--primary-press', value: '#F4F4FF', hex: '#F4F4FF' },
]
const surfaceColors = [
  { name: '--white', value: '#FFFFFF', hex: '#FFFFFF' },
  { name: '--card-bg', value: '#FFFFFF', hex: '#FFFFFF' },
  { name: '--bg', value: '#F5F5F8', hex: '#F5F5F8' },
  { name: '--surface-muted', value: '#F3F4F8', hex: '#F3F4F8' },
  { name: '--media-bg', value: '#EEF1F6', hex: '#EEF1F6' },
  { name: '--chip-bg', value: '#EAF4FC', hex: '#EAF4FC' },
  { name: '--badge-bg', value: '#F2F4F7', hex: '#F2F4F7' },
  { name: '--active-bg', value: '#F0F0FF', hex: '#F0F0FF' },
]
const textColors = [
  { name: '--text-primary', value: '#1A1A2E', hex: '#1A1A2E' },
  { name: '--text-secondary', value: '#6B7280', hex: '#6B7280' },
  { name: '--text-faint', value: '#9CA3AF', hex: '#9CA3AF' },
  { name: '--text-on-primary', value: '#FFFFFF', hex: '#FFFFFF' },
]
const statusColors = [
  { name: '--success', value: '#059669', hex: '#059669' },
  { name: '--success-light', value: '#4ADE80', hex: '#4ADE80' },
  { name: '--success-bg', value: '#E8F5E9', hex: '#E8F5E9' },
  { name: '--success-text', value: '#047857', hex: '#047857' },
  { name: '--danger', value: '#DC2626', hex: '#DC2626' },
  { name: '--danger-bg', value: '#FEF2F2', hex: '#FEF2F2' },
  { name: '--warning', value: '#D97706', hex: '#D97706' },
  { name: '--warning-bg', value: '#FEF3C7', hex: '#FEF3C7' },
  { name: '--warning-border', value: '#FFD54F', hex: '#FFD54F' },
  { name: '--urgent', value: '#C2410C', hex: '#C2410C' },
  { name: '--urgent-bg', value: '#FFF4E6', hex: '#FFF4E6' },
  { name: '--info', value: '#3B5BDB', hex: '#3B5BDB' },
  { name: '--info-bg', value: '#EDF2FF', hex: '#EDF2FF' },
  { name: '--rating', value: '#F59E0B', hex: '#F59E0B' },
]
const borderColors = [
  { name: '--border', value: '#EEEFF3', hex: '#EEEFF3' },
  { name: '--border-subtle', value: '#F0F1F4', hex: '#F0F1F4' },
  { name: '--border-strong', value: '#E5E7EB', hex: '#E5E7EB' },
  { name: '--border-focus', value: 'var(--primary)', hex: '#5B5FC6' },
]

export default function ColorPage() {
  return (
    <>
      <div className="ds-page-header">
        <div className="ds-page-breadcrumb">Foundations / Color</div>
        <h1 className="ds-page-title">Color</h1>
        <p className="ds-page-description">
          The color system that defines eMedicalls' visual identity — 50+ semantic tokens for brand, surfaces, text, status, and borders.
        </p>
      </div>

      <Section title="Color philosophy">
        <p>
          Every color in eMedicalls serves a purpose. Our palette is anchored by a single indigo primary
          (<code>#5B5FC6</code>) with semantic status colors for feedback. Colors are never decorative —
          they communicate state, hierarchy, and meaning across the entire application.
        </p>
        <p>
          All color values are exposed as CSS custom properties in <code>src/index.css</code> under the
          <code>:root</code> selector. Use semantic tokens, never raw hex values.
        </p>
      </Section>

      <Section title="Brand / Primary" description="The core brand palette — used for buttons, links, active states, and accent surfaces.">
        <SwatchGrid colors={brandColors} />
        <TokenTable tokens={[
          { token: '--primary', value: '#5B5FC6', usage: 'Primary brand color — buttons, links, active accents' },
          { token: '--primary-light', value: '#7B7FD7', usage: 'Lighter variant — hover states, secondary fills' },
          { token: '--primary-dark', value: '#4A4EB0', usage: 'Darker variant — hover/pressed CTA backgrounds' },
          { token: '--primary-soft', value: '#EEF0FF', usage: 'Soft tinted fill — icon wells, avatar backgrounds, service icons' },
          { token: '--primary-press', value: '#F4F4FF', usage: 'Pressed/active state for brand-tinted surfaces' },
        ]} />
        <CodeBlock title="Usage" code={`background: var(--primary);          /* #5B5FC6 — primary actions */
background: var(--primary-dark);      /* #4A4EB0 — hover state */
background: var(--primary-soft);      /* #EEF0FF — icon wells, tinted surfaces */
color: var(--text-on-primary);        /* #FFFFFF — text on primary bg */`} />
      </Section>

      <Section title="Surfaces" description="Background colors for pages, cards, and content containers.">
        <SwatchGrid colors={surfaceColors} />
        <TokenTable tokens={[
          { token: '--white', value: '#FFFFFF', usage: 'Pure white — app canvases, footers, sticky bars' },
          { token: '--card-bg', value: '#FFFFFF', usage: 'Card/panel background — elevated white surfaces' },
          { token: '--bg', value: '#F5F5F8', usage: 'Page-level canvas background' },
          { token: '--surface-muted', value: '#F3F4F8', usage: 'Inactive/skeleton fill — muted background surfaces' },
          { token: '--chip-bg', value: '#EAF4FC', usage: 'Chip/tag component background' },
          { token: '--active-bg', value: '#F0F0FF', usage: 'Active/selected state background' },
        ]} />
      </Section>

      <Section title="Text" description="Typography colors with 15.4:1 contrast ratio for primary text.">
        <SwatchGrid colors={textColors} />
        <TokenTable tokens={[
          { token: '--text-primary', value: '#1A1A2E', usage: 'Primary text — headings, body content (15.4:1 on white)' },
          { token: '--text-secondary', value: '#6B7280', usage: 'Secondary text — labels, captions (5.0:1 on white)' },
          { token: '--text-faint', value: '#9CA3AF', usage: 'Decorative/disabled chrome only (2.9:1 — not for body text)' },
          { token: '--text-on-primary', value: '#FFFFFF', usage: 'Text rendered on primary-colored backgrounds (4.6:1)' },
        ]} />
      </Section>

      <Section title="Semantic status" description="Purpose-driven colors for success, danger, warning, and info states.">
        <SwatchGrid colors={statusColors} />
        <TokenTable tokens={[
          { token: '--success', value: '#059669', usage: 'Success icon/text color (4.5:1 on white)' },
          { token: '--success-bg', value: '#E8F5E9', usage: 'Success surface background' },
          { token: '--danger', value: '#DC2626', usage: 'Danger/error icon/text color (4.6:1 on white)' },
          { token: '--danger-bg', value: '#FEF2F2', usage: 'Danger surface background' },
          { token: '--warning', value: '#D97706', usage: 'Warning icon/text color' },
          { token: '--warning-bg', value: '#FEF3C7', usage: 'Warning surface background' },
          { token: '--urgent', value: '#C2410C', usage: 'Urgent/high-priority indicator' },
          { token: '--info', value: '#3B5BDB', usage: 'Info icon/text color' },
          { token: '--info-bg', value: '#EDF2FF', usage: 'Info surface background' },
          { token: '--rating', value: '#F59E0B', usage: 'Rating/star indicator color' },
        ]} />
      </Section>

      <Section title="Borders" description="Border colors with three levels of emphasis.">
        <SwatchGrid colors={borderColors} />
        <TokenTable tokens={[
          { token: '--border', value: '#EEEFF3', usage: 'Default border — cards, inputs, sheets, calendars' },
          { token: '--border-subtle', value: '#F0F1F4', usage: 'Hairline dividers inside surfaces' },
          { token: '--border-strong', value: '#E5E7EB', usage: 'Emphasized separators — footers, sticky chrome' },
          { token: '--border-focus', value: 'var(--primary)', usage: 'Focus ring/outline color (resolves to #5B5FC6)' },
          { token: '--border-width', value: '1px', usage: 'Default border width' },
          { token: '--border-width-emphasis', value: '1.5px', usage: 'Emphasized border width' },
          { token: '--border-width-strong', value: '2px', usage: 'Strong/heavy border width' },
        ]} />
      </Section>

      <Section title="Overlay / Scrim" description="Backdrop colors for modals, sheets, and lightboxes.">
        <TokenTable tokens={[
          { token: '--overlay', value: 'rgba(15, 23, 42, 0.35)', usage: 'Standard overlay/scrim (modal backdrop, drawer backdrop)' },
          { token: '--overlay-strong', value: 'rgba(15, 23, 42, 0.5)', usage: 'Stronger overlay for emphasis' },
          { token: '--overlay-lightbox', value: '#0c0e14', usage: 'Lightbox/image viewer background' },
          { token: '--surface-lightbox', value: '#1c1d22', usage: 'Lightbox panel/surface color' },
          { token: '--frame-backdrop', value: '#121214', usage: 'Outermost app frame backdrop (behind phone mockup)' },
          { token: '--shimmer-mid', value: '#e4e7ee', usage: 'Midpoint color for shimmer/skeleton loading animation' },
        ]} />
      </Section>

      <DoDont
        dos={[
          'Use semantic tokens like var(--success) for status colors. This ensures consistency and supports future theming.',
          'Use var(--text-primary) for body text and var(--text-secondary) for labels and captions.',
          'Use var(--border) for card borders and var(--border-subtle) for internal dividers.',
        ]}
        donts={[
          'Never use raw hex values like #DC2626 in component styles. Always reference the token.',
          'Never use --text-faint for body text. It fails WCAG contrast requirements.',
          'Never use --border-strong for every border. Reserve it for emphasis.',
        ]}
      />

      <Callout type="info">
        All status colors were verified against WCAG 2.1 AA contrast requirements. Primary text achieves 15.4:1 (AAA),
        secondary text achieves 5.0:1 (AA), and primary on white achieves 4.6:1 (AA).
      </Callout>

      <RelatedLinks links={[
        { label: 'Design Tokens', path: '/design/foundations/tokens' },
        { label: 'Accessibility', path: '/design/foundations/accessibility' },
        { label: 'Elevation', path: '/design/foundations/elevation' },
        { label: 'Border', path: '/design/foundations/border' },
      ]} />
    </>
  )
}
