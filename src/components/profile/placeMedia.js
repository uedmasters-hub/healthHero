export const PROFILE_GALLERY = [
  '/img/clinic/acton-crawford-8PB_TFEy2XQ-unsplash.jpg',
  '/img/clinic/martha-dominguez-de-gouveia-KF-h9HMxRKg-unsplash.jpg',
  '/img/clinic/adhy-savala-zbpgmGe27p8-unsplash.jpg',
  '/img/clinic/akram-huseyn-V_0ES17m9Tc-unsplash.jpg',
  '/img/clinic/sander-sammy-38Un6Oi5beE-unsplash.jpg',
]

export function mapEmbedUrl(place) {
  if (!place) return null
  const lat = Number(place.latitude)
  const lng = Number(place.longitude)
  if (Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)) {
    return `https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`
  }
  const query = place.fullAddress || place.address || place.locationLabel || place.name
  if (!query) return null
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=14&output=embed`
}

export function galleryFor(mediaUrls = [], image = null) {
  const photos = mediaUrls.filter(Boolean)
  if (photos.length) return photos
  if (image) return [image, ...PROFILE_GALLERY.slice(0, 4)]
  return PROFILE_GALLERY
}
