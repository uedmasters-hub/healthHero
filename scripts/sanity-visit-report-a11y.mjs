import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const page = fs.readFileSync(path.join(root, 'src/components/PostVisitReport.jsx'), 'utf8')
const css = fs.readFileSync(path.join(root, 'src/components/PostVisitReport.css'), 'utf8')
// Radios, rows, fields and the back control come from the shared design system.
const primitives = fs.readFileSync(path.join(root, 'src/styles/primitives.css'), 'utf8')
const ui = fs.readFileSync(path.join(root, 'src/components/ui/index.jsx'), 'utf8')
const failures = []

function check(name, ok) {
  if (!ok) failures.push(name)
  console.log(`${ok ? 'ok' : 'FAIL'} ${name}`)
}

check('the question is named', page.includes('aria-labelledby="report-outcomes-label"') && page.includes('What best describes your visit?'))
check('supporting text is associated', page.includes('aria-describedby="report-outcomes-hint"'))
check('choices are radios in one group', page.includes('role="radiogroup"') && page.includes('role="radio"') && page.includes('aria-checked={on}'))
check('arrow keys move the selection', page.includes('ArrowDown') && page.includes('ArrowUp'))
check('only the selected radio stays in the tab order', page.includes('tabIndex={selected ? (on ? 0 : -1) : (index === 0 ? 0 : -1)}'))
check('the radio mark is decorative', page.includes('className="ds-radio" aria-hidden="true"'))
check('closed details are inert', page.includes('inert={!on}'))
check('detail fields are labeled', page.includes('htmlFor={`${detailId}-input`}'))
check('an existing follow-up is announced', page.includes('role="status"') && page.includes('Scheduled follow-up'))
check('save explains the next step', page.includes('Add any details you have, then save.') && page.includes('aria-describedby="report-save-hint"'))
check('save stays available to assistive tech until it can run', page.includes('aria-disabled={!canSave}') && !page.includes(' disabled={'))
check('errors are alerts', page.includes('role="alert"'))
check('back control is named', page.includes('<AppBar') && page.includes('onBack=') && ui.includes("label = 'Back'") && ui.includes('aria-label={label}'))
check('the radio ring is visible', /\.ds-radio \{[^}]*border: var\(--border-width-emphasis\) solid var\(--neutral-400\)[^}]*\}/.test(primitives) && /\.ds-radio \{[^}]*border-radius: var\(--radius-full\)/.test(primitives))
check('the selected radio uses the action color', primitives.includes("[aria-checked='true'] > .ds-radio::after") && /\.ds-radio::after \{[^}]*background: var\(--primary-950\)/.test(primitives))
check('detail expand can be reduced', css.includes('prefers-reduced-motion: reduce'))
check('rows meet the touch size', /\.ds-choice \{[^}]*min-height: 3\.25rem/.test(primitives))
check('fields stay inside the page width', /\.ds-field \{[^}]*width: 100%/.test(primitives) && page.includes('className="ds-field'))

if (failures.length) {
  console.error(`visit report a11y failed: ${failures.join(', ')}`)
  process.exit(1)
}
console.log('visit report a11y passed')
