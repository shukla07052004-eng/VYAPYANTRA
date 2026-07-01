import { buildColumnMapping } from '../utils/columnMapper.js'
import { isEmptyRow } from '../utils/dataCleaner.js'

/**
 * Parse CSV text into raw row objects keyed by header names.
 * Handles quoted fields and comma-separated values.
 * @param {string} text
 */
export function parseCSVText(text = '') {
  const lines = splitCSVLines(text)
  if (!lines.length) return { headers: [], rows: [] }

  const headers = parseCSVLine(lines[0]).map((cell) => String(cell ?? '').trim())
  const rows = []

  for (let index = 1; index < lines.length; index += 1) {
    const values = parseCSVLine(lines[index])
    if (!values.length) continue
    const row = {}
    headers.forEach((header, colIndex) => {
      row[header || `column_${colIndex}`] = values[colIndex] ?? ''
    })
    if (!isEmptyRow(row)) rows.push(row)
  }

  return { headers, rows, columnMapping: buildColumnMapping(headers) }
}

/**
 * Parse a CSV File/Blob in the browser or Buffer on the server.
 * @param {File|Blob|ArrayBuffer|string|Buffer} file
 */
export async function parseCSV(file) {
  const text = await readAsText(file)
  return parseCSVText(text)
}

function splitCSVLines(text) {
  return String(text)
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '')
}

function parseCSVLine(line) {
  const cells = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    const next = line[i + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      cells.push(current)
      current = ''
      continue
    }

    current += char
  }

  cells.push(current)
  return cells
}

async function readAsText(file) {
  if (typeof file === 'string') return file
  if (file instanceof ArrayBuffer) return new TextDecoder('utf-8').decode(file)
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(file)) return file.toString('utf-8')
  if (file && typeof file.text === 'function') return file.text()
  throw new Error('Unsupported CSV input type.')
}

export default parseCSV
