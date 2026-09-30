import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { usePushBack } from '../../features/pushNav'
import { flowState } from '../../lib/careFlow'
import { flushCart, setCartQuantity, useCartItem } from '../../features/pharmacy/cartStore'
import {
  formatEta,
  formatRupees,
  getProductDetail,
  savePharmacyResume,
  stockLabel,
  uploadPrescription,
} from '../../features/pharmacy/shopApi'
import { ProfileHeader } from '../profile/placeProfile'
import {
  Badge, Button, Callout, Card, Chip, ChipRow, EmptyState, Icon, IconButton, InfoCell, InfoGrid,
  SectionHead, Skeleton, SkeletonText,
} from '../ui'
import CartButton from './CartButton'
import { PharmacyIcon } from './PharmacyIcons'
import { CartStepper, PriceTag, ProductArt, ProductMiniCard, TrustStrip } from './ProductBits'
import '../DoctorProfile.css'
import './PharmacyShop.css'

/* One tab per monograph field, in the order a pharmacist would read them. */
const INFO_TABS = [
  { id: 'dosage', label: 'Dosage' },
  { id: 'side_effects', label: 'Side Effects' },
  { id: 'salt', label: 'Salt Composition' },
  { id: 'uses', label: 'Uses' },
  { id: 'warnings', label: 'Warnings' },
  { id: 'precautions', label: 'Precautions' },
  { id: 'interactions', label: 'Drug Interactions' },
  { id: 'how_to_take', label: 'How to Take', deviceLabel: 'How to Use' },
  { id: 'storage', label: 'Storage' },
]

/* Honest fallbacks — never invent clinical detail the catalog does not hold. */
const FALLBACK = {
  dosage: 'Use the dose on the pack label or the one your doctor prescribed. Ask the pharmacist if you are unsure.',
  side_effects: 'No side effects are listed for this product. Stop using it and speak to a doctor if you notice anything unusual.',
  uses: 'Ask the pharmacist whether this product suits your needs.',
  warnings: 'Read the pack label before use. Keep out of reach of children.',
  precautions: 'Tell your doctor or pharmacist if you are pregnant, breastfeeding, or have a long-term condition.',
  interactions: 'No interactions are listed. Tell your doctor or pharmacist about every medicine and supplement you take.',
  how_to_take: 'Follow the directions on the pack, or the ones your doctor gave you.',
  storage: 'Store in a cool, dry place away from direct sunlight. Keep out of reach of children.',
}

function tabContent(product, id) {
  if (id === 'salt') {
    if (!product.saltComposition) return null
    return [
      [product.saltComposition, product.strength].filter(Boolean).join(' '),
      product.form ? `Form: ${product.form}` : null,
    ].filter(Boolean)
  }
  if (product.monograph[id]) return product.monograph[id]
  if (id === 'uses' && product.description) return [product.description]
  return null
}

function PageSkeleton() {
  return (
    <div className="shop-pdp__body" aria-hidden="true">
      <Card padded className="shop-pdp__media"><Skeleton width="13rem" height="13rem" /></Card>
      <SkeletonText lines={3} />
      <Skeleton width="40%" height="2rem" />
      <Card padded><SkeletonText lines={4} /></Card>
    </div>
  )
}

function Rail({ title, sub, products, onOpen }) {
  if (!products?.length) return null
  return (
    <section className="shop-pdp__section ds-enter" aria-label={title}>
      <SectionHead title={title} sub={sub} />
      <div className="shop-rail-row">
        {products.map((row) => <ProductMiniCard key={row.id} product={row} onOpen={onOpen} />)}
      </div>
    </section>
  )
}

function DrugInformation({ product }) {
  // Devices and household hygiene products are not medicines: they show only
  // the tabs that apply to them. Medicines always show all nine.
  const isDevice = product.category === 'equipment' || /hygiene/i.test(product.drugClass || '')
  const tabs = INFO_TABS
    .map((tab) => ({ ...tab, label: isDevice && tab.deviceLabel ? tab.deviceLabel : tab.label, items: tabContent(product, tab.id) }))
    .filter((tab) => !isDevice || tab.items)
  const [active, setActive] = useState(tabs[0]?.id)
  const tabRefs = useRef({})
  const baseId = useId()
  if (!tabs.length) return null
  const current = tabs.find((tab) => tab.id === active) || tabs[0]
  const items = current.items || [FALLBACK[current.id] || FALLBACK.how_to_take]

  const onKeyDown = (event) => {
    const index = tabs.findIndex((tab) => tab.id === current.id)
    const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key]
    let next = null
    if (step) next = tabs[(index + step + tabs.length) % tabs.length]
    if (event.key === 'Home') next = tabs[0]
    if (event.key === 'End') next = tabs[tabs.length - 1]
    if (!next) return
    event.preventDefault()
    setActive(next.id)
    tabRefs.current[next.id]?.focus()
  }

  return (
    <Card as="section" className="shop-pdp__info ds-enter" aria-labelledby={`${baseId}-title`}>
      <div className="shop-pdp__info-head">
        <SectionHead title={isDevice ? 'Product information' : 'Drug information'} as="h2" id={`${baseId}-title`} />
      </div>
      <ChipRow role="tablist" aria-label="Drug information" className="shop-pdp__tabs" onKeyDown={onKeyDown}>
        {tabs.map((tab) => (
          <Chip
            key={tab.id}
            ref={(node) => { tabRefs.current[tab.id] = node }}
            role="tab"
            id={`${baseId}-tab-${tab.id}`}
            aria-selected={tab.id === current.id}
            aria-pressed={undefined}
            aria-controls={`${baseId}-panel`}
            tabIndex={tab.id === current.id ? 0 : -1}
            onClick={() => setActive(tab.id)}
          >
            {tab.label}
          </Chip>
        ))}
      </ChipRow>
      <Card
        muted
        padded
        key={current.id}
        role="tabpanel"
        id={`${baseId}-panel`}
        aria-labelledby={`${baseId}-tab-${current.id}`}
        className="shop-pdp__panel ds-fade-in"
      >
        <h3 className="shop-pdp__panel-title">{current.label}</h3>
        {items.length > 1 ? (
          <ul className="shop-pdp__points">{items.map((item) => <li key={item}>{item}</li>)}</ul>
        ) : (
          <p className="shop-pdp__copy">{items[0]}</p>
        )}
        {!current.items ? <p className="shop-pdp__note">General guidance — this product has no specific entry yet.</p> : null}
      </Card>
    </Card>
  )
}

function Prescription({ product, busy, onUpload, onConsult }) {
  const [route, setRoute] = useState('upload')
  const fileRef = useRef(null)
  if (!product.requiresPrescription) {
    return (
      <Callout tone="success" icon={<Icon.Check />} title="No prescription needed">
        Over the counter — add it to your cart and check out.
      </Callout>
    )
  }
  return (
    <Card as="section" padded className="shop-pdp__rx ds-enter" aria-label="Prescription">
      <Callout tone="warning" icon={<PharmacyIcon name="rx" size={20} />} title="Prescription required">
        A pharmacist checks a valid prescription before this medicine is dispatched.
      </Callout>
      <div className="ds-segmented" role="group" aria-label="Do you have a prescription?">
        {[['upload', 'I have one'], ['consult', 'I need one']].map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={route === id}
            className="ds-segmented__item"
            onClick={() => setRoute(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {route === 'upload' ? (
        <div className="shop-pdp__rx-body ds-fade-in">
          <p className="shop-pdp__copy">Upload a photo or PDF. We add this medicine to your cart and take you to checkout.</p>
          <Button variant="secondary" block icon={<Icon.Upload />} loading={busy} disabled={busy} onClick={() => fileRef.current?.click()}>
            Upload from camera or gallery
          </Button>
          <input ref={fileRef} type="file" accept="image/*,application/pdf" capture="environment" hidden onChange={onUpload} />
        </div>
      ) : (
        <div className="shop-pdp__rx-body ds-fade-in">
          <p className="shop-pdp__copy">Book a consultation now. If the doctor prescribes it, we bring you back to checkout.</p>
          <Button variant="secondary" block icon={<Icon.Video />} onClick={onConsult}>Consult a doctor now</Button>
        </div>
      )}
    </Card>
  )
}

export default function PharmacyProductPage() {
  const { productId } = useParams()
  const navigate = useNavigate()
  const goBack = usePushBack('/pharmacy')
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const scrollRef = useRef(null)
  const product = detail?.product || null
  const [quantity] = useCartItem(product)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setNotice('')
    scrollRef.current?.scrollTo({ top: 0 })
    getProductDetail(productId)
      .then((next) => {
        if (cancelled) return
        setDetail(next)
        setError(next ? '' : 'This medicine is no longer listed.')
      })
      .catch((err) => { if (!cancelled) setError(err.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [productId])

  const open = (id) => navigate(`/pharmacy/product/${id}`)
  const rxQuantity = Math.max(1, quantity)
  const facts = useMemo(() => {
    if (!product) return []
    return [
      { icon: 'pill', label: 'Form', value: product.form },
      { icon: 'plus', label: 'Strength', value: product.strength },
      { icon: 'bottle', label: 'Pack size', value: product.packLabel },
      { icon: 'building', label: 'Manufacturer', value: product.manufacturer },
    ].filter((fact) => fact.value)
  }, [product])

  const share = async () => {
    const url = window.location.href
    try {
      if (navigator.share) await navigator.share({ title: product.name, url })
      else {
        await navigator.clipboard.writeText(url)
        setNotice('Link copied.')
      }
    } catch {
      /* dismissed */
    }
  }

  const consult = () => {
    savePharmacyResume({
      drugs: [{ id: product.id, name: product.name, strength: product.strength, quantity: rxQuantity }],
    })
    navigate('/booking', {
      state: flowState(null, {
        origin: 'pharmacy',
        returnTo: '/pharmacy/checkout',
        entryReturnTo: `/pharmacy/product/${product.id}`,
      }),
    })
  }

  const onUpload = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !product) return
    setBusy(true)
    setNotice('')
    try {
      const prescriptionId = await uploadPrescription({
        file,
        drugs: [{ id: product.id, name: product.name, strength: product.strength, quantity: rxQuantity }],
      })
      const result = await setCartQuantity(product, rxQuantity)
      if (!result.ok) throw result.error
      await flushCart()
      navigate('/pharmacy/checkout', { state: { prescriptionId } })
    } catch (err) {
      setNotice(err.message)
    } finally {
      setBusy(false)
    }
  }

  const stock = product ? stockLabel(product.stockQty) : ''
  const stockTone = !product || product.stockQty <= 0 ? 'danger' : product.stockQty < 8 ? 'warning' : 'success'

  return (
    <div className="shop-page shop-pdp">
      <ProfileHeader
        title={product?.category === 'equipment' ? 'Product' : 'Medicine'}
        onBack={goBack}
        actions={(
          <>
            {product ? <IconButton tone="subtle" size="md" label="Share" onClick={share}><Icon.Share /></IconButton> : null}
            <CartButton />
          </>
        )}
      />
      <div className="shop-page__scroll has-footer" ref={scrollRef}>
        {loading && !product ? <PageSkeleton /> : null}
        {!loading && error ? (
          <EmptyState
            card
            icon={<Icon.Pill />}
            title={error}
            action={<Button variant="secondary" onClick={() => navigate('/pharmacy')}>Browse medicines</Button>}
          />
        ) : null}

        {product ? (
          <div className="shop-pdp__body" key={product.id}>
            {/* —— Hero ——————————————————————————————————————————— */}
            <section className="shop-pdp__hero ds-enter" aria-labelledby="pdp-name">
              <Card padded className="shop-pdp__media">
                <ProductArt product={product} size="lg" />
              </Card>
              <div className="ds-chip-row is-wrap shop-pdp__badges">
                <Badge tone={product.requiresPrescription ? 'warning' : 'success'}>
                  {product.requiresPrescription ? 'Rx · Prescription' : 'OTC'}
                </Badge>
                {product.drugClass ? <Badge tone="neutral">{product.drugClass}</Badge> : null}
                {product.category === 'equipment' ? <Badge tone="info">Health device</Badge> : null}
              </div>
              <div className="shop-pdp__titles">
                <h2 className="shop-pdp__name" id="pdp-name">{product.name}</h2>
                {product.saltComposition ? <p className="shop-pdp__salt">{product.saltComposition}</p> : null}
                {product.manufacturer ? <p className="shop-pdp__maker">By {product.manufacturer}</p> : null}
              </div>
              <div className="shop-pdp__price">
                <PriceTag product={product} size="lg" />
                <span className="shop-pdp__per">
                  {product.packLabel ? `Price for ${product.packLabel}` : 'Price per pack'}
                </span>
              </div>
              <div className="shop-pdp__status">
                <Badge tone={stockTone}>{stock}</Badge>
                <span className="shop-pdp__eta">
                  <PharmacyIcon name="truck" size={16} />
                  {formatEta(product.etaMinutes)}
                </span>
              </div>
            </section>

            {/* —— Variants ——————————————————————————————————————— */}
            {detail.strengths.length ? (
              <section className="shop-pdp__section ds-enter" aria-label="Available strengths">
                <SectionHead group as="h2" title="Available strengths" />
                <ChipRow label="Available strengths" className="is-wrap">
                  {detail.strengths.map((row) => (
                    <Chip
                      key={row.id}
                      selected={row.id === product.id}
                      disabled={row.stockQty < 1 && row.id !== product.id}
                      onClick={() => row.id !== product.id && navigate(`/pharmacy/product/${row.id}`, { replace: true })}
                    >
                      {row.strength}
                    </Chip>
                  ))}
                </ChipRow>
              </section>
            ) : null}

            {facts.length ? (
              <Card padded className="ds-enter">
                <InfoGrid>
                  {facts.map((fact) => (
                    <InfoCell key={fact.label} icon={<PharmacyIcon name={fact.icon} size={18} />} label={fact.label} value={fact.value} />
                  ))}
                </InfoGrid>
              </Card>
            ) : null}

            <Prescription product={product} busy={busy} onUpload={onUpload} onConsult={consult} />
            {notice ? <p className="shop-pdp__notice" role="status">{notice}</p> : null}

            <DrugInformation product={product} />

            <Rail title="Other brands" sub={`Same salt${product.saltComposition ? ` — ${product.saltComposition}` : ''}`} products={detail.otherBrands} onOpen={open} />
            <Rail title="Alternative medicines" sub={product.drugClass ? `Also used for ${product.drugClass.toLowerCase()}` : undefined} products={detail.alternatives} onOpen={open} />
            <Rail
              title={detail.togetherSource === 'orders' ? 'Frequently bought together' : 'You may also need'}
              sub={detail.togetherSource === 'orders' ? 'Often in the same order' : undefined}
              products={detail.together}
              onOpen={open}
            />

            {product.manufacturer ? (
              <section className="shop-pdp__section ds-enter" aria-label="Manufacturer">
                <SectionHead group as="h2" title="Manufacturer" />
                <Card padded className="shop-pdp__maker-card">
                  <span className="ds-icon-well" aria-hidden="true"><PharmacyIcon name="building" size={18} /></span>
                  <span className="shop-pdp__maker-body">
                    <span className="shop-pdp__maker-name">{product.manufacturer}</span>
                    <span className="shop-pdp__maker-meta">
                      {detail.fromMaker.length
                        ? `${detail.fromMaker.length + 1} products in this pharmacy`
                        : 'Marketed and packed by the manufacturer'}
                    </span>
                  </span>
                </Card>
              </section>
            ) : null}
            <Rail title={`More from ${product.manufacturer}`} products={detail.fromMaker} onOpen={open} />

            <TrustStrip className="shop-pdp__trust" />
            <p className="shop-pdp__disclaimer">
              Information here is for reference and does not replace advice from your doctor or pharmacist.
              Always read the pack label.
            </p>
          </div>
        ) : null}
      </div>

      {product ? (
        <div className="app-flow-footer shop-buybar">
          <span className="shop-buybar__price">
            {quantity ? (
              <>
                <span className="shop-buybar__label">{quantity} in cart</span>
                <span className="shop-price is-md"><span className="shop-price__now">{formatRupees((product.price ?? 0) * quantity)}</span></span>
              </>
            ) : (
              <>
                <span className="shop-buybar__label">{product.packLabel || 'Per pack'}</span>
                <PriceTag product={product} />
              </>
            )}
          </span>
          <span className="shop-buybar__actions">
            {quantity ? (
              <Button variant="text" size="sm" onClick={() => navigate('/pharmacy/cart')}>View cart</Button>
            ) : null}
            <CartStepper product={product} size="lg" addLabel="Add to cart" />
          </span>
        </div>
      ) : null}
    </div>
  )
}
