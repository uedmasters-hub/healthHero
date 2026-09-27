import { useEffect, useState } from 'react'
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
import { EntityCardSkeletonStack } from '../directory'
import { ProfileHeader } from '../profile/placeProfile'
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

  useEffect(() => {
    getCart().then(setCart).catch((err) => setError(err.message))
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

  return (
    <div className="shop-page">
      <ProfileHeader title="Checkout" onBack={goBack} />
      <div className="shop-page__scroll">
        {!cart ? <EntityCardSkeletonStack count={2} /> : null}
        {cart?.items.map((line) => (
          <p key={line.id} className="shop-copy">{line.quantity} × {line.product?.name} · {formatRupees(line.lineTotal)}</p>
        ))}
        {cart ? <p className="shop-copy">Items {formatRupees(cart.subtotal)}. A delivery fee is added when the order is placed.</p> : null}
        <label className="shop-copy" htmlFor="delivery-note">Delivery note</label>
        <textarea id="delivery-note" className="shop-field" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Landmark or phone for the rider" />
        {needsRx ? (
          <section className="shop-actions" aria-label="Prescription">
            <p className="shop-copy">
              {prescriptionId
                ? 'A prescription is attached to this order.'
                : 'One or more medicines need a prescription. Upload one, or consult a doctor and we will bring you back here.'}
            </p>
            {!prescriptionId ? (
              <>
                <label className="sticky-footer-cta__secondary">
                  Upload from camera or gallery
                  <input type="file" accept="image/*,application/pdf" hidden onChange={onFile} />
                </label>
                <button type="button" className="sticky-footer-cta__secondary" onClick={consult}>Consult a doctor now</button>
              </>
            ) : null}
          </section>
        ) : null}
        {error ? <p className="shop-error" role="alert">{error}</p> : null}
        <button type="button" className="app-flow-cta" disabled={busy || !cart?.items.length || (needsRx && !prescriptionId)} onClick={pay}>
          Pay and place order
        </button>
      </div>
    </div>
  )
}
