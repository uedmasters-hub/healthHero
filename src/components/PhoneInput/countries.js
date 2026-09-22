const countries = [
  { code: '+977', iso: 'NP', name: 'Nepal', flag: '\uD83C\uDDF3\uD83C\uDDF5' },
  { code: '+91', iso: 'IN', name: 'India', flag: '\uD83C\uDDEE\uD83C\uDDF3' },
  { code: '+1', iso: 'US', name: 'United States', flag: '\uD83C\uDDFA\uD83C\uDDF8' },
  { code: '+44', iso: 'GB', name: 'United Kingdom', flag: '\uD83C\uDDEC\uD83C\uDDE7' },
  { code: '+61', iso: 'AU', name: 'Australia', flag: '\uD83C\uDDE6\uD83C\uDDFA' },
  { code: '+971', iso: 'AE', name: 'United Arab Emirates', flag: '\uD83C\uDDE6\uD83C\uDDEA' },
  { code: '+65', iso: 'SG', name: 'Singapore', flag: '\uD83C\uDDF8\uD83C\uDDEC' },
  { code: '+81', iso: 'JP', name: 'Japan', flag: '\uD83C\uDDEF\uD83C\uDDF5' },
  { code: '+86', iso: 'CN', name: 'China', flag: '\uD83C\uDDE8\uD83C\uDDF3' },
  { code: '+49', iso: 'DE', name: 'Germany', flag: '\uD83C\uDDE9\uD83C\uDDEA' },
  { code: '+33', iso: 'FR', name: 'France', flag: '\uD83C\uDDEB\uD83C\uDDF7' },
  { code: '+966', iso: 'SA', name: 'Saudi Arabia', flag: '\uD83C\uDDF8\uD83C\uDDE6' },
  { code: '+974', iso: 'QA', name: 'Qatar', flag: '\uD83C\uDDF6\uD83C\uDDE6' },
  { code: '+973', iso: 'BH', name: 'Bahrain', flag: '\uD83C\uDDE7\uD83C\uDDED' },
  { code: '+968', iso: 'OM', name: 'Oman', flag: '\uD83C\uDDF4\uD83C\uDDF2' },
  { code: '+965', iso: 'KW', name: 'Kuwait', flag: '\uD83C\uDDF0\uD83C\uDDFC' },
  { code: '+60', iso: 'MY', name: 'Malaysia', flag: '\uD83C\uDDF2\uD83C\uDDFE' },
  { code: '+66', iso: 'TH', name: 'Thailand', flag: '\uD83C\uDDF9\uD83C\uDDED' },
  { code: '+84', iso: 'VN', name: 'Vietnam', flag: '\uD83C\uDDFB\uD83C\uDDF3' },
  { code: '+63', iso: 'PH', name: 'Philippines', flag: '\uD83C\uDDF5\uD83C\uDDED' },
  { code: '+62', iso: 'ID', name: 'Indonesia', flag: '\uD83C\uDDEE\uD83C\uDDE9' },
  { code: '+82', iso: 'KR', name: 'South Korea', flag: '\uD83C\uDDF0\uD83C\uDDF7' },
  { code: '+852', iso: 'HK', name: 'Hong Kong', flag: '\uD83C\uDDED\uD83C\uDDF0' },
  { code: '+886', iso: 'TW', name: 'Taiwan', flag: '\uD83C\uDDF9\uD83C\uDDFC' },
  { code: '+64', iso: 'NZ', name: 'New Zealand', flag: '\uD83C\uDDF3\uD83C\uDDFF' },
  { code: '+27', iso: 'ZA', name: 'South Africa', flag: '\uD83C\uDDFF\uD83C\uDDE6' },
  { code: '+55', iso: 'BR', name: 'Brazil', flag: '\uD83C\uDDE7\uD83C\uDDF7' },
  { code: '+52', iso: 'MX', name: 'Mexico', flag: '\uD83C\uDDF2\uD83C\uDDFD' },
  { code: '+39', iso: 'IT', name: 'Italy', flag: '\uD83C\uDDEE\uD83C\uDDF9' },
  { code: '+34', iso: 'ES', name: 'Spain', flag: '\uD83C\uDDEA\uD83C\uDDF8' },
  { code: '+31', iso: 'NL', name: 'Netherlands', flag: '\uD83C\uDDF3\uD83C\uDDF1' },
  { code: '+41', iso: 'CH', name: 'Switzerland', flag: '\uD83C\uDDE8\uD83C\uDDED' },
  { code: '+46', iso: 'SE', name: 'Sweden', flag: '\uD83C\uDDF8\uD83C\uDDEA' },
  { code: '+47', iso: 'NO', name: 'Norway', flag: '\uD83C\uDDF3\uD83C\uDDF4' },
  { code: '+45', iso: 'DK', name: 'Denmark', flag: '\uD83C\uDDE9\uD83C\uDDF0' },
  { code: '+358', iso: 'FI', name: 'Finland', flag: '\uD83C\uDDEB\uD83C\uDDEE' },
  { code: '+48', iso: 'PL', name: 'Poland', flag: '\uD83C\uDDF5\uD83C\uDDF1' },
  { code: '+420', iso: 'CZ', name: 'Czech Republic', flag: '\uD83C\uDDE8\uD83C\uDDFF' },
  { code: '+43', iso: 'AT', name: 'Austria', flag: '\uD83C\uDDE6\uD83C\uDDF9' },
  { code: '+353', iso: 'IE', name: 'Ireland', flag: '\uD83C\uDDEE\uD83C\uDDEA' },
  { code: '+234', iso: 'NG', name: 'Nigeria', flag: '\uD83C\uDDF3\uD83C\uDDEC' },
  { code: '+254', iso: 'KE', name: 'Kenya', flag: '\uD83C\uDDF0\uD83C\uDDEA' },
  { code: '+20', iso: 'EG', name: 'Egypt', flag: '\uD83C\uDDEA\uD83C\uDDEC' },
  { code: '+212', iso: 'MA', name: 'Morocco', flag: '\uD83C\uDDF2\uD83C\uDDE6' },
  { code: '+90', iso: 'TR', name: 'Turkey', flag: '\uD83C\uDDF9\uD83C\uDDF7' },
  { code: '+7', iso: 'RU', name: 'Russia', flag: '\uD83C\uDDF7\uD83C\uDDFA' },
  { code: '+380', iso: 'UA', name: 'Ukraine', flag: '\uD83C\uDDFA\uD83C\uDDE6' },
  { code: '+880', iso: 'BD', name: 'Bangladesh', flag: '\uD83C\uDDE7\uD83C\uDDE9' },
  { code: '+94', iso: 'LK', name: 'Sri Lanka', flag: '\uD83C\uDDF1\uD83C\uDDF0' },
  { code: '+92', iso: 'PK', name: 'Pakistan', flag: '\uD83C\uDDF5\uD83C\uDDF0' },
]

export default countries

export function findCountryByCode(dialCode) {
  return countries.find((c) => c.code === dialCode) || countries[0]
}

export function parseCountryFromDigits(digits) {
  if (!digits) return countries[0]
  const sorted = [...countries].sort((a, b) => b.code.length - a.code.length)
  for (const c of sorted) {
    const codeDigits = c.code.replace('+', '')
    if (digits.startsWith(codeDigits)) return c
  }
  return countries[0]
}
