// ============================================================
// BizLedger Pro — Utility Functions
// ============================================================

/** Format number as Indian currency ₹X,XX,XXX */
export const fmt = (n) =>
  '₹' + Number(n).toLocaleString('en-IN')

/** Short format: ₹1.2L, ₹48K */
export const fmtShort = (n) => {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`
  if (n >= 100000)   return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000)     return `₹${(n / 1000).toFixed(0)}K`
  return `₹${n}`
}

/** Extract initials from name */
export const initials = (name = '') =>
  name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

/** Deterministic avatar background from name */
export const avatarBg = (name = '') => {
  const idx = name.charCodeAt(0) % 6
  const bgs = ['#f0f0f0','#e8e8e8','#ebebeb','#e5e5e5','#ededed','#e2e2e2']
  return bgs[idx]
}

/** Today's date as yyyy-mm-dd */
export const todayISO = () => new Date().toISOString().slice(0, 10)

/** Add days to date string yyyy-mm-dd */
export const addDays = (dateStr, days) => {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Generate next invoice ID */
export const genInvoiceId = (invoices) => {
  const nums = invoices.map(i => parseInt(i.id.split('-')[2] || '0')).filter(Boolean)
  const next = nums.length ? Math.max(...nums) + 1 : 119
  return `INV-2025-${next}`
}

/** Debounce function */
export const debounce = (fn, delay = 300) => {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

/** Clamp number between min and max */
export const clamp = (n, min, max) => Math.min(Math.max(n, min), max)

const escapeCsvValue = (value) => {
  const stringValue = String(value ?? '')
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }
  return stringValue
}

export const downloadCsv = (filename, columns = [], rows = []) => {
  const header = columns.map((column) => escapeCsvValue(column.label)).join(',')
  const body = rows.map((row) => columns.map((column) => {
    const value = typeof column.value === 'function' ? column.value(row) : row[column.key]
    return escapeCsvValue(value)
  }).join(','))
  const csv = [header, ...body].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export const printTextReport = ({ title, subtitle = '', sections = [] }) => {
  const child = window.open('', '_blank', 'width=960,height=720')
  if (!child) return false

  const sectionMarkup = sections.map((section) => `
    <section style="margin-bottom:24px">
      <h2 style="font-size:16px;margin:0 0 8px">${section.title}</h2>
      ${section.summary ? `<p style="margin:0 0 10px;color:#555">${section.summary}</p>` : ''}
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead>
          <tr>
            ${section.columns.map((column) => `<th style="text-align:${column.align || 'left'};padding:8px;border-bottom:1px solid #d7d7d7">${column.label}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${section.rows.map((row) => `
            <tr>
              ${section.columns.map((column) => `<td style="text-align:${column.align || 'left'};padding:8px;border-bottom:1px solid #efefef">${column.value(row)}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </section>
  `).join('')

  child.document.write(`
    <html>
      <head>
        <title>${title}</title>
      </head>
      <body style="font-family:Arial,sans-serif;padding:24px;color:#111">
        <h1 style="margin:0 0 6px">${title}</h1>
        ${subtitle ? `<p style="margin:0 0 24px;color:#555">${subtitle}</p>` : ''}
        ${sectionMarkup}
      </body>
    </html>
  `)
  child.document.close()
  child.focus()
  child.print()
  return true
}
