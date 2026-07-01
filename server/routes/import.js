import { Router } from 'express'
import multer from 'multer'
import XLSX from 'xlsx'
import { processServerImport } from '../services/importProcessor.js'

const router = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.xlsx', '.xls', '.csv']
    const name = String(file.originalname || '').toLowerCase()
    const extension = name.includes('.') ? name.slice(name.lastIndexOf('.')) : ''
    if (!allowed.includes(extension)) {
      cb(new Error('Unsupported file type. Upload .xlsx, .xls, or .csv only.'))
      return
    }
    cb(null, true)
  },
})

/**
 * POST /api/import
 * Accepts multipart file upload and returns standardized JSON records.
 */
router.post('/import', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      records: [],
      errors: [{ row: 0, field: '_file', message: 'No file uploaded.' }],
      warnings: [],
    })
  }

  try {
    const result = await processServerImport(req.file, XLSX)
    return res.status(result.success ? 200 : 422).json(result)
  } catch (error) {
    return res.status(500).json({
      success: false,
      records: [],
      errors: [{ row: 0, field: '_server', message: error?.message || 'Import processing failed.' }],
      warnings: [],
    })
  }
})

export default router
