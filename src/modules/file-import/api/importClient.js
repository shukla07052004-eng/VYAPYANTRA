const API_BASE = import.meta.env.VITE_IMPORT_API_URL || '/api'

/**
 * Upload a file to the backend import API.
 * @param {File} file
 * @param {{ onProgress?: (pct: number) => void }} [options]
 */
export async function uploadImportFile(file, options = {}) {
  const formData = new FormData()
  formData.append('file', file)

  options.onProgress?.(10)

  const response = await fetch(`${API_BASE}/import`, {
    method: 'POST',
    body: formData,
  })

  options.onProgress?.(90)

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload?.message || payload?.errors?.[0]?.message || 'Import API request failed.')
  }

  options.onProgress?.(100)
  return payload
}

export default uploadImportFile
