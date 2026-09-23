import { SwatchGrid, TokenTable, DoDont, Callout, RelatedLinks, Preview, CodeBlock, Section } from '../shared'

const brandColors = [
  { name: '--accent / --primary-950', value: '#4e2a84', hex: '#4e2a84' },
  { name: '--accent-muted / --primary-800', value: '#37325d', hex: '#37325d' },
  { name: '--accent-subtle / --primary-300', value: '#e5e3ff', hex: '#e5e3ff' },
  { name: '--primary-900', value: '#220f3e', hex: '#220f3e' },
  { name: '--primary-400', value: '#aaa4ff', hex: '#aaa4ff' },
  { name: '--primary-200', value: '#f5f4fa', hex: '#f5f4fa' },
]
const ctaColors = [
  { name: '--accent (actions)', value: '#4e2a84', hex: '#4e2a84' },
  { name: '--fab-bg (secondary)', value: '#37325d', hex: '#37325d' },
  { name: '--featured-mid (status)', value: '#37325d', hex: '#37325d' },
]
const surfaceColors = [
  { name: '--bg / --pp-page', value: '#f5f4fa', hex: '#f5f4fa' },
  { name: '--card-bg', value: '#ffffff', hex: '#ffffff' },
  { name: '--avatar-surface', value: '#e5e3ff', hex: '#e5e3ff' },
  { name: '--badge-ready-bg', value: 'sage mix', hex: '#e8f6f8' },
]
const textColors = [
  { name: '--text-primary', value: '#180730', hex: '#180730' },
  { name: '--text-secondary', value: '#534b74', hex: '#534b74' },
  { name: '--text-tertiary', value: '#67648b', hex: '#67648b' },
  { name: '--text-disabled', value: '#8e90b8', hex: '#8e90b8' },
]
const statusColors = [
  { name: '--success', value: '#0a5a68', hex: '#0a5a68' },
  { name: '--success-bg', value: '#a4eefb', hex: '#a4eefb' },
  { name: '--danger', value: '#b8310f', hex: '#b8310f' },
  { name: '--danger-bg', value: '#ffe8e8', hex: '#ffe8e8' },
  { name: '--warning', value: '#b94801', hex: '#b94801' },
  { name: '--warning-bg', value: '#ffebd5', hex: '#ffebd5' },
  { name: '--info', value: '#7b47ff', hex: '#7b47ff' },
  { name: '--rating', value: '#b5a8d4', hex: '#b5a8d4' },
]

export default function ColorPage() {
  return (
    <>
      <div className="ds-page-header">
        <div className="ds-page-breadcrumb">Foundations / Color</div>
        <h1 className="ds-page-title">Color</h1>
        <p className="ds-page-description">
          PocketPills tonal scale with a clear accent hierarchy — one brand accent for primary
          actions, muted secondary chrome, and calm featured surfaces.
        </p>
      </div>

      <Section title="Color philosophy">
        <p>
          Home hierarchy targets ~70% neutral surfaces, ~20% supporting accent, and ~10% high
          emphasis. <code>--accent</code> is reserved for active nav and primary CTAs.
          The Upcoming card is the sole hero via <code>--featured-*</code>. FAB, icons, and
          See all links stay quiet slate / secondary text.
        </p>
      </Section>

      <Section title="Accent scale" description="Single tonal family — roles, not competing hues.">
        <SwatchGrid colors={brandColors} />
      </Section>

      <Section title="Action roles" description="Primary accent vs secondary FAB vs featured surfaces.">
        <SwatchGrid colors={ctaColors} />
        <CodeBlock title="Usage" code={`background: var(--accent);        /* primary actions */
background: var(--fab-bg);        /* secondary FAB */
background: linear-gradient(...featured...); /* status card */
color: var(--text-link);          /* muted links */
color: var(--rating-star);        /* soft decorative */`} />
      </Section>

      <Section title="Surfaces">
        <SwatchGrid colors={surfaceColors} />
      </Section>

      <Section title="Text / ink">
        <SwatchGrid colors={textColors} />
        <TokenTable tokens={[
          { token: '--text-primary', value: '#180730', usage: 'Body and headings' },
          { token: '--text-secondary', value: '#534b74', usage: 'Supporting copy / labels' },
          { token: '--text-tertiary', value: '#67648b', usage: 'Meta / hints' },
          { token: '--text-disabled', value: '#8e90b8', usage: 'Disabled chrome' },
        ]} />
      </Section>

      <Section title="Status">
        <SwatchGrid colors={statusColors} />
      </Section>

      <DoDont
        dos={[
          'Use var(--accent) only for primary actions (active nav, Book CTA, focus, selected chips).',
          'Keep See all / View all on var(--text-secondary); brand color only on hover if needed.',
          'Keep the Upcoming card as the sole hero via --featured-* — soften surrounding chrome.',
        ]}
        donts={[
          'Do not paint service icons, FAB, avatar, and header chrome in strong purple at once.',
          'Do not invent off-scale purples; stay on the PocketPills primary ladder.',
        ]}
      />

      <RelatedLinks links={[
        { href: '/design/foundations/tokens', label: 'Tokens' },
        { href: '/design/foundations/typography', label: 'Typography' },
        { href: '/design/foundations/elevation', label: 'Elevation' },
      ]} />
    </>
  )
}
