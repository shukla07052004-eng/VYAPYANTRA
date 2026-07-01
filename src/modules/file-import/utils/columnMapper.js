import { FIELD_ALIASES, MARG_ERP_FIELD_MAP } from '../constants.js'

/**
 * Normalize a spreadsheet header into a lookup token.
 * @param {string} header
 */
export function normalizeHeaderKey(header = '') {
  return String(header)
    .trim()
    .toLowerCase()
    .replace(/[%]/g, 'percent')
    .replace(/[^a-z0-9]+/g, '')
}

/**
 * Resolve a raw header to a standard ERP field name.
 * @param {string} header
 */
export function mapHeaderToField(header = '') {
  const trimmed = String(header).trim()
  if (MARG_ERP_FIELD_MAP[trimmed]) return MARG_ERP_FIELD_MAP[trimmed]
  const normalized = normalizeHeaderKey(trimmed)
  return FIELD_ALIASES[normalized] || null
}

/**
 * Build a column index map from spreadsheet headers.
 * @param {string[]} headers
 * @returns {{ mapping: Record<number, string>, unmapped: string[] }}
 */
export function buildColumnMapping(headers = []) {
  const mapping = {}
  const unmapped = []

  headers.forEach((header, index) => {
    const field = mapHeaderToField(header)
    if (field) {
      if (mapping[field] === undefined) mapping[field] = index
    } else if (String(header || '').trim()) {
      unmapped.push(String(header).trim())
    }
  })

  return { mapping, unmapped }
}

/**
 * Convert a raw row object keyed by original headers into a mapped object.
 * @param {Record<string, unknown>} row
 * @param {Record<string, number>} fieldToIndex - inverted mapping field -> column index
 * @param {string[]} headers
 */
export function mapRowByHeaders(row, headers) {
  const { mapping } = buildColumnMapping(headers)
  const mapped = {}

  Object.entries(mapping).forEach(([field, index]) => {
    const header = headers[index]
    mapped[field] = row[header] ?? row[index] ?? row[String(index)] ?? null
  })

  return mapped
}

/**
 * Map array-of-arrays row using column mapping.
 * @param {unknown[]} row
 * @param {Record<string, number>} mapping - field -> column index
 */
export function mapRowByIndex(row = [], mapping = {}) {
  const mapped = {}
  Object.entries(mapping).forEach(([field, index]) => {
    mapped[field] = row[index] ?? null
  })
  return mapped
}

export function invertColumnMapping(columnMapping) {
  return columnMapping
}

export function getMappedFields(columnMapping) {
  return Object.keys(columnMapping)
}
