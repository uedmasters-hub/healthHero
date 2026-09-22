import {
  cleanFacilityName,
  genderAvatar,
  normalizeFacilityLevel,
  splitDoctorName,
  splitPharmacyName,
  stableUuid,
} from './transform.mjs'

const ORG_FALLBACK = '00000000-0000-4000-a000-000000000000'

function pick(row, keys) {
  for (const key of keys) {
    if (row[key] != null && String(row[key]).trim() !== '') return String(row[key])
  }
  // Dynamic header fallback (case-insensitive)
  const lower = Object.fromEntries(
    Object.entries(row).map(([k, v]) => [String(k).toLowerCase(), v]),
  )
  for (const key of keys) {
    const hit = lower[String(key).toLowerCase()]
    if (hit != null && String(hit).trim() !== '') return String(hit)
  }
  return ''
}

export function mapNmcRow(row, orgId = ORG_FALLBACK) {
  const nmc = pick(row, ['NMC Number', 'nmc_number', 'nmcNumber']).trim()
  if (!nmc) return { skip: true, reason: 'missing NMC Number' }

  const nameRaw = pick(row, ['NMC Name', 'name', 'nmcName'])
  const address = pick(row, ['NMC Address', 'address', 'nmcAddress'])
  const gender = pick(row, ['NMC Gender', 'gender', 'nmcGender'])
  const degree = pick(row, ['NMC Degree', 'degree', 'nmcDegree'])
  const parts = splitDoctorName(nameRaw)
  const id = stableUuid(`registry.nmc.${nmc}`)

  return {
    skip: false,
    row: {
      id,
      org_id: orgId,
      provider_type: 'doctor',
      title: 'Dr.',
      first_name: parts.first,
      last_name: parts.last || parts.first,
      display_name: parts.display,
      nmc_number: nmc,
      license_number: nmc,
      license_state: 'Nepal',
      gender: gender || null,
      degree: degree || null,
      address_line1: address || null,
      city: null,
      district: null,
      about: degree ? `${degree} · Nepal Medical Council` : 'Nepal Medical Council registrant',
      avatar_url: genderAvatar(gender, nmc),
      consultation_fee: 800,
      currency: 'NPR',
      visit_modes: ['in_person', 'video'],
      languages: ['ne', 'en'],
      is_active: true,
      is_verified: false,
      verification_status: 'unverified',
      source_key: `nmc:${nmc}`,
      external_ref: `nmc-${nmc}`,
      client_payload: {
        registry: 'nmc',
        nmc_number: nmc,
        raw_name: nameRaw,
        gender,
        degree,
        address,
      },
    },
  }
}

export function mapHfRow(row, orgId = ORG_FALLBACK) {
  const hfCode = pick(row, ['hfCode', 'HF Code', 'hf_code']).trim()
  if (!hfCode) return { skip: true, reason: 'missing HF Code' }

  const nameRaw = pick(row, ['hfName', 'HF Name', 'name'])
  const district = pick(row, ['district', 'District'])
  const facilityLevel = normalizeFacilityLevel(pick(row, ['facilityLevel', 'Facility Level', 'facility_level']))
  const id = stableUuid(`registry.hf.${hfCode}`)
  const name = cleanFacilityName(nameRaw) || `Facility ${hfCode}`

  return {
    skip: false,
    row: {
      id,
      org_id: orgId,
      name,
      type: /hospital/i.test(facilityLevel || '') ? 'hospital' : 'clinic',
      hf_code: hfCode,
      facility_level: facilityLevel,
      district: district || null,
      city: district || 'Nepal',
      address_line1: district ? `${district}, Nepal` : 'Nepal',
      country: 'NP',
      image_url: '/img/clinic/acton-crawford-8PB_TFEy2XQ-unsplash.jpg',
      rating_avg: 4.5,
      is_active: true,
      verification_status: 'unverified',
      source_key: `hf:${hfCode}`,
      external_ref: `hf-${hfCode}`,
      client_payload: {
        registry: 'health_facility',
        hf_code: hfCode,
        raw_name: nameRaw,
        facility_level: facilityLevel,
        district,
      },
    },
  }
}

export function mapDdaRow(row, orgId = ORG_FALLBACK) {
  const code = pick(row, [
    'Registration No',
    'Pharmacy Code',
    'pharmacy_code',
    'registration_no',
  ]).trim()
  if (!code) return { skip: true, reason: 'missing Pharmacy Code / Registration No' }

  const nameRaw = pick(row, ['Pharmacy Name', 'name', 'pharmacy_name'])
  const { name, nameLocal } = splitPharmacyName(nameRaw)
  const place = pick(row, ['Place', 'place']) || null
  const district = pick(row, ['District', 'district']) || null
  const systemType = pick(row, ['Pranali', 'system_type', 'System']) || null
  const id = stableUuid(`registry.dda.${code}`)
  const samePlace = place && district
    && String(place).trim().toLowerCase() === String(district).trim().toLowerCase()

  return {
    skip: false,
    row: {
      id,
      org_id: orgId,
      name: name || `Pharmacy ${code}`,
      name_local: nameLocal,
      pharmacy_code: code,
      license_number: code,
      place: samePlace ? null : place,
      district,
      system_type: systemType,
      address_line1: place || district || null,
      city: samePlace ? (district || place) : (district || place || null),
      country: 'NP',
      delivers: true,
      is_active: true,
      verification_status: 'unverified',
      source_key: `dda:${code}`,
      external_ref: `dda-${code}`,
      client_payload: {
        registry: 'dda',
        pharmacy_code: code,
        registration_no: code,
        raw_name: nameRaw,
        name_local: nameLocal,
        place,
        district,
        pranali: systemType,
      },
    },
  }
}

export function transformDataset(datasetId, rows, orgId) {
  const mapper = {
    nmc: mapNmcRow,
    hf: mapHfRow,
    dda: mapDdaRow,
  }[datasetId]

  if (!mapper) throw new Error(`Unknown dataset mapper: ${datasetId}`)

  const mapped = []
  const skipped = []
  const seen = new Set()

  for (const raw of rows) {
    const result = mapper(raw, orgId)
    if (result.skip) {
      skipped.push({ reason: result.reason, raw })
      continue
    }
    const key = result.row.source_key
    if (seen.has(key)) {
      skipped.push({ reason: 'duplicate source identifier in file', id: key })
      continue
    }
    seen.add(key)
    mapped.push(result.row)
  }

  return { mapped, skipped }
}
