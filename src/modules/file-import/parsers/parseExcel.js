import { buildColumnMapping } from '../utils/columnMapper.js'
import { isEmptyRow } from '../utils/dataCleaner.js'

/**
 * Parse Excel workbook buffer using XLSX.
 * @param {ArrayBuffer|Uint8Array|Buffer} buffer
 * @param {typeof import('xlsx')} XLSX
 * @param {{ sheetName?: string }} [options]
 */
export function parseExcelBuffer(buffer, XLSX, options = {}) {
  const workbook = XLSX.read(buffer, {
    type: 'array',
    cellDates: true,
    raw: false,
  })

  const sheetName = options.sheetName || workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]
  if (!worksheet) {
    throw new Error(`Worksheet "${sheetName}" not found in workbook.`)
  }

  const matrix = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    blankrows: false,
  })

  if (!matrix.length) return { headers: [], rows: [], sheetName, columnMapping: { mapping: {}, unmapped: [] } }

  const headers = matrix[0].map((cell, index) => String(cell ?? '').trim() || `column_${index}`)
  const rows = []

  for (let rowIndex = 1; rowIndex < matrix.length; rowIndex += 1) {
    const values = matrix[rowIndex] || []
    const row = {}
    headers.forEach((header, colIndex) => {
      row[header] = values[colIndex] ?? ''
    })
    if (!isEmptyRow(row)) rows.push(row)
  }

  return {
    headers,
    rows,
    sheetName,
    columnMapping: buildColumnMapping(headers),
  }
}

/**
 * Parse Excel File/Blob/Buffer.
 * @param {File|Blob|ArrayBuffer|Buffer} file
 * @param {typeof import('xlsx')} [XLSX]
 */
export async function parseExcel(file, XLSX) {
  const xlsxModule = XLSX || await import('xlsx')
  const xlsx = xlsxModule.default || xlsxModule
  const buffer = await readAsArrayBuffer(file)
  return parseExcelBuffer(buffer, xlsx)
}

async function readAsArrayBuffer(file) {
  if (file instanceof ArrayBuffer) return file
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(file)) {
    return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength)
  }
  if (file && typeof file.arrayBuffer === 'function') return file.arrayBuffer()
  throw new Error('Unsupported Excel input type.')
}

export default parseExcel
