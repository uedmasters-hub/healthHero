import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { allDoctors } from '../src/data/doctors.js'
import { healthcareCenters } from '../src/data/centers.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const articleSource = fs.readFileSync(path.join(root, 'src/data/articles.js'), 'utf8')
const articles = [...articleSource.matchAll(/id: '([^']+)',\n\s+title: '([^']*(?:\\'[^']*)*)',\n\s+emoji: '[^']*',\n\s+category: '([^']+)',\n\s+readTime: '([^']+)'/g)]
  .map((match) => ({
    id: match[1],
    title: match[2].replace(/\\'/g, "'"),
    category: match[3],
    readTime: match[4],
  }))

function sqlStr(value) {
  return `'${String(value ?? '').replace(/'/g, "''")}'`
}

function doctorUuid(id) {
  return `'00000000-0000-4000-a000-${String(id).padStart(12, '0')}'`
}

function centerUuid(id) {
  return `public.stable_uuid(${sqlStr(`healthhero.center.${id}`)})`
}

function articleUuid(id) {
  return `public.stable_uuid(${sqlStr(`healthhero.article.${id}`)})`
}

function splitName(name) {
  const clean = String(name).replace(/^Dr\.\s+/i, '').trim()
  const parts = clean.split(/\s+/)
  return {
    first: parts[0] || 'Doctor',
    last: parts.slice(1).join(' ') || 'Unknown',
  }
}

function years(experience) {
  const match = String(experience || '').match(/(\d+)/)
  return match ? Number(match[1]) : null
}

function slugify(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

const specSlugs = [...new Set(allDoctors.map((d) => slugify(d.specialty)))]

const lines = [
  '-- Catalog seed from src/data (doctors, centers, articles).',
  '-- Uses stable UUIDs so local bookings can resolve providers after migration.',
  '',
  `CREATE OR REPLACE FUNCTION public.stable_uuid(seed text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (
    substr(md5(seed), 1, 8) || '-' ||
    substr(md5(seed), 9, 4) || '-4' ||
    substr(md5(seed), 13, 3) || '-a' ||
    substr(md5(seed), 16, 3) || '-' ||
    substr(md5(seed), 19, 12)
  )::uuid;
$$;`,
  '',
  "INSERT INTO public.organizations (id, name, type)",
  "VALUES ('00000000-0000-4000-a000-000000000000', 'Health Hero', 'healthcare_network')",
  'ON CONFLICT (id) DO NOTHING;',
  '',
]

for (const slug of specSlugs) {
  const name = allDoctors.find((d) => slugify(d.specialty) === slug)?.specialty
  lines.push(
    `INSERT INTO public.specializations (name, slug) VALUES (${sqlStr(name)}, ${sqlStr(slug)}) ON CONFLICT (slug) DO NOTHING;`,
  )
}

lines.push('')
for (const center of healthcareCenters) {
  lines.push(`INSERT INTO public.healthcare_centers (
  id, org_id, name, type, address_line1, city, phone, image_url, rating_avg, source_key
) VALUES (
  ${centerUuid(center.id)},
  '00000000-0000-4000-a000-000000000000',
  ${sqlStr(center.name)},
  ${sqlStr(String(center.type || 'clinic').toLowerCase())},
  ${sqlStr(center.address)},
  ${sqlStr(center.city)},
  ${sqlStr(center.phone || '')},
  ${sqlStr(center.image || '')},
  ${Number(center.rating) || 0},
  ${sqlStr(center.id)}
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address_line1 = EXCLUDED.address_line1,
  city = EXCLUDED.city,
  phone = EXCLUDED.phone,
  image_url = EXCLUDED.image_url,
  rating_avg = EXCLUDED.rating_avg,
  source_key = EXCLUDED.source_key;`)
}

lines.push('')
for (const doctor of allDoctors) {
  const { first, last } = splitName(doctor.name || doctor.shortName)
  lines.push(`INSERT INTO public.providers (
  id, org_id, source_key, provider_type, title, first_name, last_name, display_name,
  about, years_experience, consultation_fee, rating_avg, rating_count, is_active, is_verified
) VALUES (
  ${doctorUuid(doctor.id)},
  '00000000-0000-4000-a000-000000000000',
  ${sqlStr(`doctor:${doctor.id}`)},
  'doctor',
  'Dr.',
  ${sqlStr(first)},
  ${sqlStr(last)},
  ${sqlStr(doctor.name || `Dr. ${doctor.shortName}`)},
  ${sqlStr(doctor.about || '')},
  ${years(doctor.experience)},
  ${Number(doctor.fee) || 0},
  ${Number(doctor.rating) || 0},
  ${Number(doctor.reviews?.total) || 0},
  true,
  true
)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  about = EXCLUDED.about,
  consultation_fee = EXCLUDED.consultation_fee,
  rating_avg = EXCLUDED.rating_avg,
  source_key = EXCLUDED.source_key;`)
  lines.push(`INSERT INTO public.provider_specializations (provider_id, specialization_id, is_primary)
SELECT ${doctorUuid(doctor.id)}, s.id, true
FROM public.specializations s
WHERE s.slug = ${sqlStr(slugify(doctor.specialty))}
ON CONFLICT DO NOTHING;`)
}

lines.push('')
for (const article of articles) {
  const minutes = Number(String(article.readTime || '').match(/\d+/)?.[0] || 5)
  lines.push(`INSERT INTO public.articles (
  id, title, slug, category, author_name, hero_image_url, excerpt, content, read_time_minutes, is_published, published_at
) VALUES (
  ${articleUuid(article.id)},
  ${sqlStr(article.title)},
  ${sqlStr(article.id)},
  ${sqlStr(article.category || '')},
  ${sqlStr(article.author?.name || '')},
  ${sqlStr('')},
  ${sqlStr('')},
  '{}'::jsonb,
  ${minutes},
  true,
  now()
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  is_published = true;`)
}

const out = path.join(root, 'supabase/migrations/20260918142200_catalog_seed.sql')
fs.writeFileSync(out, lines.join('\n') + '\n')
console.log('wrote', out, 'doctors', allDoctors.length, 'centers', healthcareCenters.length, 'articles', articles.length)
