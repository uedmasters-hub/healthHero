/**
 * Nepal geography — provinces + districts from the HF government registry.
 * Canonical client reference for address selectors and location filters.
 */

export const NEPAL_COUNTRY = {
  code: 'NP',
  name: 'Nepal',
  dialCode: '+977',
  currency: 'NPR',
  locale: 'en-NP',
}

/** Kathmandu valley fallback coordinates */
export const NEPAL_DEFAULT_COORDS = {
  latitude: 27.7172,
  longitude: 85.3240,
  label: 'Kathmandu',
}

/** Default discovery location when GPS is unavailable */
export const NEPAL_DEFAULT_LOCATION = 'Kathmandu'

/** Explicit nationwide browse option in Location filters */
export const ALL_NEPAL_LOCATION = 'All Nepal'

export const NEPAL_PROVINCES = [
  'Koshi',
  'Madhesh',
  'Bagmati',
  'Gandaki',
  'Lumbini',
  'Karnali',
  'Sudurpashchim',
]

export const NEPAL_DISTRICTS = [
  {
    "name": "Achham",
    "province": "Sudurpashchim",
    "country": "NP"
  },
  {
    "name": "Arghakhachi",
    "province": "Lumbini",
    "country": "NP"
  },
  {
    "name": "Baglung",
    "province": "Gandaki",
    "country": "NP"
  },
  {
    "name": "Baitadi",
    "province": "Sudurpashchim",
    "country": "NP"
  },
  {
    "name": "Bajhang",
    "province": "Sudurpashchim",
    "country": "NP"
  },
  {
    "name": "Bajura",
    "province": "Sudurpashchim",
    "country": "NP"
  },
  {
    "name": "Banke",
    "province": "Lumbini",
    "country": "NP"
  },
  {
    "name": "Bara",
    "province": "Madhesh",
    "country": "NP"
  },
  {
    "name": "Bardiya",
    "province": "Lumbini",
    "country": "NP"
  },
  {
    "name": "Bhaktapur",
    "province": "Bagmati",
    "country": "NP"
  },
  {
    "name": "Bhojpur",
    "province": "Koshi",
    "country": "NP"
  },
  {
    "name": "Chitawan",
    "province": "Bagmati",
    "country": "NP"
  },
  {
    "name": "Dadeldhura",
    "province": "Sudurpashchim",
    "country": "NP"
  },
  {
    "name": "Dailekh",
    "province": "Karnali",
    "country": "NP"
  },
  {
    "name": "Dang",
    "province": "Lumbini",
    "country": "NP"
  },
  {
    "name": "Darchula",
    "province": "Sudurpashchim",
    "country": "NP"
  },
  {
    "name": "Dhading",
    "province": "Bagmati",
    "country": "NP"
  },
  {
    "name": "Dhankuta",
    "province": "Koshi",
    "country": "NP"
  },
  {
    "name": "Dhanusha",
    "province": "Madhesh",
    "country": "NP"
  },
  {
    "name": "Dolakha",
    "province": "Bagmati",
    "country": "NP"
  },
  {
    "name": "Dolpa",
    "province": "Karnali",
    "country": "NP"
  },
  {
    "name": "Doti",
    "province": "Sudurpashchim",
    "country": "NP"
  },
  {
    "name": "Gorkha",
    "province": "Gandaki",
    "country": "NP"
  },
  {
    "name": "Gulmi",
    "province": "Lumbini",
    "country": "NP"
  },
  {
    "name": "Humla",
    "province": "Karnali",
    "country": "NP"
  },
  {
    "name": "Ilam",
    "province": "Koshi",
    "country": "NP"
  },
  {
    "name": "Jajarkot",
    "province": "Karnali",
    "country": "NP"
  },
  {
    "name": "Jhapa",
    "province": "Koshi",
    "country": "NP"
  },
  {
    "name": "Jumla",
    "province": "Karnali",
    "country": "NP"
  },
  {
    "name": "Kailali",
    "province": "Sudurpashchim",
    "country": "NP"
  },
  {
    "name": "Kalikot",
    "province": "Karnali",
    "country": "NP"
  },
  {
    "name": "Kanchanpur",
    "province": "Sudurpashchim",
    "country": "NP"
  },
  {
    "name": "Kapilvastu",
    "province": "Lumbini",
    "country": "NP"
  },
  {
    "name": "Kaski",
    "province": "Gandaki",
    "country": "NP"
  },
  {
    "name": "Kathmandu",
    "province": "Bagmati",
    "country": "NP"
  },
  {
    "name": "Kavrepalanchowk",
    "province": "Bagmati",
    "country": "NP"
  },
  {
    "name": "Khotang",
    "province": "Koshi",
    "country": "NP"
  },
  {
    "name": "Lalitpur",
    "province": "Bagmati",
    "country": "NP"
  },
  {
    "name": "Lamjung",
    "province": "Gandaki",
    "country": "NP"
  },
  {
    "name": "Mahottari",
    "province": "Madhesh",
    "country": "NP"
  },
  {
    "name": "Makawanpur",
    "province": "Bagmati",
    "country": "NP"
  },
  {
    "name": "Manang",
    "province": "Gandaki",
    "country": "NP"
  },
  {
    "name": "Morang",
    "province": "Koshi",
    "country": "NP"
  },
  {
    "name": "Mugu",
    "province": "Karnali",
    "country": "NP"
  },
  {
    "name": "Mustang",
    "province": "Gandaki",
    "country": "NP"
  },
  {
    "name": "Myagdi",
    "province": "Gandaki",
    "country": "NP"
  },
  {
    "name": "Nawalparasi",
    "province": "Gandaki",
    "country": "NP"
  },
  {
    "name": "Nawalpur",
    "province": "Gandaki",
    "country": "NP"
  },
  {
    "name": "Nuwakot",
    "province": "Bagmati",
    "country": "NP"
  },
  {
    "name": "Okhaldhunga",
    "province": "Koshi",
    "country": "NP"
  },
  {
    "name": "Palpa",
    "province": "Lumbini",
    "country": "NP"
  },
  {
    "name": "Panchthar",
    "province": "Koshi",
    "country": "NP"
  },
  {
    "name": "Parbat",
    "province": "Gandaki",
    "country": "NP"
  },
  {
    "name": "Parsa",
    "province": "Madhesh",
    "country": "NP"
  },
  {
    "name": "Pyuthan",
    "province": "Lumbini",
    "country": "NP"
  },
  {
    "name": "Ramechhap",
    "province": "Bagmati",
    "country": "NP"
  },
  {
    "name": "Rasuwa",
    "province": "Bagmati",
    "country": "NP"
  },
  {
    "name": "Rautahat",
    "province": "Madhesh",
    "country": "NP"
  },
  {
    "name": "Rolpa",
    "province": "Lumbini",
    "country": "NP"
  },
  {
    "name": "Rukum",
    "province": "Lumbini",
    "country": "NP"
  },
  {
    "name": "Rukumkot",
    "province": "Bagmati",
    "country": "NP"
  },
  {
    "name": "Rupandehi",
    "province": "Lumbini",
    "country": "NP"
  },
  {
    "name": "Salyan",
    "province": "Karnali",
    "country": "NP"
  },
  {
    "name": "Sankhuwasava",
    "province": "Koshi",
    "country": "NP"
  },
  {
    "name": "Saptari",
    "province": "Madhesh",
    "country": "NP"
  },
  {
    "name": "Sarlahi",
    "province": "Madhesh",
    "country": "NP"
  },
  {
    "name": "Sidhupalchowk",
    "province": "Bagmati",
    "country": "NP"
  },
  {
    "name": "Sindhuli",
    "province": "Bagmati",
    "country": "NP"
  },
  {
    "name": "Siraha",
    "province": "Madhesh",
    "country": "NP"
  },
  {
    "name": "Solukhumbu",
    "province": "Koshi",
    "country": "NP"
  },
  {
    "name": "Sunsari",
    "province": "Koshi",
    "country": "NP"
  },
  {
    "name": "Surkhet",
    "province": "Karnali",
    "country": "NP"
  },
  {
    "name": "Syangja",
    "province": "Gandaki",
    "country": "NP"
  },
  {
    "name": "Tanahun",
    "province": "Gandaki",
    "country": "NP"
  },
  {
    "name": "Taplejung",
    "province": "Koshi",
    "country": "NP"
  },
  {
    "name": "Terhathum",
    "province": "Koshi",
    "country": "NP"
  },
  {
    "name": "Udayapur",
    "province": "Koshi",
    "country": "NP"
  }
]

export function districtsForProvince(province) {
  if (!province || province === 'All') return NEPAL_DISTRICTS.map((d) => d.name)
  return NEPAL_DISTRICTS.filter((d) => d.province === province).map((d) => d.name)
}

export function provinceForDistrict(district) {
  const hit = NEPAL_DISTRICTS.find((d) => d.name.toLowerCase() === String(district || '').toLowerCase())
  return hit?.province || null
}

export const NEPAL_MAJOR_CITIES = [
  'Kathmandu',
  'Lalitpur',
  'Bhaktapur',
  'Pokhara',
  'Biratnagar',
  'Birgunj',
  'Dharan',
  'Butwal',
  'Nepalgunj',
  'Dhangadhi',
  'Hetauda',
  'Janakpur',
  'Itahari',
  'Chitwan',
]

/** Location filter options for doctor discovery (nearby-first + nationwide). */
export const NEPAL_LOCATION_OPTIONS = [ALL_NEPAL_LOCATION, ...NEPAL_MAJOR_CITIES]

const CITY_ALIASES = {
  kathmandu: 'Kathmandu',
  ktm: 'Kathmandu',
  'kathmandu valley': 'Kathmandu',
  patan: 'Lalitpur',
  lalitpur: 'Lalitpur',
  bhaktapur: 'Bhaktapur',
  pokhara: 'Pokhara',
  biratnagar: 'Biratnagar',
  birgunj: 'Birgunj',
  dharan: 'Dharan',
  butwal: 'Butwal',
  nepalgunj: 'Nepalgunj',
  dhangadhi: 'Dhangadhi',
  hetauda: 'Hetauda',
  janakpur: 'Janakpur',
  itahari: 'Itahari',
  chitwan: 'Chitwan',
  bharatpur: 'Chitwan',
}

export function matchNepalCity(values = []) {
  for (const raw of values) {
    if (!raw) continue
    const key = String(raw).toLowerCase().trim()
    if (CITY_ALIASES[key]) return CITY_ALIASES[key]
    const exact = NEPAL_MAJOR_CITIES.find((city) => city.toLowerCase() === key)
    if (exact) return exact
    const partial = NEPAL_MAJOR_CITIES.find((city) => (
      key.includes(city.toLowerCase()) || city.toLowerCase().includes(key)
    ))
    if (partial) return partial
  }
  return null
}

export function isAllNepalLocation(value) {
  const key = String(value || '').trim().toLowerCase()
  return !key || key === 'all' || key === 'all nepal' || key === 'nepal'
}

/**
 * Reverse-geocode device coords to a Nepal major city.
 * Resolves to null when permission is denied or outside known cities.
 */
export function detectNepalCityFromDevice({ timeoutMs = 8000 } = {}) {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve(null)
      return
    }
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${coords.latitude}&longitude=${coords.longitude}&localityLanguage=en`
          const res = await fetch(url)
          if (!res.ok) {
            resolve(null)
            return
          }
          const data = await res.json()
          const admin = (data.localityInfo?.administrative || []).map((item) => item.name)
          resolve(
            matchNepalCity([data.city, data.locality, data.principalSubdivision, ...admin])
            || null,
          )
        } catch {
          resolve(null)
        }
      },
      () => resolve(null),
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 300000 },
    )
  })
}
