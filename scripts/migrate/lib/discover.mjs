import fs from 'node:fs'
import path from 'node:path'
import { csvToObjects, inspectHeaders, readJsonFile } from './io.mjs'

/**
 * Discover registry datasets from permanent scripts/data/registry first,
 * then fall back to the temporary API/ workspace during the one-time migration.
 */
export function discoverDatasets(root) {
  const candidates = [
    {
      id: 'nmc',
      label: 'NMC doctors',
      table: 'providers',
      idField: 'NMC Number',
      paths: [
        path.join(root, 'scripts/data/registry/nmc-database-active.csv'),
        path.join(root, 'API/nmc-api/data/nmc-database-active.csv'),
        path.join(root, 'API/nmc-api/nmc-database-final.csv'),
      ],
    },
    {
      id: 'hf',
      label: 'Health facilities',
      table: 'healthcare_centers',
      idField: 'hfCode',
      paths: [
        path.join(root, 'scripts/data/registry/health-facilities.json'),
        path.join(root, 'API/health-facility-api/data/health-facilities.json'),
      ],
    },
    {
      id: 'dda',
      label: 'DDA pharmacies',
      table: 'pharmacies',
      idField: 'Registration No',
      // Prefer backup so Nepali UTF-8 parenthetical names are preserved.
      paths: [
        path.join(root, 'scripts/data/registry/pharmacies.json.backup'),
        path.join(root, 'scripts/data/registry/pharmacies.json'),
        path.join(root, 'API/pharmacy_api/api/pharmacies.json.backup'),
        path.join(root, 'API/pharmacy_api/api/pharmacies.json'),
      ],
    },
  ]

  const found = []
  for (const c of candidates) {
    const filePath = c.paths.find((p) => fs.existsSync(p))
    if (!filePath) {
      found.push({ ...c, available: false, path: null, headers: [], error: 'dataset not found' })
      continue
    }
    found.push({ ...c, available: true, path: filePath, headers: [], error: null })
  }
  return found
}

export function loadDataset(dataset) {
  if (!dataset?.available || !dataset.path) {
    throw new Error(dataset?.error || `Dataset ${dataset?.id} unavailable`)
  }
  const ext = path.extname(dataset.path).toLowerCase()
  if (ext === '.csv') {
    const text = fs.readFileSync(dataset.path, 'utf8')
    const { headers, rows } = csvToObjects(text)
    return { headers, rows, format: 'csv' }
  }
  if (ext === '.json' || dataset.path.endsWith('.json.backup')) {
    const data = readJsonFile(dataset.path)
    const rows = Array.isArray(data) ? data : []
    return { headers: inspectHeaders(rows), rows, format: 'json' }
  }
  throw new Error(`Unsupported dataset format: ${dataset.path}`)
}

/** Copy discovered API datasets into permanent scripts/data/registry/. */
export function promoteDatasetsToRegistry(root, datasets) {
  const destDir = path.join(root, 'scripts/data/registry')
  fs.mkdirSync(destDir, { recursive: true })
  const copied = []
  for (const ds of datasets) {
    if (!ds.available || !ds.path) continue
    if (ds.path.includes(`${path.sep}scripts${path.sep}data${path.sep}registry${path.sep}`)) {
      copied.push({ id: ds.id, path: ds.path, action: 'already-permanent' })
      continue
    }
    const base = path.basename(ds.path)
    const dest = path.join(destDir, base)
    fs.copyFileSync(ds.path, dest)
    copied.push({ id: ds.id, path: dest, action: 'copied', from: ds.path })
  }
  return copied
}
