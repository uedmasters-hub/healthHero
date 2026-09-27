/**
 * Static accessibility checks for the Home appointment journey carousel.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const carousel = readFileSync(join(root, 'src/components/UpcomingBookingsCarousel.jsx'), 'utf8')
const css = readFileSync(join(root, 'src/components/BookAppointment.css'), 'utf8')

const checks = [
  {
    name: 'no stacked hero slot render',
    ok: !/upcoming-hero-slot/.test(carousel),
  },
  {
    name: 'no secondary Upcoming header under hero',
    ok: !/upcoming-header-secondary/.test(carousel),
  },
  {
    name: 'carousel region + roledescription',
    ok: /role=["']region["']/.test(carousel)
      && /aria-roledescription=["']carousel["']/.test(carousel),
  },
  {
    name: 'slides expose slide roledescription',
    ok: /aria-roledescription=["']slide["']/.test(carousel),
  },
  {
    name: 'pagination tablist with labels',
    ok: /role=["']tablist["']/.test(carousel)
      && /aria-label=["']Appointment journey pages["']/.test(carousel)
      && /aria-label=\{label\}/.test(carousel),
  },
  {
    name: 'dots use aria-selected + roving tabIndex',
    ok: /aria-selected=\{activeIndex === index\}/.test(carousel)
      && /tabIndex=\{activeIndex === index \? 0 : -1\}/.test(carousel),
  },
  {
    name: 'empty state uses role=status',
    ok: /role=["']status["']/.test(carousel),
  },
  {
    name: 'last-viewed position persisted',
    ok: /homeCarouselView/.test(carousel)
      && /sessionStorage\.setItem/.test(carousel)
      && /readCarouselView/.test(carousel),
  },
  {
    name: 'carousel gap and peek stay tight',
    ok: /--relay-card-gap:\s*var\(--space-2\)/.test(css)
      && /--relay-peek:\s*var\(--space-6\)/.test(css)
      && /gap:\s*var\(--relay-card-gap\)/.test(css)
      && /margin-left:\s*var\(--content-padding\)/.test(css)
      && /padding-left:\s*0/.test(css)
      && /scroll-snap-type:\s*x\s+mandatory/.test(css)
      && /scroll-snap-align:\s*start/.test(css)
      && /scroll-padding-left:\s*0/.test(css)
      && /100cqi - var\(--relay-card-gap\) - var\(--relay-peek\)/.test(css)
      && /transform-origin:\s*left center/.test(css)
      && !/scale\(0\.98\)/.test(css),
  },
  {
    name: 'single-slide snap disabled',
    ok: /\.upcoming-carousel\.is-single/.test(css),
  },
  {
    name: 'smooth slide transition retained',
    ok: /\.upcoming-card\s*\{[^}]*transition:[^}]*transform[^}]*opacity/s.test(css),
  },
  {
    name: 'scroll position owns the active card',
    ok: /nearestSnapIndex/.test(carousel)
      && /requestAnimationFrame/.test(carousel)
      && /pointerdown/.test(carousel)
      && /scrollend/.test(carousel)
      && /onActivate=\{\(\) => scrollToIndex\(index\)\}/.test(carousel),
  },
  {
    name: 'active card expands with a spring on width, scale, and elevation',
    ok: /width var\(--duration-slow\) var\(--ease-emphasized\)/.test(css)
      && /transform var\(--duration-slow\) var\(--ease-emphasized\)/.test(css)
      && /box-shadow var\(--duration-slow\) var\(--ease-emphasized\)/.test(css)
      && /\.upcoming-card\.is-active\s*\{[^}]*width:\s*100%/.test(css)
      && /\.upcoming-card\.is-active\s*\{[^}]*box-shadow:\s*var\(--shadow-hover\)/.test(css),
  },
  {
    name: 'post visit stays in carousel as a completed journey',
    ok: /isPostVisit \? 'is-post-visit'/.test(carousel)
      && /is-completed-journey/.test(carousel)
      && /upcoming-status/.test(carousel),
  },
  {
    name: 'completed cards are not marked disabled',
    ok: !/aria-disabled/.test(carousel)
      && !/upcoming-card[\s\S]{0,400}disabled=\{/.test(carousel),
  },
  {
    name: 'completed journey uses softer featured gradient',
    ok: /\.upcoming-card\.is-completed-journey\s*\{[^}]*linear-gradient\(/.test(css)
      && /--featured-completed-start/.test(css)
      && /--featured-completed-mid/.test(css)
      && /--featured-completed-end/.test(css),
  },
  {
    name: 'completed journey is not faded or unclickable',
    ok: !/\.upcoming-card\.is-completed-journey\s*\{[^}]*(?:opacity:\s*0\.[0-5]|pointer-events:\s*none)/s.test(css),
  },
]

const failed = checks.filter((c) => !c.ok)
console.log(JSON.stringify({
  passed: checks.filter((c) => c.ok).map((c) => c.name),
  failed: failed.map((c) => c.name),
}, null, 2))

if (failed.length) {
  console.error('ASSERT FAIL')
  process.exit(1)
}
console.log('OK')
