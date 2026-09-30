import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePushBack } from '../../features/pushNav'
import { flushCart, refreshCart, useCart } from '../../features/pharmacy/cartStore'
import { formatRupees } from '../../features/pharmacy/shopApi'
import { ProfileHeader } from '../profile/placeProfile'
import { Badge, Button, Callout, Card, EmptyState, Icon, SectionHead, Skeleton, SkeletonText } from '../ui'
import { CartStepper, PriceTag, ProductArt } from './ProductBits'
import '../DoctorProfile.css'
import './PharmacyShop.css'

function CartSkeleton() {
  return (
    <Card padded className="shop-line" aria-hidden="true">
      <Skeleton width="3.5rem" height="3.5rem" />
      <SkeletonText lines={2} />
    </Card>
  )
}

export default function PharmacyCartPage() {
  const navigate = useNavigate()
  const goBack = usePushBack('/pharmacy')
  const cart = useCart()
  const [leaving, setLeaving] = useState(false)

  useEffect(() => { refreshCart() }, [])

  const lines = cart.lines
  const loading = !lines.length && (cart.status === 'idle' || cart.status === 'loading')
  const mrpTotal = lines.reduce((sum, line) => sum + (line.product?.mrp ?? line.product?.price ?? 0) * line.quantity, 0)
  const saving = Math.max(0, mrpTotal - cart.subtotal)
  const needsRx = lines.some((line) => line.product?.requiresPrescription)

  const checkout = async () => {
    setLeaving(true)
    await flushCart()
    navigate('/pharmacy/checkout')
  }

  return (
    <div className="shop-page">
      <ProfileHeader title="Cart" onBack={goBack} />
      <div className="shop-page__scroll has-footer">
        {loading ? <><CartSkeleton /><CartSkeleton /></> : null}
        {cart.status === 'error' && !lines.length ? (
          <p className="ds-page__error" role="alert">{cart.error?.message || 'Your cart could not be loaded.'}</p>
        ) : null}
        {!loading && cart.status !== 'error' && !lines.length ? (
          <EmptyState
            card
            icon={<Icon.Bag />}
            title="Your cart is empty"
            message="Add medicines from a pharmacy to start an order."
            action={<Button variant="secondary" onClick={() => navigate('/pharmacy')}>Browse medicines</Button>}
          />
        ) : null}

        {lines.length ? (
          <section aria-label="Items in your cart" className="shop-stack">
            <SectionHead group as="h2" title={`${cart.count} ${cart.count === 1 ? 'item' : 'items'}`} />
            {lines.map((line) => (
              <Card padded key={line.drugId} className="shop-line ds-enter">
                <button
                  type="button"
                  className="shop-line__open"
                  onClick={() => navigate(`/pharmacy/product/${line.drugId}`)}
                >
                  <ProductArt product={line.product} size="sm" />
                  <span className="shop-line__body">
                    <span className="shop-line__name">{line.product?.name || 'Medicine'}</span>
                    <span className="shop-line__meta">
                      {[line.product?.strength, line.product?.packLabel].filter(Boolean).join(' · ')}
                    </span>
                    {line.product?.requiresPrescription ? <Badge tone="warning">Rx</Badge> : null}
                  </span>
                </button>
                <div className="shop-line__foot">
                  <PriceTag product={line.product} quantity={line.quantity} />
                  <CartStepper product={line.product || { id: line.drugId, stockQty: 99 }} size="sm" />
                </div>
              </Card>
            ))}
          </section>
        ) : null}

        {needsRx ? (
          <Callout tone="warning" icon={<Icon.File />} title="Prescription needed">
            Upload a prescription or consult a doctor at checkout. We bring you back here afterwards.
          </Callout>
        ) : null}

        {lines.length ? (
          <Card as="section" padded className="shop-stack is-tight" aria-label="Bill summary">
            <SectionHead group as="h2" title="Bill summary" />
            <div className="ds-kv"><span className="ds-kv__key">Item total (MRP)</span><span className="ds-kv__value">{formatRupees(mrpTotal)}</span></div>
            {saving ? (
              <div className="ds-kv"><span className="ds-kv__key">Discount</span><span className="ds-kv__value is-positive">−{formatRupees(saving)}</span></div>
            ) : null}
            <div className="ds-kv"><span className="ds-kv__key">Delivery</span><span className="ds-kv__value is-muted">At checkout</span></div>
            <div className="ds-kv is-total"><span className="ds-kv__key">To pay</span><span className="ds-kv__value">{formatRupees(cart.subtotal)}</span></div>
          </Card>
        ) : null}
      </div>
      {lines.length ? (
        <div className="app-flow-footer shop-buybar">
          <span className="shop-buybar__price">
            <span className="shop-buybar__label">{cart.count} {cart.count === 1 ? 'item' : 'items'}</span>
            <span className="shop-price is-md"><span className="shop-price__now">{formatRupees(cart.subtotal)}</span></span>
          </span>
          <Button size="lg" onClick={checkout} loading={leaving} disabled={leaving} trailingIcon={<Icon.ArrowRight />}>
            Checkout
          </Button>
        </div>
      ) : null}
    </div>
  )
}
