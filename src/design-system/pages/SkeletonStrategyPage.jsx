import { TokenTable, DoDont, Callout, RelatedLinks, CodeBlock, Section } from '../shared'

export default function SkeletonStrategyPage() {
  return (
    <>
      <div className="ds-page-header">
        <div className="ds-page-breadcrumb">Rovo UI / Skeleton Strategy</div>
        <h1 className="ds-page-title">Skeleton Strategy</h1>
        <p className="ds-page-description">
          The stagger reveal system that creates seamless content transitions — from shimmer
          skeletons to revealed content with cached loading states.
        </p>
      </div>

      <Section title="Overview">
        <p>
          Health Hero's skeleton strategy is built on three layers: the <code>shimmer</code>
          primitive (animated gradient), the <code>reveal-host/reveal-skel/reveal-body</code>
          CSS pattern (fade + slide transition), and the <code>useStaggerReveal</code> hook
          (orchestrates timing for lists). This system ensures loading states feel intentional
          and premium.
        </p>
      </Section>

      <Section title="Three layers">
        <CodeBlock title="Layer 1: Shimmer primitive" code={`.shimmer {
  background: linear-gradient(
    90deg,
    var(--border) 25%,
    var(--shimmer-mid) 37%,
    var(--border) 63%
  );
  background-size: 200% 100%;
  animation: shimmer 1.45s ease-in-out infinite;
}`} />

        <CodeBlock title="Layer 2: Reveal CSS pattern" code={`.reveal-host { position: relative; overflow: hidden; }

.reveal-skel {
  position: absolute; inset: 0;
  opacity: 1; transition: opacity 0.28s ease;
}
.reveal-skel.is-hidden { opacity: 0; }

.reveal-body {
  opacity: 0; transform: translateY(8px);
  transition: opacity 0.28s ease, transform 0.32s cubic-bezier(0.22, 1, 0.36, 1);
}
.reveal-body.is-visible { opacity: 1; transform: none; }`} />

        <CodeBlock title="Layer 3: useStaggerReveal hook" code={`const { isRevealed, isCached } = useStaggerReveal(cacheId, enabled)

// Usage in component
{items.map((item, i) => (
  <RevealItem key={item.id} revealed={isRevealed(i)} cached={isCached}>
    <CardContent item={item} />
  </RevealItem>
))}`} />
      </Section>

      <Section title="RevealItem component">
        <p>
          <code>RevealItem</code> wraps content and applies the reveal animation.
          When <code>revealed</code> is true, it adds <code>is-visible</code> to the
          <code>reveal-body</code> and <code>is-hidden</code> to the <code>reveal-skel</code>.
          When <code>cached</code> is true, it skips animation entirely.
        </p>
        <CodeBlock title="RevealItem" code={`function RevealItem({ revealed, cached, children }) {
  return (
    <div className="reveal-host">
      {!cached && (
        <div className={revealed ? 'reveal-skel is-hidden' : 'reveal-skel'}>
          <div className="shimmer reveal-skel-fill" />
        </div>
      )}
      <div className={revealed || cached ? 'reveal-body is-visible' : 'reveal-body'}>
        {children}
      </div>
    </div>
  )
}`} />
      </Section>

      <Section title="Caching strategy">
        <p>
          The <code>useStaggerReveal</code> hook caches revealed state per <code>cacheId</code>
          using a module-level Map. On first load, items stagger in with delays. On subsequent
          renders (returning to the page), all items appear instantly because they're cached.
        </p>
        <CodeBlock title="Cache behavior" code={`// First visit: stagger reveal
Item 0 → 0ms delay → revealed
Item 1 → 90ms delay → revealed
Item 2 → 180ms delay → revealed

// Return visit: instant (cached)
All items → 0ms delay → revealed instantly`} />
      </Section>

      <Section title="Timing constants">
        <TokenTable tokens={[
          { token: 'Shimmer cycle', value: '1.45s', usage: 'Full gradient animation cycle' },
          { token: 'Stagger delay', value: '90ms', usage: 'Delay between each item reveal' },
          { token: 'Content fade', value: '0.28s', usage: 'Opacity transition for reveal' },
          { token: 'Content slide', value: '0.32s', usage: 'Transform transition (emphasized easing)' },
          { token: 'Easing', value: 'cubic-bezier(0.22, 1, 0.36, 1)', usage: 'Emphasized easing for natural feel' },
          { token: 'Shimmer rest color', value: '#EEEFF3', usage: 'Skeleton base color (25% and 63% stops)' },
          { token: 'Shimmer peak color', value: '#e4e7ee', usage: 'Bright gradient peak (37% stop)' },
        ]} />
      </Section>

      <Section title="Places it's used">
        <ul>
          <li><strong>DoctorList</strong> — Stagger reveal for doctor cards</li>
          <li><strong>TopDoctors</strong> — Scroll-triggered reveal for featured doctors</li>
          <li><strong>TopDoctorsOverlay</strong> — Skeleton loading for full list</li>
          <li><strong>InsightsBottomSheet</strong> — Health insights skeleton</li>
          <li><strong>AppointmentDetail</strong> — Full-page skeleton during load</li>
          <li><strong>TreatPage</strong> — Care history skeleton</li>
          <li><strong>BookingReveal</strong> — Doctor hero skeleton during shared transitions</li>
        </ul>
      </Section>

      <DoDont
        dos={[
          'Use skeletons for content that takes noticeable time to load (>200ms).',
          'Match skeleton shapes to real content layout for seamless transitions.',
          'Cache reveal state so returning users see instant content.',
        ]}
        donts={[
          'Show skeletons for instantly available content. This adds unnecessary visual noise.',
          'Skip the reveal animation. The fade + slide transition is what makes skeletons feel premium.',
          'Use different stagger delays for different lists. Keep it consistent at 90ms.',
        ]}
      />

      <Callout type="info">
        The shimmer animation respects <code>prefers-reduced-motion</code>. Users who have requested
        reduced motion will see instant state changes instead of shimmer animations.
      </Callout>

      <RelatedLinks links={[
        { label: 'Skeletons', path: '/design/components/skeletons' },
        { label: 'Motion', path: '/design/foundations/motion' },
        { label: 'Color', path: '/design/foundations/color' },
      ]} />
    </>
  )
}
