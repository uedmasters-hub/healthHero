/**
 * Shared Pharmacy model types (PocketPills DdaPharmacy parity).
 * Runtime lives in `pharmacyModel.js`.
 */

export type DdaPharmacy = {
  registrationNo: string
  name: string
  place: string
  district: string
  pranali: string
}

export type Pharmacy = {
  id: string
  pharmacyUuid?: string | null
  name: string
  /** Original registry name — search matches this in Supabase; UI uses `name`. */
  registryName?: string | null
  nameLocal: string | null
  nameTransliterated: string | null
  hasUsableName?: boolean
  licenseNumber: string | null
  pharmacyCode: string | null
  registrationNo: string | null
  shortLicense?: string
  area: string
  place: string
  city: string
  district: string
  locationLabel: string
  address: string
  systemType: string
  pharmacyType: string
  phone: string
  email: string
  image: string
  logoUrl: string | null
  rating: number | null
  delivers: boolean
  verificationStatus: string
  isVerified: boolean
  ddaVerifiedLabel: string | null
  latitude: number | null
  longitude: number | null
  distanceKm: number | null
  distance: string | null
  openStatus: 'open' | 'closed' | null
  openLabel: string | null
  sourceKey: string | null
  externalRef: string | null
  centerId: string | null
  serviceCount: number
  addressLine1?: string
  addressLine2?: string
  state?: string
  country?: string
  postalCode?: string
  fullAddress?: string
  deliveryRadiusKm?: number | null
  verifiedAt?: string | null
  isActive?: boolean
}

export type PharmacyNameInput = {
  name?: string | null
  nameLocal?: string | null
  nameTransliterated?: string | null
  rawName?: string | null
  english_name?: string | null
  display_name?: string | null
  pharmacy_name?: string | null
  organization_name?: string | null
  trade_name?: string | null
  candidates?: Array<string | null | undefined>
}

export type PharmacyLocationInput = {
  area?: string | null
  place?: string | null
  city?: string | null
  district?: string | null
}

export declare function isUsablePharmacyName(raw: string): boolean
export declare function collectPharmacyNameCandidates(
  row?: Record<string, unknown>,
  payload?: Record<string, unknown>,
): Array<string | null | undefined>
export declare function pharmacyDisplayTitle(
  pharmacy: Partial<Pharmacy> | null | undefined,
  opts?: { allowLicenseFallback?: boolean },
): string
export declare function normalizeRegNo(raw: string): string | null
export declare function shortRegNo(registrationNo: string): string
export declare function displayPharmacyName(name: string): string
export declare function cleanPharmacyDisplayName(name: string): string
export declare function normalizePranali(raw: string): string
export declare function displayPranali(raw: string): string
export declare function formatPharmacyType(systemType: string): string
export declare function extractEnglishPharmacyName(raw: string): string
export declare function resolvePharmacyDisplayName(input?: PharmacyNameInput): string
export declare function resolvePharmacyLocation(input?: PharmacyLocationInput): {
  area: string
  place: string
  city: string
  district: string
  locationLabel: string
}
export declare function normalizePharmacyRow(
  row: Record<string, unknown>,
  opts?: {
    origin?: { latitude: number; longitude: number }
    defaultOrigin?: { latitude: number; longitude: number }
    formatDistanceKm?: (km: number | null) => string | null
    haversineKm?: (
      lat1: number,
      lng1: number,
      lat2: number,
      lng2: number,
    ) => number
  },
): Pharmacy
export declare function pharmacyAvatarName(pharmacy: Partial<Pharmacy> | null | undefined): string

export declare const PHARMACY_TYPE_FILTERS: ReadonlyArray<{
  id: string
  label: string
  match: string | null
}>
