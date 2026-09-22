#!/usr/bin/env node
/**
 * Validate the imported government registry against Supabase.
 * Compares source datasets with DB counts, uniqueness, and relationship integrity.
 *
 *   npm run migrate:validate
 */
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { requireServiceClient } from './lib/env.mjs'
import { discoverDatasets, loadDataset } from './lib/discover.mjs'
import { createReportCollector } from './lib/report.mjs'

async function countExact(client, table, filters = {}) {
  let q = client.from(table).select('id', { count: 'exact', head: true })
  for (const [k, v] of Object.entries(filters)) {
    if (v === null) q = q.is(k, null)
    else if (typeof v === 'string' && v.includes('%')) q = q.like(k, v)
    else q = q.eq(k, v)
  }
  const { count, error } = await q
  if (error) throw error
  return count || 0
}

async function fetchColumnSample(client, table, column, { like = null, limit = 5000 } = {}) {
  let q = client.from(table).select(`id, ${column}`).not(column, 'is', null).limit(limit)
  if (like) q = q.like(column, like)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

function findDuplicates(values) {
  const seen = new Map()
  const dupes = []
  for (const v of values) {
    const key = String(v)
    const n = (seen.get(key) || 0) + 1
    seen.set(key, n)
    if (n === 2) dupes.push(key)
  }
  return dupes
}

async function validateNmc(client, dataset, section) {
  const loaded = loadDataset(dataset)
  const sourceIds = loaded.rows
    .map((r) => String(r['NMC Number'] || '').trim())
    .filter(Boolean)
  const sourceDupes = findDuplicates(sourceIds)
  section.sourceRows = loaded.rows.length
  section.sourceUniqueIds = new Set(sourceIds).size
  section.sourceDuplicateIds = sourceDupes.length

  const dbTotal = await countExact(client, 'providers', { 'source_key': 'nmc:%' })
  const dbWithNmc = await countExact(client, 'providers') // refined below via RPC-less approach
  section.dbRegistryCount = await countExact(client, 'providers')
  // Prefer source_key prefix count
  section.dbRegistryCount = dbTotal

  // Uniqueness: pull all nmc_number values in pages
  const nmcValues = []
  let from = 0
  const page = 1000
  for (;;) {
    const { data, error } = await client
      .from('providers')
      .select('nmc_number')
      .not('nmc_number', 'is', null)
      .range(from, from + page - 1)
    if (error) throw error
    if (!data?.length) break
    for (const row of data) nmcValues.push(row.nmc_number)
    if (data.length < page) break
    from += page
  }
  const dbDupes = findDuplicates(nmcValues)
  section.dbNmcCount = nmcValues.length
  section.dbDuplicateNmc = dbDupes.length
  section.duplicateSamples = dbDupes.slice(0, 20)

  const missingInDb = []
  const sourceSet = new Set(sourceIds)
  const dbSet = new Set(nmcValues)
  for (const id of sourceIds) {
    if (!dbSet.has(id)) missingInDb.push(id)
    if (missingInDb.length >= 25) break
  }
  let extraInDb = 0
  for (const id of dbSet) {
    if (!sourceSet.has(id)) extraInDb += 1
  }
  section.missingInDbSamples = missingInDb
  section.missingInDbCount = [...sourceSet].filter((id) => !dbSet.has(id)).length
  section.extraInDbCount = extraInDb

  const claimed = await countExact(client, 'providers')
  // Count claimed nmc rows
  const { count: claimedNmc, error: claimedErr } = await client
    .from('providers')
    .select('id', { count: 'exact', head: true })
    .like('source_key', 'nmc:%')
    .not('user_id', 'is', null)
  if (claimedErr) throw claimedErr
  section.claimedCount = claimedNmc || 0

  // Orphans: primary_center_id pointing nowhere
  const { data: orphanCenters, error: orphanErr } = await client
    .from('providers')
    .select('id, nmc_number, primary_center_id')
    .like('source_key', 'nmc:%')
    .not('primary_center_id', 'is', null)
    .limit(500)
  if (orphanErr) throw orphanErr
  let orphanedPrimary = 0
  for (const row of orphanCenters || []) {
    const { data: c } = await client
      .from('healthcare_centers')
      .select('id')
      .eq('id', row.primary_center_id)
      .maybeSingle()
    if (!c) orphanedPrimary += 1
  }
  section.orphanedPrimaryCenterSamples = orphanedPrimary

  const ok = section.sourceDuplicateIds === 0
    && section.dbDuplicateNmc === 0
    && section.missingInDbCount === 0
    && Math.abs(section.sourceUniqueIds - section.dbRegistryCount) <= 0
  section.status = ok ? 'ok' : 'warn'
  section.notes = [
    `Source unique NMC: ${section.sourceUniqueIds}`,
    `DB nmc: source_key rows=${section.dbRegistryCount}, nmc_number rows=${section.dbNmcCount}`,
    `Claimed (user_id set): ${section.claimedCount}`,
    `Missing in DB: ${section.missingInDbCount}`,
    `Extra in DB vs source: ${section.extraInDbCount}`,
    `DB duplicate nmc_number: ${section.dbDuplicateNmc}`,
  ]
  return section
}

async function validateHf(client, dataset, section) {
  const loaded = loadDataset(dataset)
  const sourceIds = loaded.rows.map((r) => String(r.hfCode || '').trim()).filter(Boolean)
  section.sourceRows = loaded.rows.length
  section.sourceUniqueIds = new Set(sourceIds).size
  section.sourceDuplicateIds = findDuplicates(sourceIds).length

  const dbCount = await countExact(client, 'healthcare_centers')
  // count hf source_key
  const { count: hfCount, error } = await client
    .from('healthcare_centers')
    .select('id', { count: 'exact', head: true })
    .like('source_key', 'hf:%')
  if (error) throw error
  section.dbRegistryCount = hfCount || 0

  const codes = []
  let from = 0
  for (;;) {
    const { data, error: e2 } = await client
      .from('healthcare_centers')
      .select('hf_code')
      .not('hf_code', 'is', null)
      .range(from, from + 999)
    if (e2) throw e2
    if (!data?.length) break
    for (const row of data) codes.push(row.hf_code)
    if (data.length < 1000) break
    from += 1000
  }
  section.dbHfCodeCount = codes.length
  section.dbDuplicateHf = findDuplicates(codes).length
  section.duplicateSamples = findDuplicates(codes).slice(0, 20)

  const sourceSet = new Set(sourceIds)
  const dbSet = new Set(codes)
  section.missingInDbCount = [...sourceSet].filter((id) => !dbSet.has(id)).length
  section.extraInDbCount = [...dbSet].filter((id) => !sourceSet.has(id)).length

  // Branch orphans (parent_id missing)
  const { data: withParent, error: pErr } = await client
    .from('healthcare_centers')
    .select('id, hf_code, parent_id')
    .not('parent_id', 'is', null)
    .limit(200)
  if (pErr) throw pErr
  let orphanParents = 0
  for (const row of withParent || []) {
    const { data: parent } = await client
      .from('healthcare_centers')
      .select('id')
      .eq('id', row.parent_id)
      .maybeSingle()
    if (!parent) orphanParents += 1
  }
  section.orphanedParentCount = orphanParents

  const ok = section.sourceDuplicateIds === 0
    && section.dbDuplicateHf === 0
    && section.missingInDbCount === 0
    && section.dbRegistryCount === section.sourceUniqueIds
  section.status = ok ? 'ok' : 'warn'
  section.notes = [
    `Source unique HF Code: ${section.sourceUniqueIds}`,
    `DB source_key hf:*=${section.dbRegistryCount}, hf_code rows=${section.dbHfCodeCount}`,
    `Missing in DB: ${section.missingInDbCount}`,
    `Extra in DB: ${section.extraInDbCount}`,
    `Duplicate hf_code: ${section.dbDuplicateHf}`,
    `Orphan parent_id (sample scan): ${section.orphanedParentCount}`,
    `Total centers table rows (incl. non-registry): ${dbCount}`,
  ]
  return section
}

async function validateDda(client, dataset, section) {
  const loaded = loadDataset(dataset)
  const sourceIds = loaded.rows
    .map((r) => String(r['Registration No'] || r['Pharmacy Code'] || '').trim())
    .filter(Boolean)
  section.sourceRows = loaded.rows.length
  section.sourceUniqueIds = new Set(sourceIds).size
  section.sourceDuplicateIds = findDuplicates(sourceIds).length

  const { count: ddaCount, error } = await client
    .from('pharmacies')
    .select('id', { count: 'exact', head: true })
    .like('source_key', 'dda:%')
  if (error) throw error
  section.dbRegistryCount = ddaCount || 0

  const codes = []
  let from = 0
  for (;;) {
    const { data, error: e2 } = await client
      .from('pharmacies')
      .select('pharmacy_code')
      .not('pharmacy_code', 'is', null)
      .range(from, from + 999)
    if (e2) throw e2
    if (!data?.length) break
    for (const row of data) codes.push(row.pharmacy_code)
    if (data.length < 1000) break
    from += 1000
  }
  section.dbPharmacyCodeCount = codes.length
  section.dbDuplicatePharmacyCode = findDuplicates(codes).length
  section.duplicateSamples = findDuplicates(codes).slice(0, 20)

  const sourceSet = new Set(sourceIds)
  const dbSet = new Set(codes)
  section.missingInDbCount = [...sourceSet].filter((id) => !dbSet.has(id)).length
  section.extraInDbCount = [...dbSet].filter((id) => !sourceSet.has(id)).length

  // Nepali name_local coverage
  const { count: withLocal, error: localErr } = await client
    .from('pharmacies')
    .select('id', { count: 'exact', head: true })
    .like('source_key', 'dda:%')
    .not('name_local', 'is', null)
  if (localErr) throw localErr
  section.withNameLocal = withLocal || 0

  // Orphan center_id
  const { data: linked, error: linkErr } = await client
    .from('pharmacies')
    .select('id, pharmacy_code, center_id')
    .like('source_key', 'dda:%')
    .not('center_id', 'is', null)
    .limit(200)
  if (linkErr) throw linkErr
  let orphanCenters = 0
  for (const row of linked || []) {
    const { data: c } = await client
      .from('healthcare_centers')
      .select('id')
      .eq('id', row.center_id)
      .maybeSingle()
    if (!c) orphanCenters += 1
  }
  section.orphanedCenterLinks = orphanCenters

  const ok = section.sourceDuplicateIds === 0
    && section.dbDuplicatePharmacyCode === 0
    && section.missingInDbCount === 0
    && section.dbRegistryCount === section.sourceUniqueIds
  section.status = ok ? 'ok' : 'warn'
  section.notes = [
    `Source unique Pharmacy Code: ${section.sourceUniqueIds}`,
    `DB dda:* rows=${section.dbRegistryCount}, pharmacy_code rows=${section.dbPharmacyCodeCount}`,
    `Missing in DB: ${section.missingInDbCount}`,
    `Extra in DB: ${section.extraInDbCount}`,
    `Duplicate pharmacy_code: ${section.dbDuplicatePharmacyCode}`,
    `With Nepali name_local: ${section.withNameLocal}`,
    `Orphan center_id (sample scan): ${section.orphanedCenterLinks}`,
  ]
  return section
}

async function validateArchitecture(client, section) {
  section.dataset = 'architecture'
  section.notes = []

  // Ensure we are NOT storing registry in public.doctors
  let doctorsCount = null
  try {
    const { count, error } = await client.from('doctors').select('id', { count: 'exact', head: true })
    if (!error) doctorsCount = count || 0
  } catch {
    doctorsCount = null
  }
  section.doctorsTableCount = doctorsCount

  const { count: providersTotal } = await client
    .from('providers')
    .select('id', { count: 'exact', head: true })
  const { count: nmcProviders } = await client
    .from('providers')
    .select('id', { count: 'exact', head: true })
    .like('source_key', 'nmc:%')
  const { count: unclaimed } = await client
    .from('providers')
    .select('id', { count: 'exact', head: true })
    .like('source_key', 'nmc:%')
    .is('user_id', null)

  section.providersTotal = providersTotal || 0
  section.nmcInProviders = nmcProviders || 0
  section.unclaimedNmc = unclaimed || 0

  // Views exist?
  const views = [
    'v_provider_search',
    'v_verified_doctors',
    'v_verified_healthcare_centers',
    'v_verified_pharmacies',
    'v_healthcare_centers_public',
    'v_pharmacies_public',
  ]
  const viewStatus = {}
  for (const view of views) {
    const { error } = await client.from(view).select('*', { head: true, count: 'exact' }).limit(1)
    viewStatus[view] = error ? `missing/error: ${error.message}` : 'ok'
  }
  section.views = viewStatus

  const viewsOk = Object.values(viewStatus).every((v) => v === 'ok')
  const archOk = section.nmcInProviders > 0 && viewsOk
  section.status = archOk ? 'ok' : 'warn'
  section.notes = [
    `providers total=${section.providersTotal}, nmc registry=${section.nmcInProviders}, unclaimed=${section.unclaimedNmc}`,
    `public.doctors row count=${section.doctorsTableCount ?? 'n/a'} (registry must stay in providers)`,
    ...Object.entries(viewStatus).map(([k, v]) => `${k}: ${v}`),
  ]
  return section
}

async function main() {
  const env = requireServiceClient()
  const client = createClient(env.url, env.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const reporter = createReportCollector(env.root)
  // Re-title via first section note — report collector uses fixed title; override after write by custom file.

  const datasets = discoverDatasets(env.root)
  console.log('Validating registry integrity…')

  for (const ds of datasets) {
    const section = {
      dataset: ds.id,
      label: ds.label,
      path: ds.path,
      status: 'pending',
      notes: [],
    }
    if (!ds.available) {
      section.status = 'missing'
      section.notes.push('Dataset file not found in scripts/data/registry')
      reporter.add(section)
      continue
    }
    console.log(`  Checking ${ds.id}…`)
    try {
      if (ds.id === 'nmc') await validateNmc(client, ds, section)
      else if (ds.id === 'hf') await validateHf(client, ds, section)
      else if (ds.id === 'dda') await validateDda(client, ds, section)
    } catch (err) {
      section.status = 'failed'
      section.notes.push(err.message || String(err))
    }
    reporter.add(section)
    console.log(`    → ${section.status}`)
  }

  const arch = { dataset: 'architecture', status: 'pending', notes: [] }
  try {
    await validateArchitecture(client, arch)
  } catch (err) {
    arch.status = 'failed'
    arch.notes.push(err.message || String(err))
  }
  reporter.add(arch)
  console.log(`  architecture → ${arch.status}`)

  const out = reporter.write()
  // Also write a dedicated validation latest
  const validationPath = path.join(env.root, 'scripts/migrate/reports/validation-latest.md')
  const validationJson = path.join(env.root, 'scripts/migrate/reports/validation-latest.json')
  fs.copyFileSync(out.mdPath, validationPath)
  fs.copyFileSync(out.jsonPath, validationJson)

  const bad = out.report.summary.filter((s) => s.status === 'failed' || s.status === 'warn' || s.status === 'missing')
  console.log(`\nValidation report:\n  ${validationPath}`)
  if (bad.length) {
    console.error(`Completed with ${bad.length} issue group(s).`)
    process.exitCode = 1
    return
  }
  console.log('All validation checks passed.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
