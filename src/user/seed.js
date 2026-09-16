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

const DEMO_NOTIFICATIONS = [
  {
    id: 'n1',
    title: 'Appointment tomorrow',
    body: 'Dr. Priya Sharma at 10:30 AM. Don’t forget to complete pre-visit check-in.',
    time: '2m ago',
    unread: true,
    type: 'appointment',
    to: '/appointment',
  },
  {
    id: 'n2',
    title: 'Lab results ready',
    body: 'Your blood test from 20 Sep is available to review.',
    time: '1h ago',
    unread: true,
    type: 'results',
    to: '/post-visit-summary',
  },
  {
    id: 'n3',
    title: 'Booking confirmed',
    body: 'Your visit with Dr. Arjun Mehta is confirmed for Friday.',
    time: 'Yesterday',
    unread: false,
    type: 'booking',
    to: '/treat',
  },
  {
    id: 'n4',
    title: 'Prescription refill',
    body: 'Metformin 500mg can be refilled from Pharmacy.',
    time: 'Mon',
    unread: false,
    type: 'pharmacy',
    to: '/pharmacy',
  },
]

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
      name: 'Ananya Sharma',
      dob: '1990-03-15',
      gender: 'Female',
      bloodGroup: 'O+',
      height: '168 cm',
      weight: '65 kg',
      address: '42 MG Road, Bandra West, Mumbai',
      city: 'Mumbai',
      emergencyContact: {
        name: 'Rohan Sharma',
        relation: 'Spouse',
        phone: '+91 98765 43211',
      },
      insurance: {
        provider: 'Star Health Insurance',
        policyNo: 'SH-2024-78901',
        validTill: '31 Dec 2027',
      },
    },
    members: [
      createMember({
        id: 'family-rohan',
        name: 'Rohan Sharma',
        dob: '1988-06-02',
        gender: 'Male',
        phone: '9876543211',
        address: '42 MG Road, Bandra West, Mumbai',
        relationship: 'Spouse',
      }),
      createMember({
        id: 'child-aanya',
        name: 'Aanya Sharma',
        dob: '2018-01-20',
        gender: 'Female',
        phone: '9876543210',
        address: '42 MG Road, Bandra West, Mumbai',
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
        { id: 'vac-covid', title: 'COVID-19 booster', date: '2025-11-18', dose: 'Booster', doctor: 'BMC Vaccination Centre' },
        { id: 'vac-tet', title: 'Tetanus', date: '2024-02-09', dose: 'Booster', doctor: 'HealthFirst Medical Centre' },
      ],
    },
    prescriptions: [{
      ...defaultPrescription,
      patient: {
        name: 'Ananya Sharma',
        age: 36,
        sex: 'Female',
        date: defaultPrescription.patient.date,
      },
    }],
    notifications: DEMO_NOTIFICATIONS.map((item) => ({ ...item })),
    addresses: [
      createAddress({
        id: 'addr-home',
        label: 'Home',
        line: '42 MG Road, Bandra West, Mumbai',
        city: 'Mumbai',
        isDefault: true,
      }),
    ],
    paymentMethods: [
      { id: 'upi', label: 'UPI · ananya@okhdfcbank', kind: 'upi', default: true },
      { id: 'card', label: 'HDFC Bank •••• 4242', kind: 'card' },
    ],
    paymentHistory: [
      {
        id: 'pay-seed-1',
        amount: 1200,
        currency: 'INR',
        method: 'UPI · ananya@okhdfcbank',
        label: 'Consultation · Dr. Priya Sharma',
        paidAt: '2026-09-10T10:30:00.000Z',
      },
    ],
    pharmacyOrders: [],
    savedInsightIds: [],
    reviews: {},
  })
}
