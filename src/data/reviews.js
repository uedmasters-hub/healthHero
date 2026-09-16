import {
  currentUser,
  getUserReviews,
  removeUserReview,
  upsertUserReview,
} from '../user/store'

const STORAGE_KEY = 'healthhero.reviews.v2'

function review({ id, author, date, rating, text, patientId = null, createdAt }) {
  return { id, author, date, rating, text, patientId, createdAt: createdAt || Date.parse(`${date} 12:00:00 GMT`) }
}

const seedByDoctor = {
  1: [
    review({ id: 'd1-r1', author: 'Priya K.', date: '3 Aug 2026', rating: 5, text: 'Dr. Sharma completely transformed my skin. Her laser treatment plan was thorough and the results are incredible.' }),
    review({ id: 'd1-r2', author: 'Rahul T.', date: '19 Jul 2026', rating: 5, text: 'Went in for a routine mole check and felt so well taken care of. Warm, knowledgeable, and truly listens.' }),
    review({ id: 'd1-r3', author: 'Nisha R.', date: '28 Jun 2026', rating: 4, text: 'Clear explanation of my acne plan. Follow-up could be a bit faster, but the treatment is working.' }),
    review({ id: 'd1-r4', author: 'Aarav M.', date: '4 Jun 2026', rating: 5, text: 'Professional clinic and excellent aftercare. Highly recommend for cosmetic dermatology.' }),
  ],
  2: [
    review({ id: 'd2-r1', author: 'Amit S.', date: '28 Jul 2026', rating: 5, text: 'Excellent cardiologist. Dr. Mehta explains everything clearly and makes you feel comfortable during procedures.' }),
    review({ id: 'd2-r2', author: 'Kavita V.', date: '2 Jul 2026', rating: 4, text: 'Thorough ECG review and a practical plan for my blood pressure. Wait time was a little long.' }),
    review({ id: 'd2-r3', author: 'Farhan Q.', date: '11 Jun 2026', rating: 5, text: 'Felt heard for the first time about my chest discomfort. Calm, precise, and reassuring.' }),
  ],
  3: [
    review({ id: 'd3-r1', author: 'Maya L.', date: '8 Aug 2026', rating: 5, text: 'My toddler actually looks forward to visits now. Dr. Reddy is wonderful with kids.' }),
    review({ id: 'd3-r2', author: 'Rohit P.', date: '15 Jul 2026', rating: 5, text: 'Vaccination visit was smooth and she answered every nervous-parent question.' }),
    review({ id: 'd3-r3', author: 'Isha D.', date: '22 Jun 2026', rating: 4, text: 'Great with growth tracking. Clinic can get busy in the evenings.' }),
  ],
  4: [
    review({ id: 'd4-r1', author: 'Dev K.', date: '30 Jul 2026', rating: 5, text: 'Clear diagnosis for my migraines and a plan that actually reduced frequency.' }),
    review({ id: 'd4-r2', author: 'Hana S.', date: '6 Jul 2026', rating: 4, text: 'Very detailed neuro exam. Appreciate the patience, though slots fill up fast.' }),
    review({ id: 'd4-r3', author: 'Omar B.', date: '29 May 2026', rating: 5, text: 'Explained MRI results in plain language. I left feeling informed, not scared.' }),
  ],
  5: [
    review({ id: 'd5-r1', author: 'Priyanka N.', date: '1 Aug 2026', rating: 5, text: 'Knee recovery has been faster than expected. Practical exercises and honest timelines.' }),
    review({ id: 'd5-r2', author: 'Tarun H.', date: '12 Jul 2026', rating: 4, text: 'Good sports-injury consult. A bit rushed at the end of the day.' }),
    review({ id: 'd5-r3', author: 'Rina J.', date: '18 Jun 2026', rating: 5, text: 'Helped me avoid unnecessary surgery. Grateful for the conservative approach.' }),
  ],
  6: [
    review({ id: 'd6-r1', author: 'Sanjay P.', date: '25 Jul 2026', rating: 5, text: 'Asthma plan is finally under control. Breathing tests were explained well.' }),
    review({ id: 'd6-r2', author: 'Chitra W.', date: '30 Jun 2026', rating: 4, text: 'Helpful for a lingering cough. Follow-up prescription arrived the next day.' }),
    review({ id: 'd6-r3', author: 'Aditi M.', date: '3 Jun 2026', rating: 5, text: 'Calm manner during a scary shortness-of-breath episode. Highly recommend.' }),
  ],
  7: [
    review({ id: 'd7-r1', author: 'Kavya S.', date: '5 Aug 2026', rating: 5, text: 'Felt respected and unhurried. Clear guidance on my cycle concerns.' }),
    review({ id: 'd7-r2', author: 'Meera T.', date: '9 Jul 2026', rating: 5, text: 'Annual visit was thorough without being overwhelming. Lovely bedside manner.' }),
    review({ id: 'd7-r3', author: 'Anu R.', date: '21 May 2026', rating: 4, text: 'Good consult. Front desk wait was longer than expected.' }),
  ],
  8: [
    review({ id: 'd8-r1', author: 'Rahul V.', date: '20 Jul 2026', rating: 5, text: 'Treated my chronic sinusitis effectively. Professional and caring throughout.' }),
    review({ id: 'd8-r2', author: 'Sana G.', date: '26 Jun 2026', rating: 4, text: 'Ear infection cleared quickly. Would like more aftercare notes in the app.' }),
    review({ id: 'd8-r3', author: 'Nikhil A.', date: '14 May 2026', rating: 5, text: 'Straightforward tonsil consult. No unnecessary tests, just a solid plan.' }),
  ],
}

function fallbackReviews(doctorId) {
  return [
    review({
      id: `d${doctorId}-r1`,
      author: 'Patient',
      date: '8 Jul 2026',
      rating: 5,
      text: 'Attentive, professional, and easy to talk to. I left with a clear next step.',
    }),
    review({
      id: `d${doctorId}-r2`,
      author: 'Aisha Y.',
      date: '16 Jun 2026',
      rating: 4,
      text: 'Solid consultation. Would book again for a follow-up.',
    }),
  ]
}

function cloneSeed() {
  const next = {}
  Object.keys(seedByDoctor).forEach((id) => {
    next[id] = seedByDoctor[id].map((item) => ({ ...item }))
  })
  return next
}

function loadStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return cloneSeed()
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : cloneSeed()
  } catch {
    return cloneSeed()
  }
}

function listFor(store, doctorId) {
  const key = String(doctorId)
  const items = store[key] || fallbackReviews(doctorId)
  return [...items].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
}

export function formatReviewDate(date = new Date()) {
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function summarizeReviews(items) {
  const total = items.length
  if (!total) {
    return {
      total: 0,
      rating: 0,
      distribution: [5, 4, 3, 2, 1].map((stars) => ({ stars, percent: 0 })),
    }
  }
  const sum = items.reduce((acc, item) => acc + Number(item.rating || 0), 0)
  const rating = Math.round((sum / total) * 10) / 10
  const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  items.forEach((item) => {
    const star = Math.min(5, Math.max(1, Math.round(item.rating)))
    counts[star] += 1
  })
  return {
    total,
    rating,
    distribution: [5, 4, 3, 2, 1].map((stars) => ({
      stars,
      percent: Math.round((counts[stars] / total) * 100),
    })),
  }
}

export function getDoctorReviews(doctorId) {
  const catalog = listFor(loadStore(), doctorId).filter((item) => !item.patientId)
  const mine = getUserReviews(doctorId)
  const mineIds = new Set(mine.map((item) => item.id))
  return [...mine, ...catalog.filter((item) => !mineIds.has(item.id))]
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
}

export function getDoctorReviewSummary(doctorId) {
  const items = getDoctorReviews(doctorId)
  return { ...summarizeReviews(items), items }
}

export function addDoctorReview(doctorId, { rating, text }) {
  const user = currentUser()
  if (!user) return null
  const now = new Date()
  const next = {
    id: `mine-${now.getTime()}`,
    author: user.profile.name,
    patientId: user.id,
    date: formatReviewDate(now),
    createdAt: now.getTime(),
    rating,
    text: text.trim(),
  }
  upsertUserReview(doctorId, next)
  return next
}

export function updateDoctorReview(doctorId, reviewId, { rating, text }) {
  const user = currentUser()
  if (!user) return
  upsertUserReview(doctorId, {
    id: reviewId,
    author: user.profile.name,
    patientId: user.id,
    rating,
    text: text.trim(),
    date: formatReviewDate(new Date()),
    createdAt: Date.now(),
  })
}

export function deleteDoctorReview(doctorId, reviewId) {
  removeUserReview(doctorId, reviewId)
}

export function isOwnReview(item) {
  const user = currentUser()
  return Boolean(user && item?.patientId === user.id)
}
