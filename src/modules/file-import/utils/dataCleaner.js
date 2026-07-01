/**
 * Data cleaning utilities for imported spreadsheet rows.
 */

const DATE_PATTERNS = [
  /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
  /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/,
  /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/,
  /^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/,
]

const MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
}

/**
 * @param {unknown} value
 * @returns {string|null}
 */
export function cleanString(value) {
  if (value == null) return ''
  return String(value).replace(/\s+/g, ' ').trim()
}

/**
 * Parse many common date formats into YYYY-MM-DD.
 * @param {unknown} value
 * @returns {{ value: string, valid: boolean, raw: unknown }}
 */
export function parseDate(value) {
  if (value == null || value === '') return { value: '', valid: true, raw: value }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return { value: formatDateParts(value.getFullYear(), value.getMonth() + 1, value.getDate()), valid: true, raw: value }
  }

  if (typeof value === 'number' && value > 20000 && value < 80000) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30))
    excelEpoch.setUTCDate(excelEpoch.getUTCDate() + Math.floor(value))
    return { value: formatDateParts(excelEpoch.getUTCFullYear(), excelEpoch.getUTCMonth() + 1, excelEpoch.getUTCDate()), valid: true, raw: value }
  }

  const text = cleanString(value)
  if (!text) return { value: '', valid: true, raw: value }

  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (iso) return { value: formatDateParts(Number(iso[1]), Number(iso[2]), Number(iso[3])), valid: true, raw: value }

  const dmy = text.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/)
  if (dmy) {
    const year = dmy[3].length === 2 ? 2000 + Number(dmy[3]) : Number(dmy[3])
    return { value: formatDateParts(year, Number(dmy[2]), Number(dmy[1])), valid: true, raw: value }
  }

  const mdy = text.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (mdy) return { value: formatDateParts(Number(mdy[3]), Number(mdy[1]), Number(mdy[2])), valid: true, raw: value }

  const named = text.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/i)
  if (named) {
    const month = MONTHS[named[2].slice(0, 3).toLowerCase()]
    if (month) return { value: formatDateParts(Number(named[3]), month, Number(named[1])), valid: true, raw: value }
  }

  const parsed = new Date(text)
  if (!Number.isNaN(parsed.getTime())) {
    return { value: formatDateParts(parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate()), valid: true, raw: value }
  }

  return { value: text, valid: false, raw: value }
}

function formatDateParts(year, month, day) {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/**
 * @param {unknown} value
 * @param {number} [fallback=0]
 */
export function parseNumber(value, fallback = 0) {
  if (value == null || value === '') return { value: fallback, valid: true, raw: value }
  if (typeof value === 'number' && Number.isFinite(value)) return { value, valid: true, raw: value }

  const cleaned = cleanString(value)
    .replace(/,/g, '')
    .replace(/[^\d.\-]/g, '')

  if (!cleaned || cleaned === '-' || cleaned === '.') {
    return { value: fallback, valid: cleaned === '', raw: value }
  }

  const parsed = Number(cleaned)
  if (!Number.isFinite(parsed)) return { value: fallback, valid: false, raw: value }
  return { value: parsed, valid: true, raw: value }
}

/**
 * @param {Record<string, unknown>} row
 */
export function isEmptyRow(row = {}) {
  return Object.values(row).every((value) => {
    if (value == null) return true
    if (typeof value === 'number') return value === 0
    return cleanString(value) === ''
  })
}

/**
 * Build a duplicate key for invoice line deduplication.
 * @param {Record<string, unknown>} record
 */
export function buildDuplicateKey(record = {}) {
  return [
    cleanString(record.invoiceNo).toLowerCase(),
    cleanString(record.itemName).toLowerCase(),
    cleanString(record.batchNo).toLowerCase(),
    String(record.quantity ?? ''),
    String(record.rate ?? ''),
  ].join('|')
}

export function detectImportProfile(headers = []) {
  const normalized = headers.map((header) => cleanString(header))
  const margMatches = normalized.filter((header) => Object.keys(MARG_ERP_FIELD_MAP).includes(header))
  if (margMatches.length >= 3) return 'marg-erp'
  return 'generic'
}

export { DATE_PATTERNS }
