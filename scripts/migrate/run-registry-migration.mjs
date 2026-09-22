#!/usr/bin/env node
/**
 * Permanent Nepal registry → Supabase migration.
 *
 * Discovers HF / NMC / DDA datasets (scripts/data/registry or temporary API/),
 * inspects headers dynamically, upserts idempotently via the service role key,
 * validates counts, and writes a migration report.
 *
 * Usage:
 *   npm run migrate:registry
 *   node scripts/migrate/run-registry-migration.mjs
 *   node scripts/migrate/run-registry-migration.mjs --promote-only
 *   node scripts/migrate/run-registry-migration.mjs --datasets=nmc,hf
 */
import { createClient } from '@supabase/supabase-js'
import { requireServiceClient } from './lib/env.mjs'
import { discoverDatasets, loadDataset, promoteDatasetsToRegistry } from './lib/discover.mjs'
import { transformDataset } from './lib/mappers.mjs'
import { countBySourcePrefix, upsertBatches } from './lib/upsert.mjs'
import { createReportCollector } from './lib/report.mjs'

const args = new Set(process.argv.slice(2))
const promoteOnly = args.has('--promote-only')
const datasetFilter = [...args]
  .find((a) => a.startsWith('--datasets='))
  ?.slice('--datasets='.length)
  ?.split(',')
  .map((s) => s.trim())
  .filter(Boolean)

async function ensureOrg(client, orgId) {
  const { error } = await client.from('organizations').upsert({
    id: orgId,
    name: 'eMedicalls',
    type: 'healthcare_network',
  }, { onConflict: 'id' })
  if (error) throw error
}

async function recordRun(client, payload) {
  try {
    const { data, error } = await client
      .from('registry_import_runs')
      .insert(payload)
      .select('id')
      .maybeSingle()
    if (error) return null
    return data?.id || null
  } catch {
    return null
  }
}

async function finishRun(client, id, patch) {
  if (!id) return
  try {
    await client.from('registry_import_runs').update(patch).eq('id', id)
  } catch {
    /* ignore */
  }
}

async function importOne(client, env, dataset, reporter) {
  const section = {
    dataset: dataset.id,
    label: dataset.label,
    path: dataset.path,
    headers: [],
    status: 'pending',
    sourceRows: 0,
    mapped: 0,
    skipped: 0,
    upserted: 0,
    failed: 0,
    dbCount: null,
    notes: [],
    errors: [],
    skipReasons: {},
  }

  if (!dataset.available) {
    section.status = 'missing'
    section.notes.push(dataset.error || 'Dataset not found')
    reporter.add(section)
    return section
  }

  const runId = await recordRun(client, {
    dataset: dataset.id,
    source_path: dataset.path,
    status: 'running',
  })

  try {
    const loaded = loadDataset(dataset)
    section.headers = loaded.headers
    section.sourceRows = loaded.rows.length
    section.notes.push(`Detected headers: ${loaded.headers.join(' | ') || '(none)'}`)

    const requiredHints = {
      nmc: ['NMC Number'],
      hf: ['hfCode'],
      dda: ['Registration No', 'Pharmacy Code'],
    }[dataset.id] || []

    const headerSet = new Set(loaded.headers.map((h) => h.toLowerCase()))
    const hasId = requiredHints.some((h) => headerSet.has(h.toLowerCase()))
      || loaded.headers.some((h) => /nmc number|hfcode|registration|pharmacy code/i.test(h))
    if (!hasId) {
      section.status = 'failed'
      section.notes.push(`Could not find official identifier among headers for ${dataset.id}`)
      reporter.add(section)
      await finishRun(client, runId, {
        finished_at: new Date().toISOString(),
        source_rows: section.sourceRows,
        status: 'failed',
        report: section,
      })
      return section
    }

    const { mapped, skipped } = transformDataset(dataset.id, loaded.rows, env.orgId)
    section.mapped = mapped.length
    section.skipped = skipped.length
    for (const s of skipped) {
      section.skipReasons[s.reason] = (section.skipReasons[s.reason] || 0) + 1
    }

    const table = dataset.table
    const upsert = await upsertBatches(client, {
      table,
      rows: mapped,
      onConflict: 'id',
      batchSize: env.batchSize,
      select: 'id',
    })
    section.upserted = upsert.upserted
    section.failed = upsert.failed
    section.errors = upsert.errors

    const prefix = { nmc: 'nmc:', hf: 'hf:', dda: 'dda:' }[dataset.id]
    try {
      section.dbCount = await countBySourcePrefix(client, table, prefix)
    } catch (err) {
      section.notes.push(`Post-import count failed: ${err.message}`)
    }

    const delta = section.dbCount == null
      ? null
      : section.dbCount - section.mapped
    if (section.failed > 0) {
      section.status = 'partial'
      section.notes.push(`${section.failed} rows failed upsert — see errors`)
    } else if (section.dbCount != null && Math.abs(delta) > Math.max(5, section.mapped * 0.01)) {
      section.status = 'warn'
      section.notes.push(
        `DB count (${section.dbCount}) differs from mapped unique rows (${section.mapped}) by ${delta}`,
      )
    } else {
      section.status = 'ok'
      section.notes.push('Source → mapped → upsert validation within tolerance')
    }

    await finishRun(client, runId, {
      finished_at: new Date().toISOString(),
      source_rows: section.sourceRows,
      inserted: section.upserted,
      updated: 0,
      skipped: section.skipped,
      failed: section.failed,
      status: section.status,
      report: section,
    })
  } catch (err) {
    section.status = 'failed'
    section.notes.push(err.message || String(err))
    section.errors.push({ offset: 0, message: err.message || String(err) })
    await finishRun(client, runId, {
      finished_at: new Date().toISOString(),
      status: 'failed',
      report: section,
    })
  }

  reporter.add(section)
  return section
}

async function main() {
  const env = requireServiceClient()
  const reporter = createReportCollector(env.root)

  console.log('Discovering datasets…')
  let datasets = discoverDatasets(env.root)
  if (datasetFilter?.length) {
    datasets = datasets.filter((d) => datasetFilter.includes(d.id))
  }

  for (const d of datasets) {
    console.log(`  ${d.id}: ${d.available ? d.path : 'NOT FOUND'}`)
  }

  console.log('Promoting datasets into scripts/data/registry/…')
  const promoted = promoteDatasetsToRegistry(env.root, datasets)
  for (const p of promoted) {
    console.log(`  ${p.id}: ${p.action}${p.path ? ` → ${p.path}` : ''}`)
  }
  reporter.add({
    dataset: 'promote',
    status: 'ok',
    notes: promoted.map((p) => `${p.id}: ${p.action}`),
    promoted,
  })

  // Re-discover after promote so subsequent loads prefer permanent copies.
  datasets = discoverDatasets(env.root)
  if (datasetFilter?.length) {
    datasets = datasets.filter((d) => datasetFilter.includes(d.id))
  }

  if (promoteOnly) {
    const out = reporter.write()
    console.log(`Promote-only complete. Report: ${out.mdPath}`)
    return
  }

  const client = createClient(env.url, env.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  console.log('Ensuring organization…')
  await ensureOrg(client, env.orgId)

  for (const dataset of datasets) {
    console.log(`\nImporting ${dataset.label} (${dataset.id})…`)
    const section = await importOne(client, env, dataset, reporter)
    console.log(
      `  → ${section.status}: source=${section.sourceRows} mapped=${section.mapped} `
      + `upserted=${section.upserted} failed=${section.failed} db=${section.dbCount ?? '—'}`,
    )
  }

  const out = reporter.write()
  const failed = out.report.summary.filter((s) => s.status === 'failed' || s.status === 'partial')
  console.log(`\nMigration report written to:\n  ${out.mdPath}\n  ${out.jsonPath}`)
  if (failed.length) {
    console.error(`Completed with ${failed.length} dataset issue(s). Review the report.`)
    process.exitCode = 1
    return
  }
  console.log('All dataset imports completed successfully.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
