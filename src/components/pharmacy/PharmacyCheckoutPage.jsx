import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { usePushBack } from '../../features/pushNav'
import { flowState } from '../../lib/careFlow'
import {
  formatRupees,
  getCart,
  placeOrder,
  savePharmacyResume,
  uploadPrescription,
} from '../../features/pharmacy/shopApi'
import { flushCart } from '../../features/pharmacy/cartStore'
import { useRequirePatient } from '../../features/guest/requireIdentity'
import { saveGuestCartSnapshot } from '../../features/guest/activity'
import { useAuth } from '../../features/auth/hooks/useAuth'
import { EntityCardSkeletonStack } from '../directory'
import { ProfileHeader } from '../profile/placeProfile'
import { Badge, Button, Callout, Card, FormGroup, Icon, SectionHead } from '../ui'
import { ProductArt } from './ProductBits'
import '../DoctorProfile.css'
import './PharmacyShop.css'

export default function PharmacyCheckoutPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const goBack = usePushBack('/pharmacy/cart')
  const [cart, setCart] = useState(null)
  const [note, setNote] = useState('')
  const [prescriptionId, setPrescriptionId] = useState(location.state?.prescriptionId || null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const fileRef = useRef(null)
  const requirePatient = useRequirePatient()
  const { user } = useAuth()

  useEffect(() => {
    // Commit any in-flight stepper taps before reading the order lines.
    flushCart()
      .then(getCart)
      .then(setCart)
      .catch((err) => setError(err.message))
  }, [])

  const rxLines = (cart?.items || []).filter((line) => line.product?.requiresPrescription)
  const needsRx = rxLines.length > 0

  const consult = () => {
    const drugs = rxLines.map((line) => ({
      id: line.drugId,
      name: line.product?.name,
      strength: line.product?.strength,
      quantity: line.quantity,
    }))
    savePharmacyResume({ drugs })
    navigate('/booking', {
      state: flowState(location, {
        origin: 'pharmacy',
        returnTo: '/pharmacy/checkout',
        entryReturnTo: '/pharmacy/checkout',
      }),
    })
  }

  const onFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const allowed = await requirePatient('prescription_upload', {
      lines: rxLines.map((line) => line.drugId),
    })
    if (!allowed) return
    setBusy(true)
    setError('')
    try {
      const id = await uploadPrescription({
        file,
        drugs: rxLines.map((line) => ({
          id: line.drugId,
          name: line.product?.name,
          strength: line.product?.strength,
          quantity: line.quantity,
        })),
      })
      setPrescriptionId(id)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const pay = async () => {
    saveGuestCartSnapshot(cart?.items || [], user?.id)
    const allowed = await requirePatient('pharmacy_order', {
      count: cart?.count || 0,
      note: note || null,
    })
    if (!allowed) return
    setBusy(true)
    setError('')
    try {
      const orderId = await placeOrder({ note, prescriptionId: needsRx ? prescriptionId : null })
      navigate(`/pharmacy/orders/${orderId}`, { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const rxAttached = Boolean(prescriptionId)
  const mrpTotal = (cart?.items || []).reduce((sum, line) => sum + (line.product?.mrp ?? line.product?.price ?? 0) * line.quantity, 0)
  const saving = cart ? Math.max(0, mrpTotal - cart.subtotal) : 0

  return (
    <div className="shop-page">
      <ProfileHeader title="Checkout" onBack={goBack} />
      <div className="shop-page__scroll has-footer">
        {!cart && !error ? <EntityCardSkeletonStack count={2} /> : null}

        {cart?.items.length ? (
          <Card as="section" padded className="shop-stack is-tight ds-enter" aria-label="Order items">
            <SectionHead group as="h2" title={`${cart.count} ${cart.count === 1 ? 'item' : 'items'}`} />
            {cart.items.map((line) => (
              <div key={line.id} className="shop-line__open is-static">
                <ProductArt product={line.product} size="sm" />
                <span className="shop-line__body">
                  <span className="shop-line__name">{line.product?.name || 'Medicine'}</span>
                  <span className="shop-line__meta">Qty {line.quantity} · {formatRupees(line.lineTotal)}</span>
                  {line.product?.requiresPrescription ? <Badge tone="warning">Rx</Badge> : null}
                </span>
              </div>
            ))}
          </Card>
        ) : null}

        {needsRx ? (
          <Card as="section" padded className="shop-stack is-tight ds-enter" aria-label="Prescription">
            <Callout
              tone={rxAttached ? 'success' : 'warning'}
              icon={rxAttached ? <Icon.Check /> : <Icon.File />}
              title={rxAttached ? 'Prescription attached' : 'Prescription required'}
            >
              {rxAttached
                ? 'A pharmacist reviews it before your order is dispatched.'
                : 'One or more medicines need a prescription. Upload one, or consult a doctor and we will bring you back here.'}
            </Callout>
            {!rxAttached ? (
              <>
                <Button variant="secondary" block icon={<Icon.Upload />} disabled={busy} onClick={() => fileRef.current?.click()}>
                  Upload from camera or gallery
                </Button>
                <input ref={fileRef} type="file" accept="image/*,application/pdf" hidden onChange={onFile} />
                <Button variant="text" block icon={<Icon.Video />} onClick={consult}>Consult a doctor now</Button>
              </>
            ) : null}
          </Card>
        ) : null}

        <FormGroup label="Delivery note" htmlFor="delivery-note" hint="A landmark or a phone number for the rider.">
          <textarea id="delivery-note" className="ds-field is-multiline" rows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Near the blue gate, call on arrival" />
        </FormGroup>

        {cart?.items.length ? (
          <Card as="section" padded className="shop-stack is-tight" aria-label="Bill summary">
            <SectionHead group as="h2" title="Bill summary" />
            <div className="ds-kv"><span className="ds-kv__key">Item total (MRP)</span><span className="ds-kv__value">{formatRupees(mrpTotal)}</span></div>
            {saving ? <div className="ds-kv"><span className="ds-kv__key">Discount</span><span className="ds-kv__value is-positive">−{formatRupees(saving)}</span></div> : null}
            <div className="ds-kv"><span className="ds-kv__key">Delivery</span><span className="ds-kv__value is-muted">Added when the order is placed</span></div>
            <div className="ds-kv is-total"><span className="ds-kv__key">Items</span><span className="ds-kv__value">{formatRupees(cart.subtotal)}</span></div>
          </Card>
        ) : null}

        {error ? <p className="ds-page__error" role="alert">{error}</p> : null}
      </div>
      <div className="app-flow-footer shop-buybar">
        <span className="shop-buybar__price">
          <span className="shop-buybar__label">Items total</span>
          <span className="shop-price is-md"><span className="shop-price__now">{formatRupees(cart?.subtotal || 0)}</span></span>
        </span>
        <Button size="lg" loading={busy} disabled={busy || !cart?.items.length || (needsRx && !prescriptionId)} onClick={pay}>
          Place order
        </Button>
      </div>
    </div>
  )
}
