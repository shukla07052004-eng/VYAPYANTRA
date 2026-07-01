import { DEFAULT_RECORD_VALUES } from '../constants.js'
import { buildColumnMapping, mapRowByHeaders } from '../utils/columnMapper.js'
import {
  buildDuplicateKey,
  cleanString,
  detectImportProfile,
  isEmptyRow,
  parseDate,
  parseNumber,
} from '../utils/dataCleaner.js'

/**
 * Normalize raw spreadsheet rows into standardized ERP records.
 * @param {Record<string, unknown>[]} rows
 * @param {{ headers?: string[], onProgress?: (pct: number) => void }} [options]
 */
export function normalizeData(rows = [], options = {}) {
  const headers = options.headers || Object.keys(rows[0] || {})
  const { mapping, unmapped } = buildColumnMapping(headers)
  const importProfile = detectImportProfile(headers)
  const seen = new Set()
  const records = []
  const total = rows.length

  rows.forEach((row, index) => {
    if (isEmptyRow(row)) return

    const mapped = headers.length ? mapRowByHeaders(row, headers) : row
    const record = normalizeRecord(mapped, importProfile)
    const duplicateKey = buildDuplicateKey(record)

    if (seen.has(duplicateKey) && duplicateKey !== '|||0|0') {
      record._duplicate = true
    } else {
      seen.add(duplicateKey)
    }

    records.push(record)
    options.onProgress?.(Math.round(((index + 1) / Math.max(total, 1)) * 100))
  })

  const activeRecords = records.filter((record) => !record._duplicate)

  return {
    records: activeRecords,
    duplicates: records.filter((record) => record._duplicate),
    columnMapping: mapping,
    unmappedColumns: unmapped,
    importProfile,
  }
}

function normalizeRecord(raw = {}, importProfile = 'generic') {
  const record = { ...DEFAULT_RECORD_VALUES }
  const invalidDates = []
  const invalidNumbers = []

  record.invoiceNo = cleanString(raw.invoiceNo)
  record.partyName = cleanString(raw.partyName)
  record.partyType = cleanString(raw.partyType)
  record.mobile = cleanString(raw.mobile)
  record.city = cleanString(raw.city)
  record.gstin = cleanString(raw.gstin)
  record.itemName = cleanString(raw.itemName)
  record.batchNo = cleanString(raw.batchNo)
  record.expenseTitle = cleanString(raw.expenseTitle)
  record.category = cleanString(raw.category)
  record.paymentMode = cleanString(raw.paymentMode)
  record.notes = cleanString(raw.notes)
  record.drCr = cleanString(raw.drCr).toUpperCase()

  const invoiceDate = parseDate(raw.invoiceDate)
  record.invoiceDate = invoiceDate.value
  if (!invoiceDate.valid) invalidDates.push('invoiceDate')

  const expiryDate = parseDate(raw.expiryDate)
  record.expiryDate = expiryDate.value
  if (!expiryDate.valid) invalidDates.push('expiryDate')

  const numericFields = [
    ['quantity', 0],
    ['rate', 0],
    ['discount', 0],
    ['gstPercent', 0],
    ['taxableAmount', 0],
    ['gstAmount', 0],
    ['totalAmount', 0],
    ['purchaseRate', 0],
    ['balance', 0],
  ]

  numericFields.forEach(([field, fallback]) => {
    if (raw[field] == null || raw[field] === '') return
    const parsed = parseNumber(raw[field], fallback)
    record[field] = parsed.value
    if (!parsed.valid) invalidNumbers.push(field)
  })

  if (raw.hsnCode != null) record.hsnCode = cleanString(raw.hsnCode)

  if (importProfile === 'marg-erp' && !record.rate && record.purchaseRate) {
    record.rate = record.purchaseRate
  }

  if (!record.taxableAmount && record.quantity && record.rate) {
    const gross = record.quantity * record.rate
    const discountValue = record.discount > 0 && record.discount <= 100
      ? gross * (record.discount / 100)
      : record.discount
    record.taxableAmount = Math.max(gross - discountValue, 0)
  }

  if (!record.gstAmount && record.taxableAmount && record.gstPercent) {
    record.gstAmount = Math.round((record.taxableAmount * record.gstPercent) / 100 * 100) / 100
  }

  if (!record.totalAmount && record.taxableAmount) {
    record.totalAmount = Math.round((record.taxableAmount + record.gstAmount) * 100) / 100
  }

  if (invalidDates.length) record._invalidDates = invalidDates
  if (invalidNumbers.length) record._invalidNumbers = invalidNumbers

  return record
}

export default normalizeData
