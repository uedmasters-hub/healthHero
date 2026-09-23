import { TokenTable, DoDont, Callout, RelatedLinks, Preview, CodeBlock, Section } from '../shared'

export default function SkeletonsPage() {
  return (
    <>
      <div className="ds-page-header">
        <div className="ds-page-breadcrumb">Components / Skeletons</div>
        <h1 className="ds-page-title">Skeletons</h1>
        <p className="ds-page-description">
          Loading placeholders that communicate content is being fetched — part of eMedicalls'
          stagger reveal system that creates seamless content transitions.
        </p>
      </div>

      <Section title="Overview">
        <p>
          eMedicalls uses a sophisticated loading system built on three primitives:
          <code>.shimmer</code> (animated gradient), <code>.reveal-host</code> (container),
          and <code>.reveal-body</code> (real content). The system is powered by the
          <code>useStaggerReveal</code> hook and <code>RevealItem</code> component.
        </p>
      </Section>

      <Section title="Live preview">
        <h3>Shimmer skeleton</h3>
        <Preview code={`<div className="shimmer" style={{ width: '100%', height: 16, borderRadius: 8 }} />`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 360 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div className="shimmer" style={{ width: 48, height: 48, borderRadius: '50%', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div className="shimmer" style={{ height: 14, width: '70%', marginBottom: 8, borderRadius: 4 }} />
                <div className="shimmer" style={{ height: 12, width: '50%', borderRadius: 4 }} />
              </div>
            </div>
            <div className="shimmer" style={{ height: 160, borderRadius: 12 }} />
            <div>
              <div className="shimmer" style={{ height: 14, width: '90%', marginBottom: 8, borderRadius: 4 }} />
              <div className="shimmer" style={{ height: 14, width: '60%', borderRadius: 4 }} />
            </div>
          </div>
        </Preview>

        <h3>Reveal pattern (skeleton → content)</h3>
        <Preview code={`<div className="reveal-host">
  <div className="reveal-skel">
    <div className="shimmer reveal-skel-fill" />
  </div>
  <div className="reveal-body is-visible">
    <!-- Real content fades in -->
  </div>
</div>`}>
          <div style={{ display: 'flex', gap: 16, width: '100%' }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div className="shimmer" style={{ height: 120, borderRadius: 12, marginBottom: 8 }} />
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Loading (shimmer)</div>
            </div>
            <div style={{ fontSize: 24, color: 'var(--text-faint)', alignSelf: 'center' }}>→</div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ height: 120, borderRadius: 12, background: 'var(--primary-300)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#4e2a84' }}>Content</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Revealed</div>
            </div>
          </div>
        </Preview>
      </Section>

      <Section title="How it works">
        <CodeBlock title="Shimmer animation" code={`.shimmer {
  background: linear-gradient(
    90deg,
    var(--border) 25%,        /* neutral hairline — rest color */
    var(--shimmer-mid) 37%,   /* #e4e7ee — bright peak */
    var(--border) 63%
  );
  background-size: 200% 100%;
  animation: shimmer 1.45s ease-in-out infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}`} />

        <CodeBlock title="Reveal system" code={`.reveal-host {
  position: relative;
  overflow: hidden;
}

.reveal-skel {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  opacity: 1;
  transition: opacity 0.28s ease;
}

.reveal-skel.is-hidden {
  opacity: 0;
}

.reveal-body {
  opacity: 0;
  transform: translateY(8px);
  transition: opacity 0.28s ease, transform 0.32s cubic-bezier(0.22, 1, 0.36, 1);
}

.reveal-body.is-visible {
  opacity: 1;
  transform: none;
}`} />
      </Section>

      <Section title="useStaggerReveal hook">
        <p>
          The <code>useStaggerReveal</code> hook manages staggered reveal timing for lists of items.
          It caches loaded state per <code>cacheId</code> so returning users see instant content.
        </p>
        <CodeBlock title="Hook API" code={`const { isRevealed, isCached } = useStaggerReveal(cacheId, enabled)

// isRevealed(idx) — returns true when item at idx should be visible
// isCached — true when all items have been revealed before (skip animation)`} />

        <CodeBlock title="Usage in DoctorList" code={`{doctors.map((doctor, i) => (
  <RevealItem
    key={doctor.id}
    revealed={isRevealed(i)}
    cached={isCached}
  >
    <DoctorCard doctor={doctor} variant="grid" />
  </RevealItem>
))}`} />
      </Section>

      <Section title="Skeleton patterns in the app">
        <TokenTable tokens={[
          { token: '--border', value: 'primary-800 @ 12%', usage: 'Skeleton rest color (25% and 63% stops)' },
          { token: '--shimmer-mid', value: '#e4e7ee', usage: 'Skeleton bright peak (37% stop)' },
          { token: 'animation duration', value: '1.45s', usage: 'Shimmer cycle duration' },
          { token: 'reveal opacity', value: '0.28s', usage: 'Content fade-in duration' },
          { token: 'reveal transform', value: '0.32s', usage: 'Content slide-up duration (emphasized easing)' },
          { token: '--ease-emphasized', value: 'cubic-bezier(0.22, 1, 0.36, 1)', usage: 'Reveal transform easing' },
        ]} />
      </Section>

      <Section title="Places skeletons appear">
        <ul>
          <li><code>DoctorList</code> — Staggered reveal for doctor card grids</li>
          <li><code>TopDoctors</code> — Skeleton cards that reveal on scroll</li>
          <li><code>TopDoctorsOverlay</code> — Skeleton loading for top doctors overlay</li>
          <li><code>InsightsBottomSheet</code> — Skeleton loading for health insights</li>
          <li><code>AppointmentDetail</code> — Skeleton placeholders during content load</li>
          <li><code>PreVisitCheckIn</code> — Skeleton banner during check-in flow</li>
          <li><code>TreatPage</code> — Skeleton rows for care history</li>
          <li><code>BookingReveal</code> — Doctor hero skeleton during shared transitions</li>
        </ul>
      </Section>

      <DoDont
        dos={[
          'Match skeleton shapes to the real content layout. This creates a seamless loading experience.',
          'Use the reveal-host/reveal-skel/reveal-body pattern for consistent transitions.',
          'Cache loaded state so returning users see instant content.',
        ]}
        donts={[
          'Show skeletons for content that loads instantly. Only use them for async data that takes noticeable time.',
          'Use skeletons as placeholders for permanently empty states. Use EmptyState instead.',
          'Skip the reveal animation. The opacity + transform transition is what makes skeletons feel premium.',
        ]}
      />

      <Callout type="info">
        The shimmer animation respects <code>prefers-reduced-motion</code>. Users who have requested
        reduced motion will see instant state changes instead of shimmer animations.
      </Callout>

      <RelatedLinks links={[
        { label: 'Motion', path: '/design/foundations/motion' },
        { label: 'Color', path: '/design/foundations/color' },
        { label: 'Empty States', path: '/design/components/empty-states' },
      ]} />
    </>
  )
}
