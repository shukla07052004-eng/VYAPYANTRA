import React, { useCallback, useRef, useState } from 'react'
import Button from '../../../components/ui/Button.jsx'
import { Card, CardBody, CardHead } from '../../../components/ui/index.js'
import { PREVIEW_ROW_COUNT } from '../constants.js'
import { processImportFile } from '../core/processFile.js'
import { downloadJSON } from '../core/exportJSON.js'
import { uploadImportFile } from '../api/importClient.js'

const ACCEPT = '.xlsx,.xls,.csv,.json'

/**
 * Excel/CSV → JSON converter UI for ERP imports.
 * Supports drag-and-drop, validation preview, and JSON download.
 */
export default function FileImportConverter({
  title = 'Import Excel / CSV',
  subtitle = 'Upload Marg ERP, Tally, or custom exports. Columns are mapped automatically.',
  useBackend = false,
  importKind = 'complete',
  onImportComplete,
}) {
  const inputRef = useRef(null)
  const [dragActive, setDragActive] = useState(false)
  const [fileName, setFileName] = useState('')
  const [progress, setProgress] = useState(0)
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const handleFile = useCallback(async (file) => {
    if (!file) return
    setError('')
    setResult(null)
    setFileName(file.name)
    setProcessing(true)
    setProgress(0)

    try {
      const importResult = useBackend
        ? await uploadImportFile(file, { onProgress: setProgress })
        : await processImportFile(file, { fileName: file.name, importKind, onProgress: setProgress })

      setResult(importResult)
      onImportComplete?.(importResult)
    } catch (err) {
      setError(err?.message || 'Import failed.')
      setProgress(0)
    } finally {
      setProcessing(false)
    }
  }, [importKind, onImportComplete, useBackend])

  const onInputChange = (event) => {
    const file = event.target.files?.[0]
    handleFile(file)
    event.target.value = ''
  }

  const onDrop = (event) => {
    event.preventDefault()
    setDragActive(false)
    const file = event.dataTransfer.files?.[0]
    handleFile(file)
  }

  const previewRecords = result?.payload?.records?.slice(0, PREVIEW_ROW_COUNT) || []
  const previewColumns = previewRecords.length
    ? Object.keys(previewRecords[0]).filter((key) => !key.startsWith('_'))
    : []

  return (
    <div id="import-items-table" style={{ display: 'grid', gap: 16 }}>
      <Card>
        <CardHead title={title} sub={subtitle} />
        <CardBody style={{ display: 'grid', gap: 16 }}>
          <div
            role="button"
            tabIndex={0}
            data-focus-item="true"
            onDragEnter={(event) => { event.preventDefault(); setDragActive(true) }}
            onDragOver={(event) => { event.preventDefault(); setDragActive(true) }}
            onDragLeave={() => setDragActive(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                inputRef.current?.click()
              }
            }}
            style={{
              border: `2px dashed ${dragActive ? '#d97706' : '#e5e5e5'}`,
              borderRadius: 12,
              padding: '36px 24px',
              textAlign: 'center',
              background: dragActive ? '#fffaf5' : '#fafafa',
              cursor: 'pointer',
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#222' }}>Drag & drop your file here</div>
            <div style={{ marginTop: 6, fontSize: 13, color: '#777' }}>or click to browse - .xlsx, .xls, .csv, .json (up to 50,000 rows)</div>
            {fileName && <div style={{ marginTop: 12, fontSize: 12.5, color: '#9a4f09' }}>Selected: {fileName}</div>}
          </div>

          <input ref={inputRef} type="file" accept={ACCEPT} hidden onChange={onInputChange} />

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Button variant="primary" disabled={processing} onClick={() => inputRef.current?.click()}>
              {processing ? 'Processing…' : 'Select File'}
            </Button>
            {result?.payload && (
              <Button
                variant="secondary"
                onClick={() => downloadJSON(result.payload, `${(fileName || 'import').replace(/\.[^.]+$/, '')}.json`)}
              >
                Download JSON
              </Button>
            )}
          </div>

          {(processing || progress > 0) && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#666', marginBottom: 6 }}>
                <span>Processing</span>
                <span>{progress}%</span>
              </div>
              <div style={{ height: 8, borderRadius: 999, background: '#ececec', overflow: 'hidden' }}>
                <div style={{ width: `${progress}%`, height: '100%', background: '#d97706', transition: 'width .2s ease' }} />
              </div>
            </div>
          )}

          {error && (
            <div style={{ padding: 12, borderRadius: 8, border: '1px solid #f2c8c8', background: '#fff8f8', color: '#b42318', fontSize: 13 }}>
              {error}
            </div>
          )}
        </CardBody>
      </Card>

      {result && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
            <ImportStat label="Status" value={result.success ? 'Valid' : 'Needs Review'} tone={result.success ? 'green' : 'orange'} />
            <ImportStat label="Records" value={result.payload?.metadata?.totalRows ?? 0} />
            <ImportStat label="Profile" value={result.meta?.importProfile || result.payload?.metadata?.importProfile || 'generic'} />
            <ImportStat label="Errors" value={result.errors?.length ?? 0} tone={result.errors?.length ? 'red' : 'neutral'} />
            <ImportStat label="Warnings" value={result.warnings?.length ?? 0} tone={result.warnings?.length ? 'orange' : 'neutral'} />
          </div>

          {(result.errors?.length > 0 || result.warnings?.length > 0) && (
            <Card>
              <CardHead title="Validation Report" sub="Errors must be fixed before ERP import. Warnings are informational." />
              <CardBody style={{ display: 'grid', gap: 12 }}>
                {result.errors?.length > 0 && (
                  <ValidationList title="Errors" items={result.errors} tone="error" />
                )}
                {result.warnings?.length > 0 && (
                  <ValidationList title="Warnings" items={result.warnings} tone="warn" />
                )}
              </CardBody>
            </Card>
          )}

          {previewRecords.length > 0 && (
            <Card>
              <CardHead title={`Preview (first ${PREVIEW_ROW_COUNT} rows)`} sub="Standardized JSON records ready for ERP import" />
              <CardBody style={{ overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900, fontSize: 12.5 }}>
                  <thead>
                    <tr>
                      {previewColumns.map((column) => (
                        <th key={column} style={previewThStyle}>{column}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRecords.map((row, index) => (
                      <tr key={index}>
                        {previewColumns.map((column) => (
                          <td key={column} style={previewTdStyle}>{String(row[column] ?? '')}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardBody>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

function ImportStat({ label, value, tone = 'neutral' }) {
  const colors = {
    green: '#287047',
    orange: '#9a4f09',
    red: '#b42318',
    neutral: '#222',
  }
  return (
    <div style={{ border: '1px solid #ececec', borderRadius: 10, padding: '14px 16px', background: '#fff' }}>
      <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</div>
      <div style={{ marginTop: 6, fontSize: 20, fontWeight: 600, color: colors[tone] || colors.neutral }}>{value}</div>
    </div>
  )
}

function ValidationList({ title, items, tone }) {
  const palette = tone === 'error'
    ? { border: '#f2c8c8', bg: '#fff8f8', color: '#b42318' }
    : { border: '#efd8a3', bg: '#fffaf0', color: '#9a5a05' }

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: palette.color }}>{title}</div>
      <div style={{ display: 'grid', gap: 6, maxHeight: 220, overflow: 'auto' }}>
        {items.map((item, index) => (
          <div key={index} style={{ padding: '8px 10px', borderRadius: 8, border: `1px solid ${palette.border}`, background: palette.bg, color: palette.color, fontSize: 12.5 }}>
            {item.row ? `Row ${item.row}: ` : ''}{item.message}
          </div>
        ))}
      </div>
    </div>
  )
}

const previewThStyle = {
  textAlign: 'left',
  padding: '10px 12px',
  borderBottom: '1px solid #ececec',
  background: '#fafafa',
  color: '#777',
  fontWeight: 500,
  whiteSpace: 'nowrap',
}

const previewTdStyle = {
  padding: '10px 12px',
  borderBottom: '1px solid #f0f0f0',
  color: '#333',
  whiteSpace: 'nowrap',
}
