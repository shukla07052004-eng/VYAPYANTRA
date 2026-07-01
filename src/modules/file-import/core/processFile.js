import { MAX_ROWS } from '../constants.js'
import { normalizeData } from './normalizeData.js'
import { exportJSON } from './exportJSON.js'
import { validateData, validateFileType, validateRowLimit } from './validateData.js'
import { parseCSV } from '../parsers/parseCSV.js'
import { parseExcel } from '../parsers/parseExcel.js'

/**
 * Process an uploaded file end-to-end: parse → normalize → validate → export envelope.
 * Uses chunked normalization for large files to reduce UI blocking.
 *
 * @param {File|Blob|ArrayBuffer|Buffer|string} file
 * @param {{ fileName?: string, onProgress?: (pct: number) => void, useBackend?: boolean }} [options]
 */
export async function processImportFile(file, options = {}) {
  const fileName = options.fileName || file?.name || 'upload'
  const typeCheck = validateFileType({ name: fileName, type: file?.type })
  if (!typeCheck.valid) {
    return buildFailure(typeCheck.message)
  }

  options.onProgress?.(5)

  let parsed
  try {
    if (typeCheck.extension === '.json') {
      return await processJSONFile(file, {
        fileName,
        importKind: options.importKind,
        onProgress: options.onProgress,
      })
    }

    if (typeCheck.extension === '.csv') {
      parsed = await parseCSV(file)
    } else {
      parsed = await parseExcel(file)
    }
  } catch (error) {
    return buildFailure(error?.message || 'Failed to parse uploaded file.')
  }

  const rowLimit = validateRowLimit(parsed.rows.length, MAX_ROWS)
  if (!rowLimit.valid) return buildFailure(rowLimit.message)

  options.onProgress?.(25)

  const normalized = await normalizeInChunks(parsed.rows, {
    headers: parsed.headers,
    onProgress: (pct) => options.onProgress?.(25 + Math.round(pct * 0.55)),
  })

  options.onProgress?.(85)

  const validation = validateForKind(normalized.records, options.importKind)
  const payload = exportJSON(normalized.records, {
    fileName,
    fileType: typeCheck.fileType,
    uploadedAt: new Date().toISOString(),
    importProfile: normalized.importProfile,
    columnMapping: normalized.columnMapping,
    unmappedColumns: normalized.unmappedColumns,
  })

  options.onProgress?.(100)

  return {
    success: validation.success,
    errors: validation.errors,
    warnings: [
      ...validation.warnings,
      ...(normalized.duplicates.length
        ? [{ row: 0, field: '_duplicate', message: `${normalized.duplicates.length} duplicate row(s) were skipped.` }]
        : []),
      ...(normalized.unmappedColumns.length
        ? [{ row: 0, field: '_mapping', message: `Unmapped columns: ${normalized.unmappedColumns.join(', ')}` }]
        : []),
    ],
    records: payload.records,
    payload,
    meta: {
      totalParsedRows: parsed.rows.length,
      duplicateCount: normalized.duplicates.length,
      importProfile: normalized.importProfile,
      importKind: options.importKind || 'complete',
      sheetName: parsed.sheetName || null,
    },
  }
}

async function processJSONFile(file, options = {}) {
  options.onProgress?.(20)

  let json
  try {
    json = JSON.parse(await readAsText(file))
  } catch (error) {
    return buildFailure(error?.message || 'Invalid JSON file.')
  }

  const records = Array.isArray(json)
    ? json
    : Array.isArray(json?.records)
      ? json.records
      : []

  const metadata = {
    fileName: options.fileName,
    fileType: 'json',
    uploadedAt: new Date().toISOString(),
    importProfile: json?.metadata?.importProfile || 'json',
    importKind: options.importKind || json?.metadata?.importKind || 'complete',
  }

  options.onProgress?.(80)

  if (!records.length && isStructuredErpJSON(json)) {
    options.onProgress?.(100)
    return {
      success: true,
      errors: [],
      warnings: [],
      records: [],
      payload: {
        metadata,
        records: [],
        erpData: json,
      },
      meta: {
        totalParsedRows: countStructuredRows(json),
        duplicateCount: 0,
        importProfile: 'json',
        importKind: metadata.importKind,
        structuredJson: true,
        sheetName: null,
      },
    }
  }

  const normalized = normalizeData(records, {
    headers: records.length ? Object.keys(records[0]) : [],
    onProgress: (pct) => options.onProgress?.(80 + Math.round(pct * 0.15)),
  })
  const validation = validateForKind(normalized.records, metadata.importKind)
  const payload = exportJSON(normalized.records, metadata)

  options.onProgress?.(100)

  return {
    success: validation.success,
    errors: validation.errors,
    warnings: validation.warnings,
    records: payload.records,
    payload,
    meta: {
      totalParsedRows: records.length,
      duplicateCount: normalized.duplicates.length,
      importProfile: normalized.importProfile,
      importKind: metadata.importKind,
      structuredJson: false,
      sheetName: null,
    },
  }
}

function validateForKind(records, importKind = 'complete') {
  if (importKind === 'parties') {
    const errors = records
      .map((record, index) => ({ record, index }))
      .filter(({ record }) => !String(record.partyName || '').trim())
      .map(({ index }) => ({ row: index + 2, field: 'partyName', message: 'Party name is required.' }))
    return { success: errors.length === 0, errors, warnings: [] }
  }

  if (importKind === 'expenses') {
    const errors = records
      .map((record, index) => ({ record, index }))
      .filter(({ record }) => !(Number(record.totalAmount) || Number(record.taxableAmount) || Number(record.balance)))
      .map(({ index }) => ({ row: index + 2, field: 'amount', message: 'Expense amount is required.' }))
    return { success: errors.length === 0, errors, warnings: [] }
  }

  return validateData(records)
}

/**
 * Chunked normalization to keep the main thread responsive for large imports.
 */
async function normalizeInChunks(rows, options = {}) {
  const CHUNK = 1000
  const allRecords = []
  let columnMapping = {}
  let unmappedColumns = []
  let importProfile = 'generic'

  for (let start = 0; start < rows.length; start += CHUNK) {
    const slice = rows.slice(start, start + CHUNK)
    const result = normalizeData(slice, {
      headers: options.headers,
      onProgress: (pct) => {
        const overall = Math.round(((start + (slice.length * pct) / 100) / rows.length) * 100)
        options.onProgress?.(overall)
      },
    })

    columnMapping = result.columnMapping
    unmappedColumns = result.unmappedColumns
    importProfile = result.importProfile
    allRecords.push(...result.records, ...result.duplicates)

    await yieldToMainThread()
  }

  const deduped = dedupeRecords(allRecords)

  return {
    records: deduped.records,
    duplicates: deduped.duplicates,
    columnMapping,
    unmappedColumns,
    importProfile,
  }
}

function dedupeRecords(records) {
  const seen = new Set()
  const unique = []
  const duplicates = []

  records.forEach((record) => {
    const key = [
      String(record.invoiceNo || '').toLowerCase(),
      String(record.itemName || '').toLowerCase(),
      String(record.batchNo || '').toLowerCase(),
      String(record.quantity ?? ''),
      String(record.rate ?? ''),
    ].join('|')

    if (seen.has(key) && key !== '|||0|0') {
      duplicates.push({ ...record, _duplicate: true })
    } else {
      seen.add(key)
      unique.push(record)
    }
  })

  return { records: unique, duplicates }
}

function yieldToMainThread() {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => resolve())
    else setTimeout(resolve, 0)
  })
}

async function readAsText(file) {
  if (typeof file === 'string') return file
  if (file instanceof ArrayBuffer) return new TextDecoder('utf-8').decode(file)
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(file)) return file.toString('utf-8')
  if (file && typeof file.text === 'function') return file.text()
  throw new Error('Unsupported JSON input type.')
}

function isStructuredErpJSON(value) {
  if (!value || Array.isArray(value) || typeof value !== 'object') return false
  return ['sales', 'invoices', 'purchases', 'parties', 'products', 'items', 'expenses', 'company']
    .some((key) => Object.prototype.hasOwnProperty.call(value, key))
}

function countStructuredRows(value) {
  return ['sales', 'invoices', 'purchases', 'parties', 'products', 'items', 'expenses', 'payments', 'stock', 'gst']
    .reduce((sum, key) => sum + (Array.isArray(value?.[key]) ? value[key].length : 0), 0)
}

function buildFailure(message) {
  return {
    success: false,
    errors: [{ row: 0, field: '_file', message }],
    warnings: [],
    records: [],
    payload: exportJSON([], {}),
    meta: {},
  }
}

export default processImportFile
