/** Temporary local pharmacy catalog — replace with API later. */

export const PHARMACY_SEARCH_PLACEHOLDER = 'Search medicines, health products...'

export const PHARMACY_PROMO_SLIDES = Object.freeze([
  {
    id: 'refill',
    tone: 'refill',
    title: 'Never run out of your medicines',
    body: 'Set up auto-refill and stay on track with doorstep delivery.',
    cta: 'Set Up Refill',
    action: 'refill',
    image: '/img/services/medicines.png',
  },
  {
    id: 'rx',
    tone: 'rx',
    title: 'Upload a prescription in seconds',
    body: 'Our pharmacists verify every Rx before we pack your order.',
    cta: 'Upload Prescription',
    action: 'upload-rx',
    image: '/img/services/pharmacy.png',
  },
  {
    id: 'essentials',
    tone: 'essentials',
    title: 'Health essentials, delivered fast',
    body: 'Vitamins, wellness kits, and daily care — curated for you.',
    cta: 'Browse Essentials',
    action: 'essentials',
    image: '/img/services/fill.png',
  },
  {
    id: 'pharmacist',
    tone: 'pharmacist',
    title: 'Talk to a pharmacist anytime',
    body: 'Get dosage guidance and interaction checks from licensed experts.',
    cta: 'Consult Now',
    action: 'consult',
    image: '/img/services/new/pharmacy.png',
  },
])

export const PHARMACY_SERVICES = Object.freeze([
  {
    id: 'refill',
    label: 'Refill Medicines',
    tone: 'mint',
    action: 'refill',
    icon: 'refill',
  },
  {
    id: 'upload-rx',
    label: 'Upload Prescription',
    tone: 'sky',
    action: 'upload-rx',
    icon: 'rx',
  },
  {
    id: 'essentials',
    label: 'Health Essentials',
    tone: 'lavender',
    action: 'essentials',
    icon: 'bag',
  },
  {
    id: 'consult',
    label: 'Consult a Pharmacist',
    tone: 'peach',
    action: 'consult',
    icon: 'chat',
  },
])

export const PHARMACY_CATEGORIES = Object.freeze([
  { id: 'pain', label: 'Pain Relief' },
  { id: 'diabetes', label: 'Diabetes' },
  { id: 'vitamins', label: 'Vitamins' },
  { id: 'heart', label: 'Heart Care' },
  { id: 'skin', label: 'Skin Care' },
  { id: 'baby', label: 'Baby Care' },
  { id: 'personal', label: 'Personal Care' },
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
    tone: 'info',
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

export const PHARMACY_ORDERS = Object.freeze([
  {
    id: 'ord_metformin',
    name: 'Metformin 500mg',
    thumbnail: '/img/dugs/amoxicillin.png',
    status: 'out_for_delivery',
    window: 'Arriving today, 2 PM – 6 PM',
  },
  {
    id: 'ord_amlodipine',
    name: 'Amlodipine 5mg',
    thumbnail: '/img/dugs/atorvastatin.png',
    status: 'delivered',
    window: 'Thu, 24 Aug',
  },
  {
    id: 'ord_atorva',
    name: 'Atorvastatin 10mg',
    thumbnail: '/img/dugs/atorvastatin.png',
    status: 'processing',
    window: 'Packing · ships tomorrow',
  },
])

export const PHARMACY_RECENT = Object.freeze([
  {
    id: 'rec_amox',
    name: 'Amoxicillin 250mg',
    detail: '10 tablets · Reorder',
    thumbnail: '/img/dugs/amoxicillin.png',
  },
  {
    id: 'rec_acet',
    name: 'Acetaminophen 650mg',
    detail: '15 tablets · Reorder',
    thumbnail: '/img/dugs/acetaminophen.png',
  },
  {
    id: 'rec_advair',
    name: 'Advair Diskus',
    detail: '1 inhaler · Reorder',
    thumbnail: '/img/dugs/advair.png',
  },
  {
    id: 'rec_abili',
    name: 'Abilify 10mg',
    detail: '30 tablets · Reorder',
    thumbnail: '/img/dugs/abilify.png',
  },
])

export const PHARMACY_TIP = Object.freeze({
  id: 'tip_hydration',
  eyebrow: 'Pharmacist tip',
  title: 'Take Metformin with food',
  body: 'Pair your morning dose with breakfast to reduce stomach upset and keep levels steady.',
})

export function getPharmacyOrderStatus(statusId) {
  return PHARMACY_ORDER_STATUS[statusId] || PHARMACY_ORDER_STATUS.processing
}
