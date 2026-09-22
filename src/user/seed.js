import { medicalRecords } from '../data/records'
import { defaultPrescription } from '../data/prescription'
import {
  DEMO_EMAIL,
  DEMO_PASSWORD,
  DEMO_PHONE,
  DEMO_USER_ID,
} from './constants'
import { hashSecret, createSalt } from './crypto'
import { createUserRecord, createMember, createAddress } from './models'

export async function buildDemoUser() {
  const salt = createSalt()
  const passwordHash = await hashSecret(DEMO_PASSWORD, salt)
  return createUserRecord({
    id: DEMO_USER_ID,
    email: DEMO_EMAIL,
    phone: DEMO_PHONE,
    passwordHash,
    salt,
    profile: {
      name: 'Sita Sharma',
      dob: '1990-03-15',
      gender: 'Female',
      bloodGroup: 'O+',
      height: '168 cm',
      weight: '65 kg',
      address: 'Thamel, Kathmandu',
      city: 'Kathmandu',
      emergencyContact: {
        name: 'Ram Sharma',
        relation: 'Spouse',
        phone: '+977 9841234567',
      },
      insurance: {
        provider: 'Nepal Life Insurance',
        policyNo: 'NL-2024-78901',
        validTill: '31 Dec 2027',
      },
    },
    members: [
      createMember({
        id: 'family-ram',
        name: 'Ram Sharma',
        dob: '1988-06-02',
        gender: 'Male',
        phone: '9841234567',
        address: 'Thamel, Kathmandu',
        relationship: 'Spouse',
      }),
      createMember({
        id: 'child-aasha',
        name: 'Aasha Sharma',
        dob: '2018-01-20',
        gender: 'Female',
        phone: '9845271970',
        address: 'Thamel, Kathmandu',
        relationship: 'Child',
      }),
    ],
    records: {
      consultations: medicalRecords.consultations.map((item) => ({ ...item })),
      reports: medicalRecords.reports.map((item) => ({ ...item })),
      medications: medicalRecords.medications.map((item) => ({ ...item })),
    },
    health: {
      diagnoses: [
        { id: 'dx-vitd', title: 'Vitamin D deficiency', date: '2026-05-12', doctor: 'Dr. Kabir Sethi', status: 'Monitoring', details: 'Started D3 supplementation. Recheck in 3 months.' },
      ],
      allergies: [
        { id: 'alg-pen', title: 'Penicillin', severity: 'Moderate', details: 'Rash and itching. Avoid penicillin-class antibiotics.', date: '2019-08-01' },
      ],
      conditions: [
        { id: 'cnd-t2d', title: 'Type 2 Diabetes', date: '2026-03-01', status: 'Managed', doctor: 'Dr. Vivek Menon', details: 'Managed with Metformin and diet.' },
        { id: 'cnd-thy', title: 'Hypothyroidism', date: '2026-03-01', status: 'Managed', doctor: 'Dr. Vivek Menon', details: 'Stable on Thyroxine 50mcg.' },
      ],
      surgeries: [],
      vaccinations: [
        { id: 'vac-covid', title: 'COVID-19 booster', date: '2025-11-18', dose: 'Booster', doctor: 'Kathmandu Vaccination Centre' },
        { id: 'vac-tet', title: 'Tetanus', date: '2024-02-09', dose: 'Booster', doctor: 'HealthFirst Medical Centre' },
      ],
    },
    prescriptions: [{
      ...defaultPrescription,
      patient: {
        name: 'Sita Sharma',
        age: 36,
        sex: 'Female',
        date: defaultPrescription.patient.date,
      },
    }],
    addresses: [
      createAddress({
        id: 'addr-home',
        label: 'Home',
        line: 'Thamel, Kathmandu',
        city: 'Kathmandu',
        isDefault: true,
      }),
    ],
    paymentMethods: [
      { id: 'esewa', label: 'eSewa · 9845271970', kind: 'wallet', default: true },
      { id: 'card', label: 'Nabil Bank •••• 4242', kind: 'card' },
    ],
    paymentHistory: [
      {
        id: 'pay-seed-1',
        amount: 1200,
        currency: 'NPR',
        method: 'eSewa · 9845271970',
        label: 'Consultation · Dr. Priya Sharma',
        paidAt: '2026-09-10T10:30:00.000Z',
      },
    ],
    pharmacyOrders: [],
    savedInsightIds: [],
    reviews: {},
  })
}
