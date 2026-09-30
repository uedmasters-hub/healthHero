/**
 * Commerce building blocks shared by the shop grid, medicine page, rails and
 * cart — one product image, one price treatment, one compact product card.
 */
import { useState } from 'react'
import { useCartItem, CART_MAX_QTY } from '../../features/pharmacy/cartStore'
import { discountPercent, formatRupees } from '../../features/pharmacy/shopApi'
import { Badge, QuantityStepper, cx } from '../ui'
import { PharmacyIcon } from './PharmacyIcons'

const LIQUID_FORMS = ['liquid', 'spray', 'drops', 'syrup', 'solution', 'juice', 'ointment', 'paste']

export function productIcon(product) {
  const form = String(product?.form || '').toLowerCase()
  const klass = String(product?.drugClass || '').toLowerCase()
  if (product?.category === 'equipment' || form === 'device') return 'device'
  if (klass === 'ayurveda' || klass === 'homeopathy') return 'leaf'
  if (LIQUID_FORMS.some((item) => form.includes(item))) return 'bottle'
  return 'pill'
}

/** Pack shot when the catalog has one; otherwise an illustrated tile. */
export function ProductArt({ product, size = 'md', className = '' }) {
  const [broken, setBroken] = useState(false)
  const iconSize = size === 'lg' ? 56 : size === 'sm' ? 20 : 28
  return (
    <span className={cx('shop-art', `is-${size}`, className)} aria-hidden="true">
      {product?.imageUrl && !broken ? (
        <img src={product.imageUrl} alt="" loading="lazy" onError={() => setBroken(true)} />
      ) : (
        <PharmacyIcon name={productIcon(product)} size={iconSize} />
      )}
    </span>
  )
}

/** Selling price, struck MRP and the saving — the same everywhere. */
export function PriceTag({ product, size = 'md', quantity = 1, showSaving = true, className = '' }) {
  if (product?.price == null) {
    return <span className={cx('shop-price', `is-${size}`, className)}>Price at checkout</span>
  }
  const off = discountPercent(product)
  return (
    <span className={cx('shop-price', `is-${size}`, className)}>
      <span className="shop-price__now">{formatRupees(product.price * quantity)}</span>
      {off ? (
        <>
          <s className="shop-price__mrp">
            <span className="sr-only">MRP </span>
            {formatRupees(product.mrp * quantity)}
          </s>
          {showSaving ? <span className="shop-price__off">{off}% off</span> : null}
        </>
      ) : null}
    </span>
  )
}

/** Stepper bound to the global cart, with an inline error if a write fails. */
export function CartStepper({ product, size = 'md', block = false, addLabel = 'Add', className = '' }) {
  const [quantity, setQuantity] = useCartItem(product)
  const [error, setError] = useState('')
  const out = !product || product.stockQty < 1
  const change = async (next) => {
    setError('')
    const result = await setQuantity(next)
    if (!result.ok) setError(result.error?.message || 'Your cart could not be updated.')
  }
  return (
    <>
      <QuantityStepper
        value={quantity}
        onChange={change}
        max={Math.max(1, Math.min(CART_MAX_QTY, product?.stockQty || CART_MAX_QTY))}
        size={size}
        block={block}
        addLabel={addLabel}
        itemLabel={product?.name || 'item'}
        disabled={out}
        disabledLabel="Out of stock"
        className={className}
      />
      {error ? <p className="shop-inline-error" role="alert">{error}</p> : null}
    </>
  )
}

/** Compact card for rails (alternatives, other brands, bought together). */
export function ProductMiniCard({ product, onOpen, meta }) {
  return (
    <article className="shop-mini ds-card is-compact">
      <button type="button" className="shop-mini__open" onClick={() => onOpen(product.id)}>
        <ProductArt product={product} size="sm" />
        <span className="shop-mini__body">
          <span className="shop-mini__name">{product.name}</span>
          <span className="shop-mini__meta">{meta || [product.strength, product.packLabel].filter(Boolean).join(' · ')}</span>
        </span>
      </button>
      <div className="shop-mini__foot">
        <PriceTag product={product} size="sm" />
        {product.requiresPrescription ? <Badge tone="warning">Rx</Badge> : null}
      </div>
      <CartStepper product={product} size="sm" block />
    </article>
  )
}

const TRUST = [
  { icon: 'shield', title: '100% Genuine', detail: 'Medicines' },
  { icon: 'truck', title: 'Fast Delivery', detail: 'on Time' },
  { icon: 'return', title: 'Easy Returns', detail: 'Hassle Free' },
  { icon: 'lock', title: 'Secure Payment', detail: 'Safe & Trusted' },
]

/** Four-up reassurance strip — shop aisle and medicine page. */
export function TrustStrip({ className = '' }) {
  return (
    <ul className={cx('shop-trust', className)}>
      {TRUST.map((item) => (
        <li key={item.title}>
          <span className="ds-icon-well shop-trust__icon" aria-hidden="true">
            <PharmacyIcon name={item.icon} size={16} />
          </span>
          <span className="shop-trust__title">{item.title}</span>
          <span className="shop-trust__detail">{item.detail}</span>
        </li>
      ))}
    </ul>
  )
}
