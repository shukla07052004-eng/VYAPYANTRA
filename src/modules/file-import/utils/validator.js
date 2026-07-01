import { ACCEPTED_EXTENSIONS, MANDATORY_FIELDS, RECOMMENDED_FIELDS } from '../constants.js'
import { cleanString } from './dataCleaner.js'

/**
 * Validate normalized ERP records.
 * @param {Record<string, unknown>[]} records
 * @returns {{ success: boolean, errors: object[], warnings: object[] }}
 */
export function validateData(records = []) {
  const errors = []
  const warnings = []

  if (!records.length) {
    errors.push({ row: 0, field: '_file', message: 'No valid records found in the uploaded file.' })
    return { success: false, errors, warnings }
  }

  records.forEach((record, index) => {
    const rowNumber = index + 1

    MANDATORY_FIELDS.forEach((field) => {
      const value = record[field]
      const isMissing = value == null || cleanString(value) === ''
      if (isMissing) {
        errors.push({ row: rowNumber, field, message: `Missing mandatory field "${field}".` })
      }
    })

    RECOMMENDED_FIELDS.forEach((field) => {
      const value = record[field]
      const isMissing = value == null || cleanString(value) === '' || (field === 'quantity' && Number(value) === 0)
      if (isMissing) {
        warnings.push({ row: rowNumber, field, message: `Recommended field "${field}" is missing or zero.` })
      }
    })

    if (record._invalidDates?.length) {
      record._invalidDates.forEach((field) => {
        errors.push({ row: rowNumber, field, message: `Invalid date format for "${field}".` })
      })
    }

    if (record._invalidNumbers?.length) {
      record._invalidNumbers.forEach((field) => {
        errors.push({ row: rowNumber, field, message: `Invalid numeric value for "${field}".` })
      })
    }

    if (record._duplicate) {
      warnings.push({ row: rowNumber, field: '_duplicate', message: 'Duplicate record detected and skipped.' })
    }
  })

  return {
    success: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Validate file before parsing.
 * @param {File|{ name: string, size?: number, type?: string }} file
 */
export function validateFileType(file) {
  const name = String(file?.name || '').toLowerCase()
  const extension = name.includes('.') ? name.slice(name.lastIndexOf('.')) : ''
  const allowed = ACCEPTED_EXTENSIONS

  if (!allowed.includes(extension)) {
    return {
      valid: false,
      message: `Unsupported file type. Please upload ${allowed.join(', ')} files only.`,
    }
  }

  return { valid: true, extension, fileType: extension.replace('.', '') }
}

export function validateRowLimit(totalRows, maxRows) {
  if (totalRows > maxRows) {
    return {
      valid: false,
      message: `File exceeds the maximum supported limit of ${maxRows.toLocaleString()} rows.`,
    }
  }
  return { valid: true }
}
