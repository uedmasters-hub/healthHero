import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePushBack } from '../../features/pushNav'
import { formatRupees, listOrders } from '../../features/pharmacy/shopApi'
import { EntityCardSkeletonStack } from '../directory'
import { ProfileHeader } from '../profile/placeProfile'
import '../DoctorProfile.css'
import './PharmacyShop.css'
import { EmptyState } from '../ui'

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
        {error ? <p className="ds-page__error shop-error" role="alert">{error}</p> : null}
        {orders && !orders.length ? <EmptyState title="No orders yet" message="Medicines you order from nearby pharmacies will appear here." /> : null}
        <ul className="shop-list">
          {(orders || []).map((order) => (
            <li key={order.id}>
              <button type="button" className="shop-card ds-card is-compact is-interactive" onClick={() => navigate(`/pharmacy/orders/${order.id}`)}>
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
