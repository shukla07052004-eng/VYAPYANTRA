import express from 'express'
import cors from 'cors'
import importRouter from './routes/import.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: true }))
app.use(express.json({ limit: '2mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'vyapyantra-import-api' })
})

app.use('/api', importRouter)

app.use((error, _req, res, _next) => {
  console.error('[Import API]', error)
  res.status(500).json({
    success: false,
    records: [],
    errors: [{ row: 0, field: '_server', message: error?.message || 'Internal server error.' }],
    warnings: [],
  })
})

app.listen(PORT, () => {
  console.log(`Import API running on http://localhost:${PORT}`)
})
