import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { getDoctorById } from '../data/doctors'
import {
  addDoctorReview,
  deleteDoctorReview,
  getDoctorReviews,
  getDoctorReviewSummary,
  isOwnReview,
  updateDoctorReview,
} from '../data/reviews'
import { flowState } from '../lib/careFlow'
import { usePushBack } from '../features/pushNav'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import PullToRefreshIndicator from './PullToRefreshIndicator'
import { refreshDoctorsData } from '../features/sync/pageRefresh'
import './DoctorReviews.css'
import { AppBar, Badge, Button } from './ui'

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
    <article className="ds-card is-padded reviews-item">
      <div className="reviews-item-top">
        <div>
          <div className="reviews-item-author">
            {item.author}
            {mine ? <Badge tone="primary">You</Badge> : null}
          </div>
          <div className="reviews-item-date">{item.date}</div>
        </div>
        {mine && (
          <div className="reviews-item-actions">
            <Button variant="text" size="sm" onClick={() => onEdit(item)}>Edit</Button>
            <Button variant="text" size="sm" className="reviews-delete" onClick={() => onDelete(item)}>Delete</Button>
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

export default function DoctorReviews() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const doctor = getDoctorById(id)
  const goBack = usePushBack(() => navigate(`/doctor/${id}`, { state: flowState(location) }))
  const [tick, setTick] = useState(0)
  const scrollRef = useRef(null)
  const onRefresh = useCallback(async () => {
    await refreshDoctorsData()
    setTick((n) => n + 1)
  }, [])
  const ptr = usePullToRefresh(scrollRef, onRefresh)
  const items = useMemo(() => getDoctorReviews(id), [id, tick])
  const summary = useMemo(() => getDoctorReviewSummary(id), [id, tick])
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
    if (mine) updateDoctorReview(id, mine.id, { rating: draftRating, text })
    else addDoctorReview(id, { rating: draftRating, text })
    refresh()
  }

  const remove = (item) => {
    deleteDoctorReview(id, item.id)
    if (editingId === item.id) {
      setEditingId(null)
      setDraftText('')
      setDraftRating(5)
    }
    refresh()
  }

  return (
    <div className="ds-page reviews-page">
      <AppBar title="Reviews" onBack={goBack} />

      <div className="reviews-scroll" ref={scrollRef}>
        <PullToRefreshIndicator pull={ptr.pull} refreshing={ptr.refreshing} />
        <div className="ds-card is-padded reviews-summary">
          <div className="reviews-summary-score">{summary.rating || '—'}</div>
          <div>
            <div className="reviews-summary-stars" aria-hidden="true">
              {[1, 2, 3, 4, 5].map((star) => (
                <span key={star} className={star <= Math.round(summary.rating) ? 'is-on' : ''}>★</span>
              ))}
            </div>
            <p>{summary.total} reviews{doctor ? ` for ${doctor.name}` : ''}</p>
          </div>
        </div>

        <section className="ds-card is-padded reviews-compose">
          <h2 className="ds-card__title reviews-compose-title">{mine ? 'Your review' : 'Write a review'}</h2>
          <StarPick value={draftRating} onChange={setDraftRating} />
          <textarea
            className="ds-field is-multiline"
            aria-label="Your review"
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            rows={4}
            placeholder="Share how your visit went"
          />
          <Button size="lg" block className="reviews-save" onClick={save} disabled={!draftText.trim()}>
            {mine ? 'Save changes' : 'Post review'}
          </Button>
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
