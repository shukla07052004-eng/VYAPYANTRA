/**
 * File Import Module — public API
 * Excel/CSV → standardized ERP JSON converter
 */

export { parseCSV } from './parsers/parseCSV.js'
export { parseExcel, parseExcelBuffer } from './parsers/parseExcel.js'
export { normalizeData } from './core/normalizeData.js'
export { validateData, validateFileType, validateRowLimit } from './core/validateData.js'
export { exportJSON, downloadJSON } from './core/exportJSON.js'
export { processImportFile } from './core/processFile.js'
export { buildColumnMapping, mapHeaderToField } from './utils/columnMapper.js'
export {
  ACCEPTED_EXTENSIONS,
  FIELD_ALIASES,
  MARG_ERP_FIELD_MAP,
  MAX_ROWS,
  PREVIEW_ROW_COUNT,
  STANDARD_RECORD,
} from './constants.js'

export { default as FileImportConverter } from './components/FileImportConverter.jsx'
