import fs from 'node:fs'

/** Quote-aware CSV parse (ported from API/nmc-api/src/import.js). */
export function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false

  const pushField = () => {
    row.push(field)
    field = ''
  }
  const pushRow = () => {
    if (row.length === 1 && row[0] === '') {
      row = []
      return
    }
    rows.push(row)
    row = []
  }

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]
    const next = text[i + 1]
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"'
        i += 1
      } else if (ch === '"') {
        inQuotes = false
      } else {
        field += ch
      }
      continue
    }
    if (ch === '"') {
      inQuotes = true
      continue
    }
    if (ch === ',') {
      pushField()
      continue
    }
    if (ch === '\n') {
      pushField()
      pushRow()
      continue
    }
    if (ch === '\r') continue
    field += ch
  }
  if (field.length || row.length) {
    pushField()
    pushRow()
  }
  return rows
}

export function csvToObjects(text) {
  const matrix = parseCsv(text)
  if (!matrix.length) return { headers: [], rows: [] }
  const headers = matrix[0].map((h) => String(h || '').trim())
  const rows = []
  for (let i = 1; i < matrix.length; i += 1) {
    const cells = matrix[i]
    if (!cells.some((c) => String(c || '').trim())) continue
    const obj = {}
    headers.forEach((h, idx) => {
      obj[h] = cells[idx] == null ? '' : String(cells[idx])
    })
    rows.push(obj)
  }
  return { headers, rows }
}

export function readJsonFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8')
  return JSON.parse(raw)
}

export function inspectHeaders(sample) {
  if (Array.isArray(sample) && sample[0] && typeof sample[0] === 'object') {
    return Object.keys(sample[0])
  }
  if (sample && typeof sample === 'object' && !Array.isArray(sample)) {
    return Object.keys(sample)
  }
  return []
}
