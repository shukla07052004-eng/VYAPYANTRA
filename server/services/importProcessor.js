import { processImportFile } from '../../src/modules/file-import/core/processFile.js'
import { parseCSVText } from '../../src/modules/file-import/parsers/parseCSV.js'
import { parseExcelBuffer } from '../../src/modules/file-import/parsers/parseExcel.js'
import { normalizeData } from '../../src/modules/file-import/core/normalizeData.js'
import { validateData, validateFileType, validateRowLimit } from '../../src/modules/file-import/core/validateData.js'
import { exportJSON } from '../../src/modules/file-import/core/exportJSON.js'
import { MAX_ROWS } from '../../src/modules/file-import/constants.js'

/**
 * Server-side import processor using in-memory buffers.
 * Reuses shared normalization and validation logic from the frontend module.
 *
//  * @param {{ originalname: string, mimetype: string, buffer: Buffer }} file
//  * @param {typeof import('xlsx')} XLSX
//  */
// export async function processServerImport(file, XLSX) {
//   const fileName = file.originalname
//   const typeCheck = validateFileType({ name: fileName, type: file.mimetype })
//   if (!typeCheck.valid) {
//     return buildApiResponse(buildFailure(typeCheck.message))
//   }

//   let parsed
//   if (typeCheck.extension === '.csv') {
//     parsed = parseCSVText(file.buffer.toString('utf-8'))
//   } else {
//     parsed = parseExcelBuffer(file.buffer, XLSX)
//   }

//   const rowLimit = validateRowLimit(parsed.rows.length, MAX_ROWS)
//   if (!rowLimit.valid) return buildApiResponse(buildFailure(rowLimit.message))

//   const normalized = normalizeData(parsed.rows, { headers: parsed.headers })
//   const validation = validateData(normalized.records)
//   const payload = exportJSON(normalized.records, {
//     fileName,
//     fileType: typeCheck.fileType,
//     uploadedAt: new Date().toISOString(),
//     importProfile: normalized.importProfile,
//     columnMapping: normalized.columnMapping,
//     unmappedColumns: normalized.unmappedColumns,
//   })

//   return buildApiResponse({
//     success: validation.success,
//     errors: validation.errors,
//     warnings: [
//       ...validation.warnings,
//       ...(normalized.duplicates.length
//         ? [{ row: 0, field: '_duplicate', message: `${normalized.duplicates.length} duplicate row(s) skipped.` }]
//         : []),
//     ],
//     records: payload.records,
//     payload,
//     meta: {
//       totalParsedRows: parsed.rows.length,
//       duplicateCount: normalized.duplicates.length,
//       importProfile: normalized.importProfile,
//     },
//   })
// }

/** Alternative full pipeline wrapper for parity with frontend API. */
export async function processServerImport(file) {
  return processImportFile({
    name: file.originalname,
    arrayBuffer: async () => file.buffer,
    text: async () => file.buffer.toString('utf-8'),
  }, { fileName: file.originalname })
}

function buildApiResponse(result) {
  return {
    success: result.success,
    records: result.records,
    errors: result.errors,
    warnings: result.warnings || [],
    payload: result.payload,
    meta: result.meta || {},
  }
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

export default processServerImport
