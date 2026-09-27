import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePushBack } from '../../features/pushNav'
import { formatRupees, listOrders } from '../../features/pharmacy/shopApi'
import { EntityCardSkeletonStack } from '../directory'
import { ProfileHeader } from '../profile/placeProfile'
import '../DoctorProfile.css'
import './PharmacyShop.css'

export default function PharmacyOrdersPage() {
  const navigate = useNavigate()
  const goBack = usePushBack('/pharmacy')
  const [orders, setOrders] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    listOrders()
      .then(setOrders)
      .catch((err) => setError(err.message))
  }, [])

  return (
    <div className="shop-page">
      <ProfileHeader title="Orders" onBack={goBack} />
      <div className="shop-page__scroll">
        {!orders && !error ? <EntityCardSkeletonStack count={3} /> : null}
        {error ? <p className="shop-error">{error}</p> : null}
        {orders && !orders.length ? <p className="shop-copy">You have no pharmacy orders yet.</p> : null}
        <ul className="shop-list">
          {(orders || []).map((order) => (
            <li key={order.id}>
              <button type="button" className="shop-card ds-interact" onClick={() => navigate(`/pharmacy/orders/${order.id}`)}>
                <span className="shop-card__name">{order.status.replace('_', ' ')}</span>
                <span className="shop-card__meta">{new Date(order.created_at).toLocaleDateString('en-NP', { month: 'short', day: 'numeric' })}</span>
                <span className="shop-card__price">{formatRupees(order.total_amount)}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
