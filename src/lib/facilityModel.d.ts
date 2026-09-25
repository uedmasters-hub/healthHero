export function displayFacilityLevel(raw?: string | null): string
export function formatFacilityKind(type?: string | null, facilityLevel?: string | null): string
export function facilityClassification(row?: Record<string, unknown>): string
export function cleanFacilityDisplayName(
  name?: string | null,
  opts?: { district?: string | null; place?: string | null },
): string
export function displayFacilityName(
  name?: string | null,
  opts?: { district?: string | null; place?: string | null },
): string
export function shortHfCode(hfCode?: string | null): string
export function facilityAvatarName(facility?: { name?: string; shortHfCode?: string; hfCode?: string } | null): string
export function facilityDisplayTitle(facility?: { name?: string; shortHfCode?: string; hfCode?: string } | null): string
export function normalizeFacilityRow(
  row: Record<string, unknown>,
  opts?: {
    origin?: { latitude: number; longitude: number }
    defaultOrigin?: { latitude: number; longitude: number }
    haversineKm?: Function
    formatDistanceKm?: (km: number | null) => string | null
  },
): Record<string, unknown>
