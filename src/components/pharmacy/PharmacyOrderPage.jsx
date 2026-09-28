import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { usePushBack } from '../../features/pushNav'
import { formatRupees, getOrder, reorder } from '../../features/pharmacy/shopApi'
import { EntityCardSkeletonStack } from '../directory'
import { ProfileHeader } from '../profile/placeProfile'
import '../DoctorProfile.css'
import '../Services.css'
import './PharmacyShop.css'

function when(value) {
  if (!value) return ''
  return new Date(value).toLocaleString('en-NP', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function PharmacyOrderPage() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const goBack = usePushBack('/pharmacy/orders')
  const [detail, setDetail] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    getOrder(orderId)
      .then((row) => { if (!cancelled) setDetail(row || { missing: true }) })
      .catch((err) => { if (!cancelled) setError(err.message) })
    return () => { cancelled = true }
  }, [orderId])

  const onReorder = async () => {
    setBusy(true)
    try {
      await reorder(orderId)
      navigate('/pharmacy/cart')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const order = detail?.order

  return (
    <div className="shop-page">
      <ProfileHeader title="Order" onBack={goBack} />
      <div className="shop-page__scroll">
        {!detail && !error ? <EntityCardSkeletonStack count={3} /> : null}
        {error ? <p className="ds-page__error shop-error" role="alert">{error}</p> : null}
        {detail?.missing ? <p className="shop-copy">This order is not on your account.</p> : null}
        {order ? (
          <>
            <h2 className="ds-heading shop-title">{order.status.replace('_', ' ')}</h2>
            <p className="shop-copy">
              {order.estimated_delivery
                ? `Estimated delivery ${when(order.estimated_delivery)}`
                : 'Delivery update will appear here.'}
            </p>
            <ul className="shop-timeline">
              {(detail.events.length ? detail.events : [{ id: 'status', status: order.status, note: 'Order received', created_at: order.created_at }]).map((event) => (
                <li key={event.id}>
                  <strong>{event.status.replace('_', ' ')}</strong>
                  <p className="shop-copy">{event.note}</p>
                  <p className="shop-card__meta">{when(event.created_at)}</p>
                </li>
              ))}
            </ul>
            {detail.items.map((item) => (
              <p key={item.id} className="shop-copy">
                {item.quantity} × {item.drugs?.name || 'Item'} · {formatRupees(item.total_price)}
              </p>
            ))}
            <p className="shop-copy">Total {formatRupees(order.total_amount)} including delivery {formatRupees(order.delivery_fee)}</p>
            {detail.invoice ? (
              <section>
                <h2 className="ds-section-head__title">Invoice</h2>
                <p className="shop-copy">{detail.invoice.invoice_number} · {detail.invoice.status} · {formatRupees(detail.invoice.total_amount)}</p>
              </section>
            ) : null}
            <button type="button" className="app-flow-cta" disabled={busy} onClick={onReorder}>Reorder</button>
          </>
        ) : null}
      </div>
    </div>
  )
}
