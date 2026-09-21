#!/usr/bin/env node
/**
 * One-time PocketPills → eMedicalls provider ingestion.
 *
 * Reads exported PocketPills datasets under scripts/data/, upserts into existing
 * Supabase tables (providers, healthcare_centers, pharmacies, specializations,
 * provider_schedules, available_slots), uploads avatars to Storage, and writes a
 * client catalog snapshot for offline-first UI.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/import-pocketpills-providers.mjs
 *
 * Optional:
 *   POCKETPILLS_ROOT=/path/to/PocketPills  (for avatar files)
 *   SKIP_STORAGE=1                         (keep /img/... paths)
 *   SKIP_SLOTS=1
 */
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DATA = path.join(__dirname, 'data')
const PP_ROOT = process.env.POCKETPILLS_ROOT
  || path.resolve(ROOT, '../PocketPills')

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
const ORG_ID = '00000000-0000-4000-a000-000000000000'
const SKIP_STORAGE = process.env.SKIP_STORAGE === '1'
const SKIP_SLOTS = process.env.SKIP_SLOTS === '1'

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(DATA, name), 'utf8'))
}

function stableUuid(seed) {
  const hex = createHash('md5').update(String(seed)).digest('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(16, 19)}-${hex.slice(19, 31)}`
}

function doctorLegacyUuid(n) {
  return `00000000-0000-4000-a000-${String(n).padStart(12, '0')}`
}

function splitName(display = '') {
  const cleaned = String(display).replace(/^Dr\.?\s*/i, '').trim()
  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (!parts.length) return { first: 'Provider', last: '' }
  if (parts.length === 1) return { first: parts[0], last: '' }
  return { first: parts[0], last: parts.slice(1).join(' ') }
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function mapVisitTypes(visitTypes = []) {
  const out = new Set()
  for (const v of visitTypes) {
    const key = String(v || '').toLowerCase()
    if (key.includes('virtual') || key.includes('video')) out.add('video')
    else if (key.includes('home')) out.add('home_visit')
    else out.add('in_person')
  }
  if (!out.size) {
    out.add('in_person')
    out.add('video')
  }
  return [...out]
}

function specialtySlugFromPp(idOrName) {
  const raw = String(idOrName || '')
  const map = {
    general: 'general-physician',
    dermatologist: 'dermatologist',
    gynecologist: 'gynecologist',
    pediatrician: 'pediatrician',
    cardiologist: 'cardiologist',
    neurologist: 'neurologist',
    orthopedist: 'orthopedist',
    ophthalmologist: 'ophthalmologist',
    ent: 'ent-specialist',
    gastroenterologist: 'gastroenterologist',
    endocrinologist: 'endocrinologist',
    pulmonologist: 'pulmonologist',
    urologist: 'urologist',
    psychiatrist: 'psychiatrist',
    dentist: 'dentist',
    immunologist: 'immunologist',
    sexologist: 'sexologist',
    nutritionist: 'nutritionist',
    physiotherapist: 'physiotherapist',
  }
  if (map[raw]) return map[raw]
  return slugify(raw)
}

function inrFromCad(fee) {
  const n = Number(fee)
  if (!Number.isFinite(n)) return 800
  // PocketPills demo fees are CAD-like; map to INR consultation band.
  return Math.round(n * 12)
}

function genderAvatar(gender, nmcNumber) {
  const idx = (Number(nmcNumber) || 0) % 3 || 1
  const female = String(gender || '').toLowerCase().startsWith('f')
  return female
    ? `/img/doctors/doctor-w${idx}.png`
    : `/img/doctors/doctor-m${idx}.png`
}

async function ensureSpecialization(name, slug, imageUrl = null) {
  const { data, error } = await sb
    .from('specializations')
    .upsert({
      name,
      slug,
      image_url: imageUrl,
      is_active: true,
    }, { onConflict: 'slug' })
    .select('id, slug')
    .maybeSingle()
  if (error) throw error
  return data
}

async function uploadAvatar(localPath, objectPath) {
  if (SKIP_STORAGE || !localPath || !fs.existsSync(localPath)) return null
  const bytes = fs.readFileSync(localPath)
  const contentType = localPath.endsWith('.svg')
    ? 'image/svg+xml'
    : localPath.endsWith('.webp')
      ? 'image/webp'
      : localPath.endsWith('.jpg') || localPath.endsWith('.jpeg')
        ? 'image/jpeg'
        : 'image/png'
  const { error } = await sb.storage
    .from('provider-avatars')
    .upload(objectPath, bytes, { contentType, upsert: true })
  if (error) {
    console.warn('avatar upload failed', objectPath, error.message)
    return null
  }
  const { data } = sb.storage.from('provider-avatars').getPublicUrl(objectPath)
  return data?.publicUrl || null
}

function resolveLocalAvatar(imageUrl) {
  if (!imageUrl) return null
  if (imageUrl.startsWith('http')) return null
  const rel = imageUrl.replace(/^\//, '')
  const candidates = [
    path.join(PP_ROOT, 'public', rel),
    path.join(PP_ROOT, rel),
    path.join(ROOT, 'public', rel),
  ]
  return candidates.find((p) => fs.existsSync(p)) || null
}

async function upsertProvider(row) {
  const { data, error } = await sb
    .from('providers')
    .upsert(row, { onConflict: 'id' })
    .select('id, source_key, external_ref')
    .maybeSingle()
  if (error) throw error
  return data
}

async function linkSpecialty(providerId, specializationId, isPrimary = true) {
  if (!providerId || !specializationId) return
  await sb.from('provider_specializations').upsert({
    provider_id: providerId,
    specialization_id: specializationId,
    is_primary: isPrimary,
  }, { onConflict: 'provider_id,specialization_id' })
}

async function ensureWeekdaySchedule(providerId) {
  // Mon–Sat 09:00–17:00, 30-min slots, in_person + video
  const days = [1, 2, 3, 4, 5, 6]
  for (const day of days) {
    await sb.from('provider_schedules').upsert({
      provider_id: providerId,
      day_of_week: day,
      start_time: '09:00:00',
      end_time: '17:00:00',
      slot_duration: 30,
      visit_types: ['in_person', 'video'],
      is_active: true,
      effective_from: new Date().toISOString().slice(0, 10),
    }, { onConflict: 'id' })
  }
  // Without a natural unique key on schedules, delete+insert is safer for idempotent import.
}

async function replaceSchedule(providerId) {
  await sb.from('provider_schedules').delete().eq('provider_id', providerId)
  const rows = [1, 2, 3, 4, 5, 6].map((day) => ({
    provider_id: providerId,
    day_of_week: day,
    start_time: '09:00:00',
    end_time: '17:00:00',
    slot_duration: 30,
    visit_types: ['in_person', 'video'],
    is_active: true,
    effective_from: new Date().toISOString().slice(0, 10),
  }))
  const { error } = await sb.from('provider_schedules').insert(rows)
  if (error) throw error
  if (!SKIP_SLOTS) {
    const { error: slotErr } = await sb.rpc('generate_provider_slots', {
      p_provider_id: providerId,
      p_days: 14,
    })
    if (slotErr) console.warn('slot gen', providerId, slotErr.message)
  }
}

function toClientDoctor(provider, specialtyName, legacyId) {
  const name = provider.display_name?.startsWith('Dr')
    ? provider.display_name
    : `Dr. ${provider.display_name}`
  return {
    id: legacyId ?? provider.id,
    providerUuid: provider.id,
    name,
    shortName: String(provider.display_name || '').replace(/^Dr\.?\s*/i, ''),
    specialty: specialtyName || 'General Physician',
    rating: Number(provider.rating_avg) || 4.7,
    experience: provider.years_experience
      ? `${provider.years_experience} years experience`
      : '',
    address: [provider.address_line1, provider.city].filter(Boolean).join(', '),
    travelTime: '',
    visitTypes: (provider.visit_modes || []).map((v) => (
      v === 'video' ? 'Video Consultation' : 'In-Person'
    )),
    availability: 'Available Today',
    fee: Number(provider.consultation_fee) || 800,
    color: '#6366F1',
    initial: `${provider.first_name?.[0] || ''}${provider.last_name?.[0] || ''}`.toUpperCase() || 'DR',
    about: provider.about || '',
    photo: provider.avatar_url || '/img/doctors/new/doctor.png',
    phone: '',
    sourceKey: provider.source_key,
    externalRef: provider.external_ref,
  }
}

async function main() {
  const ppProviders = readJson('pocketpills-providers.json')
  const ppSpecialties = readJson('pocketpills-specialties.json')
  const nmcSample = readJson('pocketpills-nmc-sample.json')
  const hfSample = readJson('pocketpills-hf-sample.json')
  const ddaSample = readJson('pocketpills-dda-sample.json')

  console.log('Ensuring org…')
  await sb.from('organizations').upsert({
    id: ORG_ID,
    name: 'eMedicalls',
    type: 'healthcare_network',
  }, { onConflict: 'id' })

  console.log('Upserting specialties…')
  const specBySlug = new Map()
  for (const s of ppSpecialties) {
    const slug = specialtySlugFromPp(s.id)
    const name = s.label || s.id
    const local = resolveLocalAvatar(s.imageUrl)
    let imageUrl = s.imageUrl || null
    if (local) {
      const uploaded = await uploadAvatar(local, `specialties/${slug}${path.extname(local)}`)
      if (uploaded) imageUrl = uploaded
    }
    const row = await ensureSpecialization(name, slug, imageUrl)
    specBySlug.set(slug, row)
    specBySlug.set(s.id, row)
  }

  const clientCatalog = []
  let doctorCount = 0

  console.log('Importing PocketPills CareProviders…')
  for (const p of ppProviders) {
    if (p.kind !== 'doctor') {
      // Facilities → healthcare_centers
      const id = stableUuid(`pocketpills.center.${p.id}`)
      const local = resolveLocalAvatar(p.imageUrl)
      let imageUrl = p.imageUrl
      if (local) {
        const uploaded = await uploadAvatar(local, `centers/${p.id}${path.extname(local) || '.jpg'}`)
        if (uploaded) imageUrl = uploaded
      }
      await sb.from('healthcare_centers').upsert({
        id,
        org_id: ORG_ID,
        name: p.name,
        type: p.kind === 'hospital' ? 'hospital' : 'clinic',
        address_line1: p.address || null,
        city: p.city || null,
        phone: p.phone || null,
        image_url: imageUrl || null,
        rating_avg: p.rating || 0,
        rating_count: p.reviewCount || 0,
        is_active: true,
        source_key: `pp:${p.id}`,
        external_ref: `pp:${p.id}`,
        client_payload: p,
      }, { onConflict: 'id' })
      continue
    }

    const { first, last } = splitName(p.name)
    const id = stableUuid(`pocketpills.provider.${p.id}`)
    const primarySpec = specialtySlugFromPp(p.specialties?.[0] || 'general')
    const local = resolveLocalAvatar(p.imageUrl)
    let avatar = p.imageUrl
    if (local) {
      const uploaded = await uploadAvatar(local, `providers/${p.id}${path.extname(local) || '.png'}`)
      if (uploaded) avatar = uploaded
    } else if (avatar?.startsWith('http') && !SKIP_STORAGE) {
      // Keep remote Unsplash URLs as-is (public).
    } else if (!avatar?.startsWith('http')) {
      avatar = '/img/doctors/new/doctor.png'
    }

    const row = {
      id,
      org_id: ORG_ID,
      provider_type: 'doctor',
      title: 'Dr.',
      first_name: first,
      last_name: last || first,
      display_name: p.name.replace(/^Dr\.?\s*/i, ''),
      avatar_url: avatar,
      about: p.about || p.bio || null,
      years_experience: p.experienceYears || null,
      consultation_fee: inrFromCad(p.consultationFee),
      currency: 'INR',
      rating_avg: p.rating || 4.7,
      rating_count: p.reviewCount || 0,
      is_active: true,
      is_verified: true,
      source_key: `pp:${p.id}`,
      external_ref: `pp:${p.id}`,
      city: p.city || null,
      address_line1: p.address || null,
      languages: p.languages || [],
      visit_modes: mapVisitTypes(p.visitTypes),
      client_payload: p,
    }
    const saved = await upsertProvider(row)
    const spec = specBySlug.get(primarySpec) || specBySlug.get('general-physician')
    await linkSpecialty(saved.id, spec?.id, true)
    await replaceSchedule(saved.id)
    clientCatalog.push(toClientDoctor(row, specBySlug.get(primarySpec)?.slug || primarySpec, saved.id))
    doctorCount += 1
  }

  console.log('Importing NMC sample doctors…')
  for (const row of nmcSample) {
    const nmc = String(row['NMC Number'] || row.nmcNumber || '').trim()
    if (!nmc) continue
    const name = row['NMC Name'] || row.name
    const { first, last } = splitName(name)
    const id = stableUuid(`pocketpills.nmc.${nmc}`)
    const avatar = genderAvatar(row['NMC Gender'], nmc)
    const local = resolveLocalAvatar(avatar)
    let avatarUrl = avatar
    if (local) {
      const uploaded = await uploadAvatar(local, `providers/nmc-${nmc}${path.extname(local)}`)
      if (uploaded) avatarUrl = uploaded
    }
    const degree = row['NMC Degree'] || ''
    const provider = {
      id,
      org_id: ORG_ID,
      provider_type: 'doctor',
      title: 'Dr.',
      first_name: first,
      last_name: last || first,
      display_name: String(name || '').replace(/^Dr\.?\s*/i, ''),
      avatar_url: avatarUrl,
      about: degree ? `${degree}. Licensed via NMC #${nmc}.` : `Licensed via NMC #${nmc}.`,
      years_experience: null,
      consultation_fee: 800,
      currency: 'INR',
      rating_avg: 4.6,
      rating_count: 0,
      is_active: true,
      is_verified: false,
      source_key: `nmc:${nmc}`,
      external_ref: `nmc-${nmc}`,
      license_number: nmc,
      city: null,
      address_line1: row['NMC Address'] || null,
      visit_modes: ['in_person', 'video'],
      client_payload: row,
    }
    const saved = await upsertProvider(provider)
    const spec = specBySlug.get('general-physician')
    await linkSpecialty(saved.id, spec?.id, true)
    await replaceSchedule(saved.id)
    clientCatalog.push(toClientDoctor(provider, 'General Physician', saved.id))
    doctorCount += 1
  }

  console.log('Importing health facilities sample…')
  for (const hf of hfSample) {
    const code = String(hf.hfCode || '')
    if (!code) continue
    const id = stableUuid(`pocketpills.hf.${code}`)
    await sb.from('healthcare_centers').upsert({
      id,
      org_id: ORG_ID,
      name: hf.hfName || hf.name,
      type: 'hospital',
      city: hf.district || null,
      is_active: true,
      source_key: `hf:${code}`,
      external_ref: `hf-${code}`,
      client_payload: hf,
    }, { onConflict: 'id' })
  }

  console.log('Importing pharmacy sample…')
  for (const ph of ddaSample) {
    const reg = String(ph['Registration No'] || ph.registrationNo || '')
    if (!reg) continue
    const id = stableUuid(`pocketpills.dda.${reg}`)
    await sb.from('pharmacies').upsert({
      id,
      org_id: ORG_ID,
      name: ph['Pharmacy Name'] || ph.name,
      license_number: reg,
      address_line1: ph.Place || ph.place || null,
      city: ph.District || ph.district || null,
      is_active: true,
      source_key: `dda:${reg}`,
      external_ref: `dda-${reg}`,
      client_payload: ph,
    }, { onConflict: 'id' })
  }

  // Refresh schedules/slots for existing catalog doctors (doctor:1..27)
  console.log('Ensuring schedules for legacy catalog providers…')
  const { data: legacy } = await sb
    .from('providers')
    .select('id, source_key')
    .like('source_key', 'doctor:%')
  for (const row of legacy || []) {
    await replaceSchedule(row.id)
  }

  // Build client snapshot: prefer legacy numeric catalog if present in DB
  const { data: allProviders } = await sb
    .from('providers')
    .select('id, source_key, external_ref, display_name, first_name, last_name, avatar_url, about, years_experience, consultation_fee, rating_avg, rating_count, city, address_line1, visit_modes, is_active')
    .eq('is_active', true)
    .order('display_name')

  const { data: links } = await sb
    .from('provider_specializations')
    .select('provider_id, is_primary, specializations(name, slug)')

  const specNameByProvider = new Map()
  for (const link of links || []) {
    if (!link.is_primary) continue
    specNameByProvider.set(link.provider_id, link.specializations?.name || 'General Physician')
  }

  const snapshot = (allProviders || []).map((p) => {
    const m = String(p.source_key || '').match(/^doctor:(\d+)$/)
    const legacyId = m ? Number(m[1]) : p.id
    return toClientDoctor(p, specNameByProvider.get(p.id), legacyId)
  })

  const outJs = path.join(ROOT, 'src/features/providers/generatedCatalog.js')
  fs.mkdirSync(path.dirname(outJs), { recursive: true })
  fs.writeFileSync(outJs, `/* Auto-generated by scripts/import-pocketpills-providers.mjs — do not edit */\nexport const GENERATED_PROVIDER_CATALOG = ${JSON.stringify(snapshot, null, 2)}\n`)
  fs.writeFileSync(path.join(DATA, 'import-summary.json'), JSON.stringify({
    importedAt: new Date().toISOString(),
    pocketpillsDoctors: doctorCount,
    snapshotCount: snapshot.length,
    centers: hfSample.length + ppProviders.filter((p) => p.kind !== 'doctor').length,
    pharmacies: ddaSample.length,
  }, null, 2))

  console.log('Done.', {
    doctorCount,
    snapshotCount: snapshot.length,
    outJs,
  })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
