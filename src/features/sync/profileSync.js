/**
 * @file src/features/sync/profileSync.js
 * Two-way sync for profile data between the local store and Supabase.
 * - pushProfileToSupabase: writes local profile fields → patient_profiles + public.users
 * - hydrateProfileFromSupabase: reads patient_profiles → merges into local store
 */
import { supabase } from '../../lib/supabase'

function splitName(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return { first: 'Patient', last: '' }
  if (parts.length === 1) return { first: parts[0], last: '' }
  return { first: parts[0], last: parts.slice(1).join(' ') }
}

function mapGender(value) {
  const key = String(value || '').trim().toLowerCase()
  if (key === 'male' || key === 'female' || key === 'other') return key
  return 'unknown'
}

function mapBlood(value) {
  const allowed = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
  const key = String(value || '').trim().toUpperCase()
  return allowed.includes(key) ? key : 'unknown'
}

function measure(value) {
  const match = String(value || '').match(/(\d+(?:\.\d+)?)/)
  return match ? Number(match[1]) : null
}

function asDate(value) {
  if (!value) return null
  const raw = typeof value === 'object' ? value.full || value.day || '' : value
  const text = String(raw).slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null
}

/**
 * Push the current user's profile fields to Supabase.
 * Writes to both `patient_profiles` (detailed profile) and `public.users`
 * (identity fields: full_name, phone).
 *
 * Returns `{ ok: true }` on success, `{ ok: false, error }` on failure.
 * Never throws.
 */
export async function pushProfileToSupabase(userId, profile, credentials) {
  if (!userId) return { ok: false, error: 'No user ID' }

  const { first, last } = splitName(profile.name || '')

  // 1. Upsert patient_profiles (detailed profile data)
  const { error: profileError } = await supabase
    .from('patient_profiles')
    .upsert({
      user_id: userId,
      first_name: first,
      last_name: last,
      date_of_birth: asDate(profile.dob),
      gender: mapGender(profile.gender),
      blood_group: mapBlood(profile.bloodGroup),
      height_cm: measure(profile.height),
      weight_kg: measure(profile.weight),
      avatar_url: profile.avatar || null,
      emergency_contact_name: profile.emergencyContact?.name || null,
      emergency_contact_phone: profile.emergencyContact?.phone || null,
      emergency_contact_relation: profile.emergencyContact?.relation || null,
    }, { onConflict: 'user_id' })

  if (profileError) {
    return { ok: false, error: profileError.message }
  }

  // 2. Update public.users (identity fields)
  const userUpdate = {}
  if (profile.name) userUpdate.full_name = profile.name
  if (credentials?.phone) userUpdate.phone = credentials.phone

  if (Object.keys(userUpdate).length) {
    const { error: userError } = await supabase
      .from('users')
      .update(userUpdate)
      .eq('id', userId)

    if (userError) {
      return { ok: false, error: userError.message }
    }
  }

  return { ok: true }
}

/**
 * Read the user's profile from Supabase and return it in the local format.
 * Returns `{ ok: true, profile }` or `{ ok: false, error }`.
 *
 * Local format:
 *   { name, dob, gender, bloodGroup, height, weight, avatar, emergencyContact }
 */
export async function fetchProfileFromSupabase(userId) {
  if (!userId) return { ok: false, error: 'No user ID' }

  const { data, error } = await supabase
    .from('patient_profiles')
    .select('first_name, last_name, date_of_birth, gender, blood_group, height_cm, weight_kg, avatar_url, emergency_contact_name, emergency_contact_phone, emergency_contact_relation')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) return { ok: false, error: error.message }
  if (!data) return { ok: true, profile: null }

  const name = [data.first_name, data.last_name].filter(Boolean).join(' ') || ''
  const height = data.height_cm != null ? `${data.height_cm} cm` : ''
  const weight = data.weight_kg != null ? `${data.weight_kg} kg` : ''

  return {
    ok: true,
    profile: {
      name,
      dob: data.date_of_birth || '',
      gender: data.gender && data.gender !== 'unknown' ? data.gender.charAt(0).toUpperCase() + data.gender.slice(1) : '',
      bloodGroup: data.blood_group && data.blood_group !== 'unknown' ? data.blood_group : '',
      height,
      weight,
      avatar: data.avatar_url || '',
      emergencyContact: {
        name: data.emergency_contact_name || '',
        phone: data.emergency_contact_phone || '',
        relation: data.emergency_contact_relation || '',
      },
    },
  }
}
