import { useParams } from 'react-router-dom'
import { getDoctorById } from '../data/doctors'
import { refreshDoctorsData } from '../features/sync/pageRefresh'
import ReviewsScreen from './reviews/ReviewsScreen'

export default function DoctorReviews() {
  const { id } = useParams()
  const doctor = getDoctorById(id)
  return (
    <ReviewsScreen
      reviewKey={id}
      backTo={`/doctor/${id}`}
      subjectName={doctor?.name || ''}
      onRefreshData={refreshDoctorsData}
    />
  )
}
