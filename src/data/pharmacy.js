/** Temporary local pharmacy catalog — replace with API later. */

export const PHARMACY_SEARCH_PLACEHOLDER = 'Search medicines, health products...'

/**
 * Artwork slots for the Pharmacy home. Drop files at these public paths to
 * replace the interim art; every slot falls back (existing art → icon) until then.
 */
const ART = '/img/pharmacy'

export const PHARMACY_HERO_SLIDES = Object.freeze([
  {
    id: 'upload-rx',
    tone: 'sky',
    title: 'Upload a prescription in seconds',
    body: 'Our pharmacists verify every Rx before we pack your order.',
    cta: 'Upload Now',
    action: 'upload-rx',
    images: [`${ART}/hero/upload-prescription.png`, '/img/services/pharmacy.png'],
  },
  {
    id: 'refill',
    tone: 'peach',
    title: 'Never run out of your medicines',
    body: 'Set up auto-refill with doorstep delivery.',
    cta: 'Set Up Refill',
    action: 'refill',
    images: [`${ART}/hero/auto-refill.png`, '/img/services/medicines.png'],
  },
  {
    id: 'safe-hands',
    tone: 'mint',
    title: 'Your health in safe hands',
    body: 'Genuine medicines from trusted pharmacies.',
    cta: 'Shop Now',
    action: 'shop',
    images: [`${ART}/hero/pharmacist.png`, '/img/services/new/pharmacy.png'],
  },
  {
    id: 'consult',
    tone: 'lavender',
    title: 'Talk to a pharmacist anytime',
    body: 'Dosage guidance and interaction checks from licensed experts.',
    cta: 'Consult Now',
    action: 'consult',
    images: [`${ART}/hero/consult-pharmacist.png`, '/img/services/fill.png'],
  },
])

/** Slide the hero opens on (design shows the third card centred). */
export const PHARMACY_HERO_START = 2

export const PHARMACY_SHOP_CATEGORIES = Object.freeze([
  { id: 'prescription', label: 'Prescription Medicines', icon: 'clipboard', image: `${ART}/icons/prescription-medicines.svg` },
  { id: 'otc', label: 'OTC Medicines', icon: 'capsule', image: `${ART}/icons/otc-medicines.svg` },
  { id: 'supplements', label: 'Health Supplements', icon: 'supplement', image: `${ART}/icons/health-supplements.svg` },
  { id: 'personal', label: 'Personal Care', icon: 'firstaid', image: `${ART}/icons/personal-care.svg` },
  { id: 'diabetes', label: 'Diabetes Care', icon: 'heartpulse', image: `${ART}/icons/diabetes-care.svg` },
  { id: 'baby', label: 'Baby Care', icon: 'babybottle', image: `${ART}/icons/baby-care.svg` },
  { id: 'skincare', label: 'Skincare', icon: 'pump', image: `${ART}/icons/skincare.svg` },
  { id: 'wellness', label: 'Wellness', icon: 'heart', image: `${ART}/icons/wellness.svg` },
])

/** Full list for the "All categories" sheet; the Popular rail is a subset. */
export const PHARMACY_ALL_CATEGORIES = Object.freeze([
  { id: 'prescription', label: 'Prescription Medicines', icon: 'clipboard' },
  { id: 'otc', label: 'OTC Medicines', icon: 'pill' },
  { id: 'diabetes', label: 'Diabetes Care', icon: 'heartpulse', image: `${ART}/popular/diabetes-care.png` },
  { id: 'heart', label: 'Heart Care', icon: 'heart' },
  { id: 'pain', label: 'Pain Relief', icon: 'capsule', image: `${ART}/popular/pain-relief.png` },
  { id: 'cold-flu', label: 'Cold & Flu', icon: 'shield' },
  { id: 'vitamins', label: 'Vitamins & Supplements', icon: 'supplement', image: `${ART}/popular/vitamins-supplements.png` },
  { id: 'ayurveda', label: 'Ayurveda & Herbal', icon: 'leaf' },
  { id: 'skincare', label: 'Skincare', icon: 'pump', image: `${ART}/popular/skincare.png` },
  { id: 'haircare', label: 'Hair Care', icon: 'bottle' },
  { id: 'baby', label: 'Baby Care', icon: 'babybottle', image: `${ART}/popular/baby-care.png` },
  { id: 'mother', label: 'Mother Care', icon: 'baby' },
  { id: 'personal', label: 'Personal Care', icon: 'firstaid', image: `${ART}/popular/personal-care.png` },
  { id: 'first-aid', label: 'First Aid', icon: 'cross' },
  { id: 'devices', label: 'Health Devices', icon: 'device' },
  { id: 'elderly', label: 'Elderly Care', icon: 'home' },
  { id: 'women', label: "Women's Health", icon: 'spark' },
  { id: 'fitness', label: 'Fitness & Nutrition', icon: 'star' },
])

const POPULAR_CATEGORY_IDS = ['diabetes', 'vitamins', 'skincare', 'baby', 'pain', 'personal']

export const PHARMACY_POPULAR_CATEGORIES = Object.freeze(
  POPULAR_CATEGORY_IDS.map((id) => PHARMACY_ALL_CATEGORIES.find((item) => item.id === id)),
)

export const PHARMACY_OFFERS = Object.freeze([
  {
    id: 'first-order',
    tone: 'mint',
    title: 'Flat 20% off',
    body: 'on first medicine order',
    code: 'HEALTH20',
    image: `${ART}/offers/first-order.png`,
  },
  {
    id: 'vitamins',
    tone: 'sky',
    title: 'Flat 15% off',
    body: 'on vitamins & supplements',
    code: 'VITA15',
    image: `${ART}/offers/vitamins.png`,
  },
  {
    id: 'delivery',
    tone: 'peach',
    title: 'Free delivery',
    body: 'on orders above Rs 999',
    code: 'FREESHIP',
    image: `${ART}/offers/free-delivery.png`,
  },
])

export const PHARMACY_SUPPORT = Object.freeze({
  title: 'Need help with medicines?',
  body: 'Chat with a pharmacist for dosage guidance, interactions, and refill questions.',
  cta: 'Start Live Chat',
  image: `${ART}/icons/live-chat.svg`,
})

export const PHARMACY_TRUST = Object.freeze({
  stats: [
    { id: 'customers', value: '1M+', label: 'Happy customers' },
    { id: 'rating', value: '4.8', star: true, label: 'Average rating' },
  ],
  testimonial: {
    quote: 'Authentic medicines and super fast delivery. Very reliable service!',
    name: 'Srijana K.C.',
    place: 'Kathmandu',
    rating: 5,
    avatar: `${ART}/testimonials/srijana-kc.jpg`,
  },
})

export const PHARMACY_COMMITMENTS = Object.freeze([
  { id: 'secure', title: 'Safe & secure', body: 'Your data is protected', icon: 'lock', image: `${ART}/icons/safe-secure.svg` },
  { id: 'genuine', title: 'Genuine medicines', body: 'From licensed pharmacies', icon: 'medbox', image: `${ART}/icons/genuine-medicines.svg` },
  { id: 'health', title: 'Better health', body: 'Through trusted care', icon: 'clipboard', image: `${ART}/icons/better-health.svg` },
  { id: 'support', title: 'Always here', body: 'Support when you need', icon: 'clock', image: `${ART}/icons/always-here.svg` },
])

/** @typedef {'out_for_delivery' | 'delivered' | 'processing' | 'cancelled'} PharmacyOrderStatus */

export const PHARMACY_ORDER_STATUS = Object.freeze({
  out_for_delivery: {
    id: 'out_for_delivery',
    label: 'Out for Delivery',
    tone: 'success',
  },
  delivered: {
    id: 'delivered',
    label: 'Delivered',
    tone: 'processing',
  },
  processing: {
    id: 'processing',
    label: 'Processing',
    tone: 'warning',
  },
  cancelled: {
    id: 'cancelled',
    label: 'Cancelled',
    tone: 'danger',
  },
})

export const PHARMACY_TIP = Object.freeze({
  id: 'tip_hydration',
  eyebrow: 'Pharmacist tip',
  title: 'Keep medicines cool and dry',
  body: 'Store tablets away from heat and moisture, and check the expiry date before each refill.',
  image: `${ART}/icons/pharmacist-tip.svg`,
})

const DISPENSING_STATUS = Object.freeze({
  pending: 'processing',
  verified: 'processing',
  dispensed: 'out_for_delivery',
  picked_up: 'out_for_delivery',
  returned: 'cancelled',
})

export function getPharmacyOrderStatus(statusId) {
  const id = DISPENSING_STATUS[statusId] || statusId
  return PHARMACY_ORDER_STATUS[id] || PHARMACY_ORDER_STATUS.processing
}
