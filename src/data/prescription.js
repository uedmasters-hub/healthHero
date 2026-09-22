export const defaultPrescription = {
  id: 'rx-menon-2026-0204',
  clinic: {
    name: 'HealthFirst Medical Centre',
    address: 'Thapathali, Kathmandu',
    phone: '+977 22 2640 1122',
    email: 'info@healthfirst.in',
  },
  patient: {
    name: 'Rohan Sharma',
    age: 38,
    sex: 'Male',
    date: '4 Feb 2026',
  },
  prescriber: {
    name: 'Dr. Vivek Menon',
    specialty: 'Endocrinologist',
    license: 'MMC-29471',
  },
  note: 'Patient presented with elevated blood sugar levels and mild hypertension. Recommended lifestyle changes including regular exercise and dietary modifications. Follow-up in 2 weeks to reassess medication effectiveness.',
  medications: [
    { name: 'Metformin 500mg', instructions: 'Twice daily after meals', duration: '30 days' },
    { name: 'Telmisartan 40mg', instructions: 'Once daily in morning', duration: '30 days' },
  ],
  validDays: 30,
}

export function prescriptionFromVisit(visit, extras = {}) {
  const date = visit.start instanceof Date
    ? visit.start.toLocaleDateString('en-NP', { day: 'numeric', month: 'short', year: 'numeric' })
    : defaultPrescription.patient.date

  return {
    ...defaultPrescription,
    id: `rx-${visit.id || visit.doctor?.id || 'visit'}`,
    clinic: {
      ...defaultPrescription.clinic,
      address: visit.doctor?.address || defaultPrescription.clinic.address,
      phone: visit.doctor?.phone || defaultPrescription.clinic.phone,
    },
    prescriber: {
      name: visit.doctor?.name ? `Dr. ${String(visit.doctor.name).replace(/^Dr\.?\s*/i, '')}` : defaultPrescription.prescriber.name,
      specialty: visit.doctor?.specialty || defaultPrescription.prescriber.specialty,
      license: visit.doctor?.license || defaultPrescription.prescriber.license,
    },
    patient: {
      ...defaultPrescription.patient,
      date,
    },
    ...extras,
  }
}
