import { makeDateValue } from '../components/calendar/dates'
import { formatClockLabel, formatTimeSlot } from '../lib/bookingPolicy'
import { prescriptionFromVisit } from './prescription'

function visitAtMinutesFromNow(minutes) {
  const start = new Date()
  start.setSeconds(0, 0)
  start.setMilliseconds(0)
  start.setMinutes(start.getMinutes() + minutes)
  return {
    start,
    timeSlot: formatTimeSlot(start),
    dateLabel: start.toLocaleDateString('en-NP', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }),
    timeLabel: formatClockLabel(start),
  }
}

const featuredWhen = visitAtMinutesFromNow(28)

function bookingFromVisit(visit) {
  return {
    doctor: {
      id: visit.doctor.id,
      name: visit.doctor.name,
      specialty: visit.doctor.specialty,
      color: visit.doctor.color,
      initial: visit.doctor.initial,
      address: visit.doctor.address,
      fee: visit.doctor.fee,
      rating: visit.doctor.rating,
      photo: visit.doctor.photo,
      phone: visit.doctor.phone,
    },
    date: makeDateValue(visit.start),
    time: visit.timeSlot,
    visitType: visit.visitType,
    duration: visit.duration,
    status: 'booked',
    preparationCompleted: true,
  }
}

export const featuredVisit = {
  id: 'featured',
  status: 'Upcoming',
  doctor: {
    id: 10,
    name: 'Vivek Menon',
    specialty: 'Endocrinologist',
    initial: 'V',
    color: '#4e2a84',
    photo: '/img/doctors/doctor-m2.png',
    address: '88 Anna Salai, Chennai',
    fee: 1600,
    rating: 4.8,
    phone: '+977 98765 43010',
  },
  start: featuredWhen.start,
  timeSlot: featuredWhen.timeSlot,
  visitType: 'In-Person',
  duration: '30 min',
  condition: 'Type 2 Diabetes Management',
  dateLabel: featuredWhen.dateLabel,
  timeLabel: featuredWhen.timeLabel,
}

export const careHistory = [
  {
    id: 1,
    status: 'Upcoming',
    doctor: {
      id: 10,
      name: 'Vivek Menon',
      specialty: 'Endocrinologist',
      initial: 'V',
      color: '#10B981',
      photo: '/img/doctors/doctor-m2.png',
      address: '88 Anna Salai, Chennai',
      fee: 1600,
      rating: 4.8,
      phone: '+977 98765 43010',
    },
    start: new Date(2026, 8, 14, 10, 0),
    timeSlot: '10:00 AM',
    visitType: 'In-Person',
    duration: '30 min',
    condition: 'Type 2 Diabetes - Follow-up',
    dateLabel: '14 Sep 2026 · 10:00 AM',
    nextLabel: 'Next: 14 Sep',
  },
  {
    id: 2,
    status: 'Active',
    doctor: {
      id: 2,
      name: 'Arjun Mehta',
      specialty: 'Cardiologist',
      initial: 'A',
      color: '#3B5BDB',
      photo: '/img/doctors/doctor-m1.png',
      address: 'Durbar Marg, Kathmandu',
      fee: 2000,
      rating: 4.7,
      phone: '+977 98765 43212',
    },
    start: new Date(2026, 8, 15, 11, 0),
    timeSlot: '11:00 AM',
    visitType: 'Video Consultation',
    duration: '30 min',
    condition: 'Hypertension Management',
    dateLabel: 'Telmisartan 40mg',
    nextLabel: 'Next: 15 Sep 2026',
  },
  {
    id: 3,
    status: 'Completed',
    doctor: {
      id: 1,
      name: 'Priya Sharma',
      specialty: 'Dermatologist',
      initial: 'P',
      color: '#8B5CF6',
      photo: '/img/doctors/doctor-w2.png',
      address: 'Jawalakhel, Lalitpur',
      fee: 1200,
      rating: 4.6,
      phone: '+977 98765 43213',
    },
    start: new Date(2026, 7, 28, 16, 0),
    timeSlot: '4:00 PM',
    visitType: 'In-Person',
    duration: '30 min',
    condition: 'Eczema Treatment',
    dateLabel: 'Completed 28 Aug 2026',
    nextLabel: 'Closed',
  },
  {
    id: 4,
    status: 'Cancelled',
    doctor: {
      id: 15,
      name: 'Anika Bose',
      specialty: 'Ophthalmologist',
      initial: 'A',
      color: '#EC4899',
      photo: '/img/doctors/doctor-w3.png',
      address: '7 Park Street, Kolkata',
      fee: 1200,
      rating: 4.8,
      phone: '+977 98765 43215',
    },
    start: new Date(2026, 6, 5, 9, 0),
    timeSlot: '9:00 AM',
    visitType: 'In-Person',
    duration: '30 min',
    condition: 'Vision Screening',
    dateLabel: 'Cancelled 5 Jul 2026',
    nextLabel: 'Archived',
  },
]

export const careLabs = [
  { id: 'lab-1', name: 'HbA1c', result: '7.1%', date: '20 Aug 2026', status: 'Reviewed' },
  { id: 'lab-2', name: 'Lipid Panel', result: 'In range', date: '20 Aug 2026', status: 'Reviewed' },
  { id: 'lab-3', name: 'TSH', result: '2.4 mIU/L', date: '12 Jul 2026', status: 'Reviewed' },
]

export const careMedications = [
  { id: 'med-1', name: 'Metformin 500mg', detail: 'Twice daily with meals', status: 'Active' },
  { id: 'med-2', name: 'Telmisartan 40mg', detail: 'Once daily in the morning', status: 'Active' },
  { id: 'med-3', name: 'Atorvastatin 20mg', detail: 'Once daily at night', status: 'Active' },
]

export function visitToBooking(visit) {
  return bookingFromVisit(visit)
}

export function visitSummary(visit) {
  return {
    doctor: { ...visit.doctor, rating: visit.doctor.rating },
    date: visit.start.toLocaleDateString('en-NP', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }),
    type: `${visit.visitType} Visit`,
    time: visit.timeLabel || visit.dateLabel,
    address: visit.doctor.address,
    careSummary: [
      'Care plan reviewed with your consultant',
      'Lifestyle and medication guidance updated',
      'Follow-up scheduled based on your progress',
    ],
    followUp: { date: visit.nextLabel, description: 'Continue your current care plan unless advised otherwise.' },
    resources: [
      { icon: 'medications', label: 'Medications', detail: '2 prescribed' },
      { icon: 'tests', label: 'Tests & Lab Orders', detail: '3 ordered' },
      { icon: 'payment', label: 'Payment Detail', detail: 'Rs. 500 paid' },
      { icon: 'prescription', label: 'Prescription', detail: '' },
    ],
    prescription: prescriptionFromVisit(visit),
  }
}
