/**
 * Static accessibility checks for the Choose location sheet.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const header = readFileSync(join(root, 'src/components/Header.jsx'), 'utf8')

const checks = [
  {
    name: 'sheet labelled by title',
    ok: /labelledBy=["']location-sheet-title["']/.test(header)
      && /id=["']location-sheet-title["']/.test(header),
  },
  {
    name: 'close control has aria-label',
    ok: /aria-label=["']Close["']/.test(header),
  },
  {
    name: 'GPS control has aria-label',
    ok: /aria-label=\{fromGps \? 'Use current GPS location, selected'/.test(header),
  },
  {
    name: 'refresh control has aria-label',
    ok: /aria-label=["']Refresh current location["']/.test(header),
  },
  {
    name: 'recent group labelled',
    ok: /aria-labelledby=["']location-recent-label["']/.test(header)
      && /id=["']location-recent-label["']/.test(header),
  },
  {
    name: 'suggested group labelled',
    ok: /aria-labelledby=["']location-suggested-label["']/.test(header)
      && /id=["']location-suggested-label["']/.test(header),
  },
  {
    name: 'recent items expose aria-label + aria-current',
    ok: /aria-label=\{isActive \? `\$\{item\.locality\}, current location`/.test(header)
      && /aria-current=\{isActive \? ['"]true['"] : undefined\}/.test(header),
  },
  {
    name: 'decorative pins are aria-hidden',
    ok: /location-item-pin" aria-hidden="true"/.test(header)
      || /location-item-pin" aria-hidden=\{?["']true["']\}?/.test(header)
      || /className="location-item-pin" aria-hidden="true"/.test(header),
  },
  {
    name: 'no invalid listitem role on buttons',
    ok: !/role=["']listitem["']/.test(header),
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
