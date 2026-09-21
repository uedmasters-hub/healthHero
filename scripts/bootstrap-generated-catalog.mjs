import fs from 'node:fs'
import { allDoctors, getDoctorPhoto } from '../src/data/doctors.js'

const catalog = allDoctors.map((d) => ({
  id: d.id,
  providerUuid: `00000000-0000-4000-a000-${String(d.id).padStart(12, '0')}`,
  name: d.name,
  shortName: d.shortName || String(d.name).replace(/^Dr\.?\s*/i, ''),
  specialty: d.specialty,
  rating: d.rating,
  experience: d.experience,
  address: d.address,
  travelTime: d.travelTime || '',
  visitTypes: d.visitTypes || ['In-Person'],
  availability: d.availability || 'Available Today',
  fee: d.fee,
  color: d.color || '#6366F1',
  initial: d.initial || '',
  about: d.about || '',
  photo: getDoctorPhoto(d.id),
  phone: d.phone || '',
  sourceKey: `doctor:${d.id}`,
  externalRef: `doctor:${d.id}`,
  centers: d.centers || [],
  reviews: d.reviews || null,
  specialties: d.specialties || [],
}))

fs.writeFileSync(
  new URL('../src/features/providers/generatedCatalog.js', import.meta.url),
  `/* Bootstrapped from legacy doctors catalog; refreshed by PocketPills import */\nexport const GENERATED_PROVIDER_CATALOG = ${JSON.stringify(catalog, null, 2)}\n`,
)
console.log('wrote', catalog.length)
