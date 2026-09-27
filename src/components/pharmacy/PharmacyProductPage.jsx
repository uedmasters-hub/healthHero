import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { usePushBack } from '../../features/pushNav'
import { flowState } from '../../lib/careFlow'
import {
  addToCart,
  formatEta,
  formatRupees,
  getProduct,
  savePharmacyResume,
  stockLabel,
  uploadPrescription,
} from '../../features/pharmacy/shopApi'
import { EntityCardSkeleton } from '../directory'
import { ProfileHeader } from '../profile/placeProfile'
import '../DoctorProfile.css'
import './PharmacyShop.css'

export default function PharmacyProductPage() {
  const { productId } = useParams()
  const navigate = useNavigate()
  const goBack = usePushBack('/pharmacy')
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [qty, setQty] = useState(1)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getProduct(productId)
      .then((row) => {
        if (!cancelled) {
          setProduct(row)
          setError(row ? '' : 'This product is no longer listed.')
        }
      })
      .catch((err) => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [productId])

  const add = async () => {
    if (!product || product.stockQty < 1) return
    setBusy(true)
    setNotice('')
    try {
      await addToCart(product.id, qty)
      setNotice('Added to your cart.')
    } catch (err) {
      setNotice(err.message)
    } finally {
      setBusy(false)
    }
  }

  const consult = () => {
    if (!product) return
    savePharmacyResume({
      drugs: [{ id: product.id, name: product.name, strength: product.strength, quantity: qty }],
    })
    navigate('/booking', {
      state: flowState(null, {
        origin: 'pharmacy',
        returnTo: '/pharmacy/checkout',
        entryReturnTo: `/pharmacy/product/${product.id}`,
      }),
    })
  }

  const onFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !product) return
    setBusy(true)
    setNotice('')
    try {
      const prescriptionId = await uploadPrescription({
        file,
        drugs: [{ id: product.id, name: product.name, strength: product.strength, quantity: qty }],
      })
      await addToCart(product.id, qty)
      navigate('/pharmacy/checkout', { state: { prescriptionId } })
    } catch (err) {
      setNotice(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="shop-page">
      <ProfileHeader title="Product" onBack={goBack} />
      <div className="shop-page__scroll">
        {loading ? <EntityCardSkeleton /> : null}
        {!loading && error ? <p className="shop-error">{error}</p> : null}
        {product ? (
          <>
            <h2 className="shop-title">{product.name}</h2>
            <p className="shop-copy">
              {[product.genericName, product.strength, product.form, product.manufacturer].filter(Boolean).join(' · ')}
            </p>
            {product.description ? <p className="shop-copy">{product.description}</p> : null}
            <p className="shop-card__price">{product.price == null ? 'Price at checkout' : formatRupees(product.price)}</p>
            <p className="shop-copy">{stockLabel(product.stockQty)} · {formatEta(product.etaMinutes)}</p>
            {product.requiresPrescription ? (
              <p className="shop-pill">Prescription required</p>
            ) : (
              <p className="shop-copy">Over the counter. You can buy this now.</p>
            )}
            <div className="shop-qty" aria-label="Quantity">
              <button type="button" className="ds-icon-btn is-subtle" onClick={() => setQty((value) => Math.max(1, value - 1))} aria-label="Decrease quantity">−</button>
              <span>{qty}</span>
              <button type="button" className="ds-icon-btn is-subtle" onClick={() => setQty((value) => value + 1)} aria-label="Increase quantity">+</button>
            </div>
            <div className="shop-actions">
              <button type="button" className="app-flow-cta" disabled={busy || product.stockQty < 1} onClick={add}>
                {product.stockQty < 1 ? 'Out of stock' : 'Add to cart'}
              </button>
              {product.requiresPrescription ? (
                <>
                  <label className="sticky-footer-cta__secondary">
                    Upload from camera or gallery
                    <input type="file" accept="image/*,application/pdf" capture="environment" hidden onChange={onFile} />
                  </label>
                  <button type="button" className="sticky-footer-cta__secondary" onClick={consult}>Consult a doctor now</button>
                </>
              ) : null}
            </div>
            {notice ? <p className="shop-copy" role="status">{notice}</p> : null}
          </>
        ) : null}
      </div>
    </div>
  )
}
