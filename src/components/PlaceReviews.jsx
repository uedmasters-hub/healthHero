import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  addDoctorReview,
  deleteDoctorReview,
  getDoctorReviews,
  getDoctorReviewSummary,
  isOwnReview,
  placeReviewKey,
  updateDoctorReview,
} from '../data/reviews'
import { flowState } from '../lib/careFlow'
import { usePushBack } from '../features/pushNav'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import PullToRefreshIndicator from './PullToRefreshIndicator'
import './DoctorReviews.css'

function StarPick({ value, onChange }) {
  return (
    <div className="reviews-star-pick" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={`reviews-star-btn ${star <= value ? 'is-on' : ''}`}
          aria-label={`${star} star${star === 1 ? '' : 's'}`}
          onClick={() => onChange(star)}
        >
          ★
        </button>
      ))}
    </div>
  )
}

function ReviewItem({ item, onEdit, onDelete }) {
  const mine = isOwnReview(item)
  return (
    <article className="reviews-item">
      <div className="reviews-item-top">
        <div>
          <div className="reviews-item-author">
            {item.author}
            {mine ? <span className="reviews-you">You</span> : null}
          </div>
          <div className="reviews-item-date">{item.date}</div>
        </div>
        {mine && (
          <div className="reviews-item-actions">
            <button type="button" onClick={() => onEdit(item)}>Edit</button>
            <button type="button" onClick={() => onDelete(item)}>Delete</button>
          </div>
        )}
      </div>
      <div className="reviews-item-stars" aria-label={`${item.rating} stars`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star} className={star <= item.rating ? 'is-on' : ''}>★</span>
        ))}
      </div>
      <p className="reviews-item-text">{item.text}</p>
    </article>
  )
}

function EntityReviews({ reviewKey, backTo }) {
  const navigate = useNavigate()
  const location = useLocation()
  const subjectName = location.state?.subjectName || ''
  const goBack = usePushBack(() => navigate(backTo, { state: flowState(location) }))
  const [tick, setTick] = useState(0)
  const scrollRef = useRef(null)
  const onRefresh = useCallback(async () => {
    setTick((n) => n + 1)
  }, [])
  const ptr = usePullToRefresh(scrollRef, onRefresh)
  const items = useMemo(() => getDoctorReviews(reviewKey), [reviewKey, tick])
  const summary = useMemo(() => getDoctorReviewSummary(reviewKey), [reviewKey, tick])
  const mine = items.find(isOwnReview)
  const [draftRating, setDraftRating] = useState(mine?.rating || 5)
  const [draftText, setDraftText] = useState(mine?.text || '')
  const [editingId, setEditingId] = useState(mine?.id || null)

  useEffect(() => {
    if (!mine) return
    setDraftRating(mine.rating)
    setDraftText(mine.text)
    setEditingId(mine.id)
  }, [mine?.id, mine?.text, mine?.rating])

  const refresh = () => setTick((n) => n + 1)

  const startEdit = (item) => {
    setEditingId(item.id)
    setDraftRating(item.rating)
    setDraftText(item.text)
  }

  const save = () => {
    const text = draftText.trim()
    if (!text) return
    if (mine) updateDoctorReview(reviewKey, mine.id, { rating: draftRating, text })
    else addDoctorReview(reviewKey, { rating: draftRating, text })
    refresh()
  }

  const remove = (item) => {
    deleteDoctorReview(reviewKey, item.id)
    if (editingId === item.id) {
      setEditingId(null)
      setDraftText('')
      setDraftRating(5)
    }
    refresh()
  }

  return (
    <div className="reviews-page">
      <div className="reviews-header">
        <button type="button" className="reviews-back" data-push-back aria-label="Back" onClick={goBack}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <h1>Reviews</h1>
        <div className="reviews-header-spacer" />
      </div>
      <div className="reviews-scroll" ref={scrollRef}>
        <PullToRefreshIndicator pull={ptr.pull} refreshing={ptr.refreshing} />
        <div className="reviews-summary">
          <div className="reviews-summary-score">{summary.rating || '—'}</div>
          <div>
            <div className="reviews-summary-stars" aria-hidden="true">
              {[1, 2, 3, 4, 5].map((star) => (
                <span key={star} className={star <= Math.round(summary.rating) ? 'is-on' : ''}>★</span>
              ))}
            </div>
            <p>{summary.total} reviews{subjectName ? ` for ${subjectName}` : ''}</p>
          </div>
        </div>
        <section className="reviews-compose">
          <div className="reviews-compose-title">{mine ? 'Your review' : 'Write a review'}</div>
          <StarPick value={draftRating} onChange={setDraftRating} />
          <textarea
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            rows={4}
            placeholder="Share how your visit went"
          />
          <button type="button" className="reviews-save" onClick={save} disabled={!draftText.trim()}>
            {mine ? 'Save changes' : 'Post review'}
          </button>
        </section>
        <div className="reviews-list">
          {items.map((item) => (
            <ReviewItem key={item.id} item={item} onEdit={startEdit} onDelete={remove} />
          ))}
        </div>
      </div>
    </div>
  )
}

export function PharmacyReviewsPage() {
  const { pharmacyId } = useParams()
  return <EntityReviews reviewKey={placeReviewKey('pharmacy', pharmacyId)} backTo={`/pharmacy/${pharmacyId}`} />
}

export function FacilityReviewsPage() {
  const { centerId } = useParams()
  return <EntityReviews reviewKey={placeReviewKey('facility', centerId)} backTo={`/centers/${centerId}`} />
}
