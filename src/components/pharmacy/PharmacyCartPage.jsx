import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePushBack } from '../../features/pushNav'
import { formatRupees, getCart, setCartQuantity } from '../../features/pharmacy/shopApi'
import { EntityCardSkeletonStack } from '../directory'
import { ProfileHeader } from '../profile/placeProfile'
import '../DoctorProfile.css'
import './PharmacyShop.css'

export default function PharmacyCartPage() {
  const navigate = useNavigate()
  const goBack = usePushBack('/pharmacy')
  const [cart, setCart] = useState(null)
  const [error, setError] = useState('')

  const load = () => {
    getCart()
      .then((next) => { setCart(next); setError('') })
      .catch((err) => setError(err.message))
  }

  useEffect(() => { load() }, [])

  return (
    <div className="shop-page">
      <ProfileHeader title="Cart" onBack={goBack} />
      <div className="shop-page__scroll">
        {!cart && !error ? <EntityCardSkeletonStack count={2} /> : null}
        {error ? <p className="shop-error">{error}</p> : null}
        {cart && !cart.items.length ? <p className="shop-copy">Your cart is empty.</p> : null}
        {cart?.items.map((line) => (
          <article key={line.id} className="shop-card ds-card-flat">
            <span className="shop-card__name">{line.product?.name || 'Medicine'}</span>
            <span className="shop-card__price">{formatRupees(line.lineTotal)}</span>
            <div className="shop-qty">
              <button type="button" className="ds-icon-btn is-subtle" aria-label="Decrease quantity" onClick={() => setCartQuantity(line.id, line.quantity - 1).then(load)}>−</button>
              <span>{line.quantity}</span>
              <button type="button" className="ds-icon-btn is-subtle" aria-label="Increase quantity" onClick={() => setCartQuantity(line.id, line.quantity + 1).then(load)}>+</button>
            </div>
          </article>
        ))}
        {cart?.items.length ? (
          <>
            <p className="shop-copy">Subtotal {formatRupees(cart.subtotal)}. Delivery is added at checkout.</p>
            <button type="button" className="app-flow-cta" onClick={() => navigate('/pharmacy/checkout')}>Checkout</button>
          </>
        ) : null}
      </div>
    </div>
  )
}
