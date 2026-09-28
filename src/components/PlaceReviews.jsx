import { useLocation, useParams } from 'react-router-dom'
import { placeReviewKey } from '../data/reviews'
import ReviewsScreen from './reviews/ReviewsScreen'

function EntityReviews({ reviewKey, backTo }) {
  const location = useLocation()
  return <ReviewsScreen reviewKey={reviewKey} backTo={backTo} subjectName={location.state?.subjectName || ''} />
}

export function PharmacyReviewsPage() {
  const { pharmacyId } = useParams()
  return <EntityReviews reviewKey={placeReviewKey('pharmacy', pharmacyId)} backTo={`/pharmacy/${pharmacyId}`} />
}

export function FacilityReviewsPage() {
  const { centerId } = useParams()
  return <EntityReviews reviewKey={placeReviewKey('facility', centerId)} backTo={`/centers/${centerId}`} />
}
