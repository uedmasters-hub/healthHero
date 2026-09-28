import { useLocation, useNavigate } from 'react-router-dom'
import { useCartCount } from '../../features/pharmacy/cartStore'
import { CountBadge, Icon, IconButton, cx } from '../ui'

/**
 * Header cart for every pharmacy screen. Bound to the global cart store, so
 * the badge moves on the same frame as any stepper tap. Stays out of the way
 * until the cart has something in it (pass `always` to keep it visible).
 */
export default function CartButton({ always = false, className = '' }) {
  const count = useCartCount()
  const navigate = useNavigate()
  const location = useLocation()
  if (!count && !always) return null
  return (
    <IconButton
      tone="subtle"
      size="md"
      className={cx('ds-icon-btn--count ds-fade-in', className)}
      label={count ? `Cart, ${count} ${count === 1 ? 'item' : 'items'}` : 'Cart'}
      onClick={() => navigate('/pharmacy/cart', { state: { from: location.pathname } })}
    >
      <Icon.Bag />
      <CountBadge count={count} />
    </IconButton>
  )
}
