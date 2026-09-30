import { requireSupabase } from '../../lib/supabase'

const RESUME_KEY = 'emedicalls.pharmacyResume'
const STORE_KEY = 'emedicalls.pharmacyStore'
export const CART_EVENT = 'pharmacy-cart-changed'

/*
 * `*` keeps the app working before and after the medicine-detail migration
 * (image_url, salt_composition, monograph): new columns simply appear.
 */
const CATALOG_COLUMNS = '*'

/** Keys of `drugs.monograph` — one per tab on the medicine page. */
export const MONOGRAPH_KEYS = [
  'dosage',
  'side_effects',
  'uses',
  'warnings',
  'precautions',
  'interactions',
  'how_to_take',
  'storage',
]

export function formatRupees(value) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return 'Rs 0'
  return `Rs ${amount.toLocaleString('en-NP')}`
}

export function formatEta(minutes) {
  const value = Number(minutes)
  if (!Number.isFinite(value) || value <= 0) return 'Delivery time is confirmed at checkout'
  if (value <= 90) return 'Delivery in about 1 hour'
  if (value <= 180) return 'Delivery in about 2–3 hours'
  return `Delivery in about ${Math.round(value / 60)} hours`
}

export function stockLabel(qty) {
  const count = Number(qty) || 0
  if (count <= 0) return 'Out of stock'
  if (count < 8) return `Only ${count} left`
  return 'In stock'
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''))
}

async function currentUser() {
  const supabase = requireSupabase()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    const err = new Error('Sign in to continue.')
    err.code = 'AUTH'
    throw err
  }
  return { supabase, user: data.user }
}

function mapMonograph(value) {
  const source = value && typeof value === 'object' ? value : {}
  return MONOGRAPH_KEYS.reduce((out, key) => {
    const entry = source[key]
    if (Array.isArray(entry)) {
      const items = entry.map((item) => String(item || '').trim()).filter(Boolean)
      if (items.length) out[key] = items
    } else if (typeof entry === 'string' && entry.trim()) {
      out[key] = [entry.trim()]
    }
    return out
  }, {})
}

function mapCatalogRow(row) {
  if (!row) return null
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    genericName: row.generic_name,
    manufacturer: row.manufacturer,
    drugClass: row.drug_class,
    form: row.dosage_form,
    strength: row.strength,
    category: row.category || 'medicine',
    description: row.description,
    packLabel: row.pack_label,
    requiresPrescription: Boolean(row.requires_prescription),
    stockQty: Number(row.stock_qty) || 0,
    price: row.price == null ? null : Number(row.price),
    mrp: row.mrp == null ? null : Number(row.mrp),
    etaMinutes: row.eta_minutes == null ? null : Number(row.eta_minutes),
    imageUrl: row.image_url || null,
    saltComposition: row.salt_composition || row.generic_name || null,
    monograph: mapMonograph(row.monograph),
  }
}

/** Percent saved against MRP, or 0 when there is no discount. */
export function discountPercent(product) {
  if (!product || product.mrp == null || product.price == null || product.mrp <= product.price) return 0
  return Math.round(((product.mrp - product.price) / product.mrp) * 100)
}

async function listStoreCatalog(supabase, pharmacyId, { q = '', category = 'all' } = {}) {
  const { data: pharmacy, error: pharmacyError } = await supabase
    .from('pharmacies')
    .select('id, name, typical_eta_minutes')
    .eq('id', pharmacyId)
    .maybeSingle()
  if (pharmacyError) throw pharmacyError
  let query = supabase
    .from('pharmacy_inventory')
    .select('quantity, unit_price, mrp, drugs!inner(*)')
    .eq('pharmacy_id', pharmacyId)
    .eq('is_active', true)
    .gt('quantity', 0)
  const { data, error } = await query
  if (error) throw error
  const term = q.trim().toLowerCase()
  const rows = (data || []).map((row) => mapCatalogRow({
    ...row.drugs,
    stock_qty: row.quantity,
    price: row.unit_price,
    mrp: row.mrp,
    eta_minutes: pharmacy?.typical_eta_minutes,
  })).filter((product) => {
    if (category && category !== 'all' && product.category !== category) return false
    if (!term) return true
    return [product.name, product.genericName, product.drugClass].some((value) => String(value || '').toLowerCase().includes(term))
  })
  rows.sort((a, b) => a.name.localeCompare(b.name))
  return { pharmacyName: pharmacy?.name || 'Store', products: rows }
}

export function rememberStore(pharmacyId) {
  if (pharmacyId) sessionStorage.setItem(STORE_KEY, pharmacyId)
}

export function readStore() {
  return sessionStorage.getItem(STORE_KEY) || null
}

export async function listCatalog({ q = '', category = 'all', pharmacyId = null } = {}) {
  const supabase = requireSupabase()
  if (pharmacyId) {
    const store = await listStoreCatalog(supabase, pharmacyId, { q, category })
    return store.products
  }
  let query = supabase.from('pharmacy_catalog').select(CATALOG_COLUMNS).order('name')
  const term = q.trim()
  if (term) {
    const safe = term.replace(/[%_,]/g, '')
    query = query.or(`name.ilike.%${safe}%,generic_name.ilike.%${safe}%,drug_class.ilike.%${safe}%`)
  }
  if (category && category !== 'all') query = query.eq('category', category)
  const { data, error } = await query.limit(80)
  if (error) throw error
  return (data || []).map(mapCatalogRow)
}

export async function getProduct(id) {
  const supabase = requireSupabase()
  const { data, error } = await supabase
    .from('pharmacy_catalog')
    .select(CATALOG_COLUMNS)
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return mapCatalogRow(data)
}

function normalise(value) {
  return String(value || '').trim().toLowerCase()
}

/**
 * Pulls "Frequently bought together" from past orders (RPC added by the
 * medicine-detail migration). Falls back to same-shelf products when the
 * RPC is missing or there is no order history yet.
 */
async function frequentlyBoughtTogether(supabase, product, pool) {
  const { data, error } = await supabase.rpc('pharmacy_frequently_bought_together', {
    p_drug_id: product.id,
    p_limit: 6,
  })
  if (!error && Array.isArray(data) && data.length) {
    return { source: 'orders', rows: data.map(mapCatalogRow).filter((row) => row && row.id !== product.id) }
  }
  return {
    source: 'suggested',
    rows: pool
      .filter((row) => row.id !== product.id && row.category !== product.category && row.stockQty > 0)
      .slice(0, 6),
  }
}

/**
 * Everything the medicine page shows: the product, the other strengths and
 * brands of the same salt, alternatives in the same class, and items that
 * are often ordered with it.
 */
export async function getProductDetail(id) {
  const supabase = requireSupabase()
  const product = await getProduct(id)
  if (!product) return null
  const { data, error } = await supabase.from('pharmacy_catalog').select(CATALOG_COLUMNS).order('name').limit(200)
  const pool = error ? [] : (data || []).map(mapCatalogRow).filter(Boolean)
  const salt = normalise(product.saltComposition || product.genericName)
  const klass = normalise(product.drugClass)
  const others = pool.filter((row) => row.id !== product.id)
  const sameSalt = salt ? others.filter((row) => normalise(row.saltComposition || row.genericName) === salt) : []
  // One chip per strength of the same salt; this brand wins a tie.
  const byStrength = new Map()
  for (const row of [product, ...sameSalt.filter((r) => normalise(r.manufacturer) === normalise(product.manufacturer)), ...sameSalt]) {
    const key = normalise(row.strength)
    if (key && !byStrength.has(key)) byStrength.set(key, row)
  }
  const strengths = [...byStrength.values()]
  const otherBrands = sameSalt.filter((row) => normalise(row.manufacturer) !== normalise(product.manufacturer))
  const taken = new Set([product.id, ...sameSalt.map((row) => row.id)])
  const alternatives = klass
    ? others.filter((row) => !taken.has(row.id) && normalise(row.drugClass) === klass).slice(0, 8)
    : []
  let together = { source: 'suggested', rows: [] }
  try {
    together = await frequentlyBoughtTogether(supabase, product, others)
  } catch {
    /* keep the empty rail */
  }
  const maker = normalise(product.manufacturer)
  const fromMaker = maker
    ? others.filter((row) => !taken.has(row.id) && normalise(row.manufacturer) === maker).slice(0, 8)
    : []
  return {
    product,
    fromMaker,
    strengths: strengths.length > 1 ? strengths.sort((a, b) => parseFloat(a.strength) - parseFloat(b.strength)) : [],
    otherBrands,
    alternatives,
    together: together.rows.filter((row) => !taken.has(row.id)).slice(0, 6),
    togetherSource: together.source,
  }
}

const cartIds = new Map()

async function ownCart(supabase, userId) {
  if (cartIds.has(userId)) return cartIds.get(userId)
  const id = await findOrCreateCart(supabase, userId)
  cartIds.set(userId, id)
  return id
}

async function findOrCreateCart(supabase, userId) {
  const { data, error } = await supabase
    .from('pharmacy_carts')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  if (data) return data.id
  const created = await supabase
    .from('pharmacy_carts')
    .insert({ user_id: userId })
    .select('id')
    .single()
  if (created.error) throw created.error
  return created.data.id
}

function announceCart(source) {
  window.dispatchEvent(new CustomEvent(CART_EVENT, { detail: { source } }))
}

export async function getCart() {
  const { supabase, user } = await currentUser()
  const cartId = await ownCart(supabase, user.id)
  const { data, error } = await supabase
    .from('pharmacy_cart_items')
    .select('id, drug_id, quantity')
    .eq('cart_id', cartId)
  if (error) throw error
  const items = data || []
  if (!items.length) return { items: [], count: 0, subtotal: 0 }
  const ids = items.map((item) => item.drug_id)
  const { data: products, error: productError } = await supabase
    .from('pharmacy_catalog')
    .select(CATALOG_COLUMNS)
    .in('id', ids)
  if (productError) throw productError
  const byId = new Map((products || []).map((row) => [row.id, mapCatalogRow(row)]))
  const lines = items.map((item) => {
    const product = byId.get(item.drug_id)
    return {
      id: item.id,
      drugId: item.drug_id,
      quantity: item.quantity,
      product,
      lineTotal: product?.price == null ? 0 : product.price * item.quantity,
    }
  })
  return {
    items: lines,
    count: lines.reduce((sum, line) => sum + line.quantity, 0),
    subtotal: lines.reduce((sum, line) => sum + line.lineTotal, 0),
  }
}

export async function addToCart(drugId, quantity = 1) {
  const { supabase, user } = await currentUser()
  const cartId = await ownCart(supabase, user.id)
  const { data: existing, error: readError } = await supabase
    .from('pharmacy_cart_items')
    .select('id, quantity')
    .eq('cart_id', cartId)
    .eq('drug_id', drugId)
    .maybeSingle()
  if (readError) throw readError
  const nextQty = (existing?.quantity || 0) + quantity
  if (existing) {
    const { error } = await supabase
      .from('pharmacy_cart_items')
      .update({ quantity: nextQty })
      .eq('id', existing.id)
    if (error) throw error
  } else {
    const { error } = await supabase
      .from('pharmacy_cart_items')
      .insert({ cart_id: cartId, drug_id: drugId, quantity: nextQty })
    if (error) throw error
  }
  announceCart('api')
}

/**
 * Sets the absolute quantity of one medicine in the signed-in user's cart —
 * an upsert on (cart_id, drug_id), or a delete at zero. Idempotent, so the
 * cart store can retry or coalesce rapid taps safely.
 */
export async function setDrugQuantity(drugId, quantity, { source = 'api' } = {}) {
  const { supabase, user } = await currentUser()
  const cartId = await ownCart(supabase, user.id)
  const qty = Math.max(0, Math.floor(Number(quantity) || 0))
  if (qty === 0) {
    const { error } = await supabase
      .from('pharmacy_cart_items')
      .delete()
      .eq('cart_id', cartId)
      .eq('drug_id', drugId)
    if (error) throw error
  } else {
    const { error } = await supabase
      .from('pharmacy_cart_items')
      .upsert({ cart_id: cartId, drug_id: drugId, quantity: qty }, { onConflict: 'cart_id,drug_id' })
    if (error) throw error
  }
  announceCart(source)
}

export async function setCartQuantity(itemId, quantity) {
  const { supabase } = await currentUser()
  if (quantity <= 0) {
    const { error } = await supabase.from('pharmacy_cart_items').delete().eq('id', itemId)
    if (error) throw error
  } else {
    const { error } = await supabase
      .from('pharmacy_cart_items')
      .update({ quantity })
      .eq('id', itemId)
    if (error) throw error
  }
  announceCart('api')
}

export async function listOrders() {
  const { supabase, user } = await currentUser()
  const { data, error } = await supabase
    .from('pharmacy_orders')
    .select('id, status, total_amount, delivery_fee, estimated_delivery, created_at, prescription_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) throw error
  return data || []
}

export async function getOrder(orderId) {
  const { supabase, user } = await currentUser()
  const { data: order, error } = await supabase
    .from('pharmacy_orders')
    .select('id, status, total_amount, delivery_fee, estimated_delivery, delivered_at, created_at, prescription_id, delivery_note')
    .eq('id', orderId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (error) throw error
  if (!order) return null
  const [items, events, invoice] = await Promise.all([
    supabase
      .from('pharmacy_order_items')
      .select('id, drug_id, quantity, unit_price, total_price, drugs(name, strength, requires_prescription)')
      .eq('order_id', orderId),
    supabase
      .from('pharmacy_order_events')
      .select('id, status, note, created_at')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true }),
    supabase
      .from('invoices')
      .select('id, invoice_number, total_amount, amount_paid, currency, status')
      .eq('pharmacy_order_id', orderId)
      .maybeSingle(),
  ])
  if (items.error) throw items.error
  if (events.error) throw events.error
  return {
    order,
    items: items.data || [],
    events: events.data || [],
    invoice: invoice.error ? null : invoice.data,
  }
}

export async function placeOrder({ note, prescriptionId }) {
  const { supabase } = await currentUser()
  const { data, error } = await supabase.rpc('place_pharmacy_order', {
    p_note: note || null,
    p_prescription_id: prescriptionId || null,
    p_pharmacy_id: readStore(),
  })
  if (error) throw error
  announceCart('api')
  return data
}

export async function reorder(orderId) {
  const detail = await getOrder(orderId)
  if (!detail) throw new Error('That order could not be found.')
  for (const item of detail.items) {
    await addToCart(item.drug_id, item.quantity)
  }
}

export async function uploadPrescription({ file, drugs }) {
  const { supabase, user } = await currentUser()
  const sourceId = `upload:${crypto.randomUUID()}`
  const path = `${user.id}/${sourceId}`
  const uploaded = await supabase.storage.from('prescriptions').upload(path, file, {
    upsert: false,
    contentType: file.type || undefined,
  })
  if (uploaded.error) throw uploaded.error
  const created = await supabase
    .from('prescriptions')
    .insert({
      patient_id: user.id,
      status: 'active',
      source_id: sourceId,
      notes: 'Uploaded by the patient',
    })
    .select('id')
    .single()
  if (created.error) throw created.error
  const prescriptionId = created.data.id
  await supabase.from('prescription_files').insert({
    prescription_id: prescriptionId,
    patient_id: user.id,
    storage_path: path,
    file_name: file.name,
  })
  if (drugs?.length) {
    const { error } = await supabase.from('prescription_items').insert(drugs.map((drug) => ({
      prescription_id: prescriptionId,
      drug_id: drug.id,
      drug_name: drug.name,
      dosage: drug.strength || 'As directed',
      frequency: 'As directed',
      quantity: drug.quantity || 1,
    })))
    if (error) throw error
  }
  return prescriptionId
}

export async function issueConsultPrescription({
  drugs,
  bookingId,
  providerId,
  appointmentId,
}) {
  const { supabase, user } = await currentUser()
  const sourceId = `consult:${bookingId || crypto.randomUUID()}`
  const { data: existing, error: readError } = await supabase
    .from('prescriptions')
    .select('id')
    .eq('patient_id', user.id)
    .eq('source_id', sourceId)
    .maybeSingle()
  if (readError) throw readError
  if (existing?.id) return existing.id
  const created = await supabase
    .from('prescriptions')
    .insert({
      patient_id: user.id,
      provider_id: isUuid(providerId) ? providerId : null,
      appointment_id: isUuid(appointmentId) ? appointmentId : null,
      status: 'active',
      source_id: sourceId,
      notes: 'Issued from an eMedicalls consultation',
    })
    .select('id')
    .single()
  if (created.error) throw created.error
  const prescriptionId = created.data.id
  if (drugs?.length) {
    const { error } = await supabase.from('prescription_items').insert(drugs.map((drug) => ({
      prescription_id: prescriptionId,
      drug_id: drug.id,
      drug_name: drug.name,
      dosage: drug.strength || 'As directed',
      frequency: 'As directed',
      quantity: drug.quantity || 1,
    })))
    if (error) throw error
  }
  return prescriptionId
}

export function savePharmacyResume(resume) {
  sessionStorage.setItem(RESUME_KEY, JSON.stringify(resume))
}

export function readPharmacyResume() {
  try {
    const value = JSON.parse(sessionStorage.getItem(RESUME_KEY) || 'null')
    return value && Array.isArray(value.drugs) ? value : null
  } catch {
    return null
  }
}

export function clearPharmacyResume() {
  sessionStorage.removeItem(RESUME_KEY)
}
