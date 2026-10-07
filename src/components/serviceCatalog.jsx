/**
 * One service catalog for Home "Our Services" and the All Services sheet, so
 * both surfaces offer the same names, icons and actions.
 */

const lineIcon = (children) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
)

const brain = (
  <>
    <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
    <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
    <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" />
  </>
)

const ICONS = {
  'Book Appointment': (
    lineIcon(<>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18M9 15l2 2 4-4" />
    </>)
  ),
  'Video Consultation': (
    lineIcon(<>
      <path d="m22 8-6 4 6 4V8Z" />
      <rect x="2" y="6" width="14" height="12" rx="2" />
    </>)
  ),
  Pharmacy: (
    lineIcon(<>
      <rect x="6" y="4" width="12" height="17" rx="2" />
      <path d="M9 4V3h6v1M12 10v5M9.5 12.5h5" />
    </>)
  ),
  'Hospitals & Clinics': (
    lineIcon(<>
      <path d="M4 21V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v16" />
      <path d="M2 21h20M12 7v4M10 9h4M9 21v-4h6v4" />
    </>)
  ),
  'Pathology Labs': (
    lineIcon(<>
      <path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-9V3" />
      <path d="M7.5 15h9" />
    </>)
  ),
  'Home Sample Collection': (
    lineIcon(<>
      <path d="M3 10 12 3l9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
      <path d="M12 10v4.5a1.5 1.5 0 0 0 3 0V10M11 10h5" />
    </>)
  ),
  'Emergency Care': (
    lineIcon(<>
      <path d="M20.8 8.6a5 5 0 0 0-8.8-3.2 5 5 0 0 0-8.8 3.2c0 5.4 8.8 11.4 8.8 11.4s8.8-6 8.8-11.4z" />
      <path d="M3.6 12h4l1.5-3 3 6 1.5-3h6.8" />
    </>)
  ),
  'Home Nursing': (
    lineIcon(<>
      <path d="M3 10 12 3l9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
      <path d="M12 11v6M9 14h6" />
    </>)
  ),
  Ambulance: (
    lineIcon(<>
      <path d="M3 17V7a1 1 0 0 1 1-1h10v11M14 9h4l3 4v4h-7" />
      <circle cx="7.5" cy="17.5" r="1.5" />
      <circle cx="17.5" cy="17.5" r="1.5" />
      <path d="M8.5 9v4M6.5 11h4" />
    </>)
  ),
  'Surgery & Procedures': (
    lineIcon(<>
      <path d="M5 3v5a5 5 0 0 0 10 0V3M4 3h2M14 3h2" />
      <path d="M10 13v2a5 5 0 0 0 10 0v-1" />
      <circle cx="20" cy="12" r="2" />
    </>)
  ),
  'General Physician': (
    lineIcon(<>
      <circle cx="12" cy="7" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0M12 15v4M10 17h4" />
    </>)
  ),
  Cardiology: (
    lineIcon(<>
      <path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7Z" />
    </>)
  ),
  Neurology: lineIcon(<>{brain}</>),
  Pediatrics: (
    lineIcon(<>
      <circle cx="12" cy="8" r="5" />
      <path d="M20 21a8 8 0 0 0-16 0M10 9.5c.5.6 1.2.9 2 .9s1.5-.3 2-.9" />
    </>)
  ),
  Gynecology: (
    lineIcon(<>
      <circle cx="12" cy="9" r="5" />
      <path d="M12 14v7M9 18h6" />
    </>)
  ),
  Orthopedics: (
    lineIcon(<>
      <path d="M17 3a2.5 2.5 0 0 1 3.5 3.5L19 8l-11 11-1.5 1.5A2.5 2.5 0 0 1 3 17l1.5-1.5L15.5 4.5z" />
      <path d="m8 13 3 3M13 8l3 3" />
    </>)
  ),
  'Blood Test': (
    lineIcon(<>
      <path d="M12 2C8 6 5 9.5 5 13a7 7 0 0 0 14 0c0-3.5-3-7-7-11Z" />
    </>)
  ),
  'Urine Test': (
    lineIcon(<>
      <path d="M8 3h8M9 3v4l-3 4v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-8l-3-4V3" />
      <path d="M6 14h12" />
    </>)
  ),
  'X-Ray': (
    lineIcon(<>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M12 6v12M8 9h8M8 12h8M9 15h6" />
    </>)
  ),
  ECG: (
    lineIcon(<>
      <path d="M2 12h4l3-9 4 18 3-9h6" />
    </>)
  ),
  Ultrasound: (
    lineIcon(<>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4M6 10l4-4 3 6 3-3 4 4" />
    </>)
  ),
  'Medicine Delivery': (
    lineIcon(<>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M12 11v5M9.5 13.5h5" />
    </>)
  ),
  'Upload Prescription': (
    lineIcon(<>
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <path d="M14 2v6h6M12 18v-6M9 15l3-3 3 3" />
    </>)
  ),
  'Refill Medicines': (
    lineIcon(<>
      <path d="M21 12a9 9 0 1 1-3-6.7" />
      <path d="M21 3v6h-6" />
      <rect x="9" y="9" width="6" height="6" rx="3" />
    </>)
  ),
  'Injection Service': (
    lineIcon(<>
      <path d="m18 2 4 4M17 7l-9.8 9.8a2.8 2.8 0 0 1-2 .8H3v-2.2c0-.8.3-1.5.8-2L14 3.6M9 15l-2-2M12 12l-2-2M3 21l2-2" />
    </>)
  ),
  Physiotherapy: (
    lineIcon(<>
      <circle cx="15" cy="4" r="2" />
      <path d="m4 22 4-8 4 2 3-6 4 2M12 16l-2 6" />
    </>)
  ),
  'Elderly Care': (
    lineIcon(<>
      <circle cx="11" cy="4" r="2" />
      <path d="M11 6v6l-3 9M11 12l3 3v6M8 9l-2 4M17 12v9M14 12h3" />
    </>)
  ),
  'Doctor Home Visit': (
    lineIcon(<>
      <path d="M3 10 12 3l9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
      <path d="M9 21v-6h6v6" />
    </>)
  ),
  'Health Checkup': (
    lineIcon(<>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V3h6v1M8 13h2l1.5-3 2 5 1.5-2H16" />
    </>)
  ),
  Nutrition: (
    lineIcon(<>
      <path d="M12 7c-1.5-2-5-2-6.5.5S5 15 8 19c1.3 1.7 2.7 2 4 1 1.3 1 2.7.7 4-1 3-4 4-9 2.5-11.5S13.5 5 12 7Z" />
      <path d="M12 7c0-2 1-3.5 3-4" />
    </>)
  ),
  'Mental Health': lineIcon(<>{brain}</>),
  Fitness: (
    lineIcon(<>
      <path d="M6.5 6.5v11M17.5 6.5v11M6.5 12h11M3 9v6M21 9v6" />
    </>)
  ),
  'Wellness Programs': (
    lineIcon(<>
      <path d="M12 2 2 7l10 5 10-5-10-5Z" />
      <path d="m2 17 10 5 10-5M2 12l10 5 10-5" />
    </>)
  ),
  'Eye Care': (
    lineIcon(<>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>)
  ),
  ENT: (
    lineIcon(<>
      <path d="M6 8.5a6 6 0 1 1 12 0c0 3.5-3 4.5-3 7.5a3 3 0 0 1-6 .5" />
      <path d="M9.5 8.5a2.5 2.5 0 0 1 5 0" />
    </>)
  ),
  Dental: (
    lineIcon(<>
      <path d="M12 5.5C10.5 4 8.5 3 6.5 3.5 4 4.2 3 7 3.8 10c.6 2.2 1.2 4.4 1.6 7.2.3 2.3 1 3.8 2.1 3.8 1.6 0 1.7-3 2.5-5 .4-1 1.2-1.5 2-1.5s1.6.5 2 1.5c.8 2 .9 5 2.5 5 1.1 0 1.8-1.5 2.1-3.8.4-2.8 1-5 1.6-7.2C21 7 20 4.2 17.5 3.5c-2-.5-4 .5-5.5 2Z" />
    </>)
  ),
  Dermatologist: (
    lineIcon(<>
      <path d="M7 3h10v4a5 5 0 0 1-10 0z" />
      <path d="M12 12v9M9 21h6" />
    </>)
  ),
  Pulmonology: (
    lineIcon(<>
      <path d="M12 4v7M12 11l-3-2M12 11l3-2" />
      <path d="M8.5 7C6 7 3 10 3 15c0 3 1 5 3 5s3.5-1.5 3.5-4V8.5M15.5 7C18 7 21 10 21 15c0 3-1 5-3 5s-3.5-1.5-3.5-4V8.5" />
    </>)
  ),
  'Diabetes Care': (
    lineIcon(<>
      <path d="M12 2C8 6 5 9.5 5 13a7 7 0 0 0 14 0c0-3.5-3-7-7-11Z" />
      <path d="M12 11v5M9.5 13.5h5" />
    </>)
  ),
}

const toItem = (name) => ({ id: name, label: name, icon: ICONS[name] })

/** Home "Our Services" — every entry also appears in the All Services sheet. */
export const HOME_SERVICES = [
  'Book Appointment',
  'Video Consultation',
  'Pharmacy',
  'Hospitals & Clinics',
  'Pathology Labs',
  'Home Sample Collection',
  'Emergency Care',
  'Home Nursing',
].map(toItem)

export const SERVICE_SECTIONS = [
  {
    title: 'Doctor & Consultation',
    items: ['Book Appointment', 'Video Consultation', 'General Physician', 'Cardiology', 'Neurology', 'Pediatrics', 'Gynecology', 'Orthopedics'],
  },
  {
    title: 'Diagnostics',
    items: ['Pathology Labs', 'Blood Test', 'Urine Test', 'X-Ray', 'ECG', 'Ultrasound', 'Health Checkup', 'Home Sample Collection'],
  },
  {
    title: 'Medicine & Pharmacy',
    items: ['Pharmacy', 'Medicine Delivery', 'Upload Prescription', 'Refill Medicines'],
  },
  {
    title: 'Hospitals & Emergency',
    items: ['Hospitals & Clinics', 'Emergency Care', 'Ambulance', 'Surgery & Procedures'],
  },
  {
    title: 'Home Healthcare',
    items: ['Home Nursing', 'Doctor Home Visit', 'Injection Service', 'Physiotherapy'],
  },
  {
    title: 'Wellness',
    items: ['Nutrition', 'Mental Health', 'Fitness', 'Wellness Programs'],
  },
  {
    title: 'Specialty Services',
    items: ['Eye Care', 'ENT', 'Dental', 'Dermatologist', 'Pulmonology', 'Diabetes Care', 'Elderly Care'],
  },
].map((section) => ({ ...section, items: section.items.map(toItem) }))
