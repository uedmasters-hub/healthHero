/**
 * Specialty / symptom aliases — English, Nepali script, and romanized Nepali.
 * Enables transliterated typing (e.g. "jwaro", "mutu") alongside Devanagari.
 */

import { ALL_SPECIALISATIONS } from '../../data/specialisations'
import { fieldsMatchQuery, normalizeSearchQuery, sortBySearchRank } from './searchMatch'

export const SPECIALTY_SEARCH_TERMS = {
  Cardiologist: ['heart', 'chest pain', 'blood pressure', 'bp', 'hypertension', 'मुटु', 'छाती', 'रक्तचाप', 'हृदय', 'mutu', 'rakta chap'],
  Dentist: ['tooth', 'teeth', 'gum', 'cavity', 'dental', 'toothache', 'दाँत', 'दन्त', 'daant', 'dant'],
  Dermatologist: ['acne', 'rash', 'eczema', 'skin', 'itch', 'दाद', 'छाला', 'मुँहासे', 'खटिरा', 'chhala', 'dad', 'muhase'],
  'ENT Specialist': ['ear', 'nose', 'throat', 'sinus', 'hearing', 'कान', 'नाक', 'घाँटी', 'साइनस', 'kaan', 'naak', 'ghanti'],
  Endocrinologist: ['diabetes', 'thyroid', 'hormone', 'sugar', 'मधुमेह', 'थाइराइड', 'चिनी', 'madhumeha', 'thyroid'],
  Gastroenterologist: ['stomach', 'digestion', 'acid', 'reflux', 'constipation', 'पेट', 'अपच', 'एसिडिटी', 'पाचन', 'pet', 'apach'],
  'General Physician': ['fever', 'cough', 'cold', 'flu', 'checkup', 'gp', 'physician', 'ज्वरो', 'खोकी', 'रुघा', 'डाक्टर', 'jwaro', 'khoki', 'rugha'],
  Gynecologist: ['pregnancy', 'period', 'menstrual', 'pcos', 'women', 'गर्भावस्था', 'महिनावारी', 'स्त्री रोग', 'mahina', 'garbha'],
  Immunologist: ['allergy', 'immune', 'hives', 'अल्र्जी', 'प्रतिरक्षा', 'allergy'],
  Neurologist: ['headache', 'migraine', 'seizure', 'nerve', 'stroke', 'टाउको दुखाइ', 'माइग्रेन', 'नसा', 'स्नायु', 'tauko', 'nasa'],
  Nutritionist: ['diet', 'nutrition', 'weight loss', 'obesity', 'आहार', 'पोषण', 'तौल', 'ahar', 'poshan'],
  Ophthalmologist: ['eye', 'vision', 'glasses', 'cataract', 'आँखा', 'दृष्टि', 'चस्मा', 'aankha', 'chasma'],
  Orthopedist: ['bone', 'joint', 'knee', 'back pain', 'fracture', 'हड्डी', 'जोर्नी', 'घुँडा', 'ढाड', 'haddi', 'jor'],
  Pediatrician: ['child', 'baby', 'infant', 'kid', 'vaccination', 'बच्चा', 'शिशु', 'बाल रोग', 'खोप', 'baccha', 'shishu', 'khop'],
  Physiotherapist: ['physio', 'rehab', 'injury', 'muscle', 'फिजियो', 'चोट', 'मांसपेशी', 'physio', 'chot'],
  Psychiatrist: ['anxiety', 'depression', 'stress', 'sleep', 'mental', 'चिन्ता', 'डिप्रेसन', 'मानसिक', 'निन्द्रा', 'chinta', 'depression'],
  Pulmonologist: ['asthma', 'breathing', 'lung', 'COPD', 'दम', 'सास', 'फोक्सो', 'dam', 'saas', 'phokso'],
  Sexologist: ['sexual', 'contraception', 'std', 'sti', 'यौन', 'गर्भनिरोधक', 'yaun'],
  Urologist: ['urine', 'kidney', 'bladder', 'prostate', 'uti', 'पिसाब', 'मिर्गौला', 'मूत्राशय', 'pisab', 'mirgaula'],
}

export function searchSpecialties(query, { limit = 8 } = {}) {
  const needle = normalizeSearchQuery(query)
  const catalog = ALL_SPECIALISATIONS.map((spec) => ({
    ...spec,
    terms: SPECIALTY_SEARCH_TERMS[spec.name] || [],
  }))

  if (!needle) {
    return catalog.slice(0, limit).map((spec) => ({
      type: 'specialisation',
      label: spec.name,
      meta: 'Specialty',
      id: spec.name,
      image: spec.image,
      rank: 0,
    }))
  }

  const matched = catalog.filter((spec) => fieldsMatchQuery(
    [spec.name, ...(spec.terms || [])],
    query,
  ))

  return sortBySearchRank(
    matched,
    query,
    (spec) => [spec.name, ...(spec.terms || [])],
  )
    .slice(0, limit)
    .map((spec) => ({
      type: 'specialisation',
      label: spec.name,
      meta: 'Specialty',
      id: spec.name,
      image: spec.image,
      rank: 0,
    }))
}
