import fs from 'node:fs'
import path from 'node:path'

export function createReportCollector(root) {
  const startedAt = new Date()
  const sections = []

  return {
    add(section) {
      sections.push({ ...section, at: new Date().toISOString() })
    },
    write() {
      const finishedAt = new Date()
      const report = {
        title: 'eMedicalls registry migration report',
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
        durationMs: finishedAt - startedAt,
        sections,
        summary: sections.map((s) => ({
          dataset: s.dataset,
          status: s.status,
          sourceRows: s.sourceRows,
          mapped: s.mapped,
          skipped: s.skipped,
          upserted: s.upserted,
          failed: s.failed,
          dbCount: s.dbCount,
          notes: s.notes,
        })),
      }

      const outDir = path.join(root, 'scripts/migrate/reports')
      fs.mkdirSync(outDir, { recursive: true })
      const stamp = finishedAt.toISOString().replace(/[:.]/g, '-')
      const jsonPath = path.join(outDir, `migration-${stamp}.json`)
      const mdPath = path.join(outDir, `migration-${stamp}.md`)
      fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
      fs.writeFileSync(mdPath, toMarkdown(report), 'utf8')
      // Also keep a stable latest pointer
      fs.writeFileSync(path.join(outDir, 'latest.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8')
      fs.writeFileSync(path.join(outDir, 'latest.md'), toMarkdown(report), 'utf8')
      return { jsonPath, mdPath, report }
    },
  }
}

function toMarkdown(report) {
  const lines = [
    `# ${report.title}`,
    '',
    `- Started: ${report.startedAt}`,
    `- Finished: ${report.finishedAt}`,
    `- Duration: ${Math.round(report.durationMs / 1000)}s`,
    '',
    '| Dataset | Status | Source | Mapped | Skipped | Upserted | Failed | DB count |',
    '|---|---|---:|---:|---:|---:|---:|---:|',
  ]
  for (const s of report.summary) {
    lines.push(
      `| ${s.dataset} | ${s.status} | ${s.sourceRows ?? '—'} | ${s.mapped ?? '—'} | ${s.skipped ?? '—'} | ${s.upserted ?? '—'} | ${s.failed ?? '—'} | ${s.dbCount ?? '—'} |`,
    )
  }
  lines.push('')
  for (const s of report.sections) {
    lines.push(`## ${s.dataset}`)
    lines.push('')
    if (s.path) lines.push(`- Source: \`${s.path}\``)
    if (s.headers?.length) lines.push(`- Headers: ${s.headers.map((h) => `\`${h}\``).join(', ')}`)
    if (s.notes?.length) {
      lines.push('- Notes:')
      for (const n of s.notes) lines.push(`  - ${n}`)
    }
    if (s.errors?.length) {
      lines.push('- Errors:')
      for (const e of s.errors.slice(0, 20)) {
        lines.push(`  - offset ${e.offset}: ${e.message}`)
      }
      if (s.errors.length > 20) lines.push(`  - …and ${s.errors.length - 20} more`)
    }
    if (s.skipReasons) {
      lines.push('- Skip reasons:')
      for (const [reason, count] of Object.entries(s.skipReasons)) {
        lines.push(`  - ${reason}: ${count}`)
      }
    }
    lines.push('')
  }
  return `${lines.join('\n')}\n`
}
