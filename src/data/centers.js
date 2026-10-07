/** Temporary Healthcare center home content — replace with API later. */

export const CENTERS_SEARCH_PLACEHOLDER = 'Search hospitals, clinics, services…'

/**
 * Artwork slots for the Healthcare center home. Drop files at these public
 * paths to replace the interim art; every slot falls back until then.
 */
const ART = '/img/centers'

export const CENTERS_HERO_SLIDES = Object.freeze([
  {
    id: 'hospitals',
    tone: 'sky',
    title: 'Trusted hospitals near you',
    body: 'Compare departments, facilities and availability.',
    cta: 'Find Hospitals',
    action: 'hospital',
    images: [`${ART}/hero/hospitals.png`, '/img/services/hospital.png'],
  },
  {
    id: 'packages',
    tone: 'peach',
    title: 'Health checkups made simple',
    body: 'Preventive packages at partner centres.',
    cta: 'View Packages',
    action: 'packages',
    images: [`${ART}/hero/health-packages.png`, '/img/services/labs.png'],
  },
  {
    id: 'priority',
    tone: 'cyan',
    title: 'Your health, our priority',
    body: 'Personalized care from trusted specialists.',
    cta: 'Find a Doctor',
    action: 'book',
    images: [`${ART}/hero/doctor.png`, '/img/services/doctor.png'],
  },
  {
    id: 'home-care',
    tone: 'lavender',
    title: 'Care at home, when you need it',
    body: 'Doctor and nursing visits at your door.',
    cta: 'Book Home Care',
    action: 'home',
    images: [`${ART}/hero/home-care.png`, '/img/services/home-care.png'],
  },
])

/** Slide the hero opens on (design shows the third card centred). */
export const CENTERS_HERO_START = 2

export const CENTERS_SEGMENTS = Object.freeze([
  { id: 'hospital', label: 'Hospitals' },
  { id: 'clinic', label: 'Clinics' },
])

export const CENTERS_QUICK_ACTIONS = Object.freeze([
  { id: 'hospital', label: 'Find Hospitals', icon: 'hospital' },
  { id: 'clinic', label: 'Find Clinics', icon: 'clinic' },
  { id: 'emergency', label: 'Emergency Care', icon: 'emergency' },
  { id: 'book', label: 'Book Appointment', icon: 'calendar' },
  { id: 'departments', label: 'Departments', icon: 'departments' },
  { id: 'lab', label: 'Diagnostics', icon: 'diagnostics' },
  { id: 'surgery', label: 'Surgery & Procedures', icon: 'stethoscope' },
  { id: 'packages', label: 'Health Packages', icon: 'packages' },
])

export const CENTERS_PROMOS = Object.freeze([
  {
    id: 'emergency',
    tone: 'rose',
    title: 'Emergency care',
    body: 'Available 24/7 at partner hospitals',
    action: 'emergency',
    images: [`${ART}/promos/emergency-care.png`, '/img/services/new/emergency.png'],
  },
  {
    id: 'ambulance',
    tone: 'slate',
    title: '24/7 Ambulance',
    body: 'Triage & rapid response',
    action: 'ambulance',
    images: [`${ART}/promos/ambulance.png`, '/img/services/ambulance.png'],
  },
])

export const CENTERS_FACILITY_FILTERS = Object.freeze([
  { id: 'hospital', label: 'Hospital', query: 'hospital' },
  { id: 'clinic', label: 'Clinic', query: 'clinic' },
  { id: 'home', label: 'Home Care', query: 'home' },
  { id: 'lab', label: 'Diagnostics', query: 'diagnostic' },
])

export const CENTERS_SERVICES = Object.freeze({
  hospital: {
    title: 'Hospital services',
    items: [
      { id: 'emergency', title: 'Emergency Care', body: '24x7 emergency services', kind: 'hospital', images: [`${ART}/services/emergency-care.jpg`] },
      { id: 'surgery', title: 'Surgery', body: 'Advanced surgical care', kind: 'hospital', images: [`${ART}/services/surgery.jpg`] },
      { id: 'diagnostics', title: 'Diagnostics', body: 'Lab, X-ray, MRI, CT', kind: 'lab', images: [`${ART}/services/diagnostics.jpg`] },
      { id: 'inpatient', title: 'Inpatient Care', body: 'Comfortable rooms', kind: 'hospital', images: [`${ART}/services/inpatient-care.jpg`] },
    ],
  },
  clinic: {
    title: 'Clinic services',
    items: [
      { id: 'general', title: 'General Consultation', body: 'Same-day GP visits', kind: 'clinic', images: [`${ART}/services/general-consultation.jpg`, `${ART}/services/inpatient-care.jpg`] },
      { id: 'lab', title: 'Lab Tests', body: 'Blood work & screenings', kind: 'lab', images: [`${ART}/services/lab-tests.jpg`, `${ART}/services/diagnostics.jpg`] },
      { id: 'minor', title: 'Minor Procedures', body: 'Dressings, sutures & more', kind: 'clinic', images: [`${ART}/services/minor-procedures.jpg`, `${ART}/services/surgery.jpg`] },
      { id: 'home', title: 'Home Care', body: 'Doctor & nursing visits', kind: 'home', images: [`${ART}/services/home-care.jpg`, `${ART}/services/emergency-care.jpg`] },
    ],
  },
})

export const CENTERS_TRUST = Object.freeze({
  stats: [
    { id: 'patients', value: '1M+', label: 'Happy patients' },
    { id: 'rating', value: '4.8', star: true, label: 'Average rating' },
  ],
  testimonial: {
    quote: 'Excellent doctors and seamless appointment experience. eMedicalls made it easy to find the right care center near me.',
    name: 'Sanjay K.',
    place: 'Kathmandu',
    rating: 5,
    avatar: `${ART}/testimonials/sanjay-k.jpg`,
  },
})

export const CENTERS_HELP = Object.freeze([
  { id: 'care-team', title: 'Talk to our care team', body: 'Get assistance with bookings', icon: 'care', action: 'chat' },
  { id: 'call', title: 'Call Support', body: '+977 1 400 0000', icon: 'phone', action: 'call', href: 'tel:+97714000000' },
  { id: 'chat', title: 'Live Chat', body: 'Chat with our team', icon: 'chat', action: 'chat' },
  { id: 'help-center', title: 'Visit Help Center', body: 'FAQs & support articles', icon: 'help', action: 'help' },
])

