// ============================================================
// BizLedger Pro — GST Report (Indian Format)
// GSTR-1 style: Bill-wise GST breakdown, CGST/SGST/IGST summary
// CA-friendly PDF + CSV export
// ============================================================
import React, { useState, useMemo } from 'react'
import { useApp }   from '../context/AppContext.jsx'
import { BUSINESS } from '../data/store.js'
import { fmt, fmtShort, todayISO } from '../utils/helpers.js'

// ── Helpers ───────────────────────────────────────────────────

function fmtDate(str) {
  if (!str) return ''
  // Handle both "01 Apr 2025" and "2025-04-01"
  const d = new Date(str)
  if (!isNaN(d)) return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  return str
}

function fmtRs(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })
}

/**
 * Determine if supply is intra-state (CGST+SGST) or inter-state (IGST).
 * Rule: Compare first 2 digits of buyer's GSTIN with seller's state code.
 * Seller GSTIN: 09ABCDE... → state code 09 (Uttar Pradesh)
 */
function getGSTType(buyerGstin) {
  if (!buyerGstin) return 'IGST' // no GSTIN = unregistered = IGST by default
  const sellerState = BUSINESS.gstin.slice(0, 2)
  const buyerState  = (buyerGstin || '').slice(0, 2)
  return sellerState === buyerState ? 'INTRA' : 'INTER'
}

/**
 * Break a tax amount into CGST/SGST or IGST.
 */
function splitGST(taxAmount, gstType) {
  if (gstType === 'INTRA') {
    return { cgst: taxAmount / 2, sgst: taxAmount / 2, igst: 0 }
  }
  return { cgst: 0, sgst: 0, igst: taxAmount }
}

/**
 * Enrich a single invoice with GST breakdown.
 */
function enrichInvoice(inv) {
  const gstType  = getGSTType(inv.gstin)
  const tax      = inv.tax || 0
  const taxable  = inv.subtotal || (inv.total - tax)
  const gstRate  = taxable > 0 ? Math.round((tax / taxable) * 100) : 0
  const { cgst, sgst, igst } = splitGST(tax, gstType)

  return {
    ...inv,
    taxable,
    tax,
    gstRate,
    gstType,
    cgst,
    sgst,
    igst,
  }
}

/**
 * Export enriched bills to CSV.
 */
function exportCSV(rows, summary) {
  const header = [
    'Invoice No', 'Date', 'Party Name', 'GSTIN', 'Supply Type',
    'Taxable Amount', 'GST Rate %', 'CGST', 'SGST', 'IGST', 'Total Tax', 'Invoice Total',
  ]
  const data = rows.map(r => [
    r.id, fmtDate(r.date), r.party, r.gstin || '',
    r.gstType === 'INTRA' ? 'Intra-State' : 'Inter-State',
    r.taxable.toFixed(2), r.gstRate,
    r.cgst.toFixed(2), r.sgst.toFixed(2), r.igst.toFixed(2),
    r.tax.toFixed(2), r.total.toFixed(2),
  ])
  const footer = [
    'TOTAL', '', '', '', '',
    summary.totalTaxable.toFixed(2), '',
    summary.totalCGST.toFixed(2), summary.totalSGST.toFixed(2), summary.totalIGST.toFixed(2),
    summary.totalTax.toFixed(2), summary.totalRevenue.toFixed(2),
  ]

  const csv = [header, ...data, [], footer]
    .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `GSTReport_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Generate CA-grade plain text GST report.
 */
function exportPDFText(rows, summary) {
  const line = '─'.repeat(80)
  const lines = [
    `${BUSINESS.name}`,
    `GSTIN: ${BUSINESS.gstin}  |  ${BUSINESS.address}`,
    '',
    'GST REPORT — OUTWARD SUPPLIES (GSTR-1 FORMAT)',
    `Generated: ${new Date().toLocaleString('en-IN')}`,
    `Period: ${rows.length} invoices`,
    line,
    '',
    'SUMMARY',
    `Total Taxable Value  : ${fmtRs(summary.totalTaxable)}`,
    `Total CGST           : ${fmtRs(summary.totalCGST)}`,
    `Total SGST           : ${fmtRs(summary.totalSGST)}`,
    `Total IGST           : ${fmtRs(summary.totalIGST)}`,
    `Total Tax            : ${fmtRs(summary.totalTax)}`,
    `Total Revenue        : ${fmtRs(summary.totalRevenue)}`,
    `Intra-State Invoices : ${summary.intraCount}`,
    `Inter-State Invoices : ${summary.interCount}`,
    '',
    line,
    'INVOICE-WISE GST DETAIL',
    line,
  ]

  rows.forEach(r => {
    lines.push(`${r.id.padEnd(20)} ${fmtDate(r.date).padEnd(15)} ${r.party}`)
    lines.push(`  GSTIN: ${r.gstin || 'Unregistered'} | Type: ${r.gstType === 'INTRA' ? 'Intra-State (CGST+SGST)' : 'Inter-State (IGST)'}`)
    lines.push(`  Taxable: ${fmtRs(r.taxable)}  CGST: ${fmtRs(r.cgst)}  SGST: ${fmtRs(r.sgst)}  IGST: ${fmtRs(r.igst)}  Total: ${fmtRs(r.total)}`)
    lines.push('')
  })

  lines.push(line)
  lines.push(`Total CGST: ${fmtRs(summary.totalCGST)}  |  Total SGST: ${fmtRs(summary.totalSGST)}  |  Total IGST: ${fmtRs(summary.totalIGST)}`)

  const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `GSTReport_${new Date().toISOString().slice(0, 10)}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Constants ─────────────────────────────────────────────────
const INPUT_STYLE = {
  padding: '7px 10px', border: '1px solid var(--border-2)',
  borderRadius: 'var(--r-sm)', fontSize: 13, fontFamily: 'var(--font)',
  color: 'var(--ink)', background: 'var(--surface)', outline: 'none', cursor: 'text',
}

const BTN_GHOST = {
  padding: '7px 14px', borderRadius: 'var(--r-sm)',
  border: '1px solid var(--border-2)', background: 'var(--surface)',
  fontSize: 13, color: 'var(--ink-60)', cursor: 'pointer',
  fontFamily: 'var(--font)', fontWeight: 500,
}

const BTN_PRIMARY = {
  ...BTN_GHOST,
  background: '#111', color: '#fff', border: 'none',
}

const TH = {
  padding: '9px 14px', fontSize: 11, fontWeight: 700,
  color: 'var(--ink-40)', textTransform: 'uppercase',
  letterSpacing: '.06em', background: 'var(--surface-2)',
  borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap',
}

const TD = (right = false, bold = false, color = 'var(--ink)', mono = false) => ({
  padding: '11px 14px', fontSize: 13,
  textAlign: right ? 'right' : 'left',
  fontWeight: bold ? 600 : 400,
  color,
  fontFamily: mono ? 'var(--mono)' : 'var(--font)',
  whiteSpace: 'nowrap',
  borderBottom: '1px solid var(--border)',
})

// ── Main Component ────────────────────────────────────────────
export default function GSTReport({ onBack }) {
  const { invoices } = useApp()

  const [fromDate, setFromDate] = useState('')
  const [toDate,   setToDate]   = useState('')
  const [party,    setParty]    = useState('All')
  const [search,   setSearch]   = useState('')
  const [supplyFilter, setSupplyFilter] = useState('All') // All | Intra | Inter

  // Enrich all invoices
  const allEnriched = useMemo(() => invoices.map(enrichInvoice), [invoices])

  // Unique party list
  const partyOptions = useMemo(() => {
    const names = [...new Set(allEnriched.map(r => r.party))].sort()
    return ['All', ...names]
  }, [allEnriched])

  // Apply filters
  const filtered = useMemo(() => {
    return allEnriched.filter(r => {
      if (fromDate) {
        const d = new Date(r.date)
        if (!isNaN(d) && d < new Date(fromDate)) return false
      }
      if (toDate) {
        const d = new Date(r.date)
        if (!isNaN(d) && d > new Date(toDate)) return false
      }
      if (party !== 'All' && r.party !== party) return false
      if (search && !r.id.toLowerCase().includes(search.toLowerCase())) return false
      if (supplyFilter === 'Intra' && r.gstType !== 'INTRA') return false
      if (supplyFilter === 'Inter' && r.gstType !== 'INTER') return false
      return true
    })
  }, [allEnriched, fromDate, toDate, party, search, supplyFilter])

  // Summary totals
  const summary = useMemo(() => ({
    totalTaxable: filtered.reduce((s, r) => s + r.taxable, 0),
    totalCGST:    filtered.reduce((s, r) => s + r.cgst, 0),
    totalSGST:    filtered.reduce((s, r) => s + r.sgst, 0),
    totalIGST:    filtered.reduce((s, r) => s + r.igst, 0),
    totalTax:     filtered.reduce((s, r) => s + r.tax, 0),
    totalRevenue: filtered.reduce((s, r) => s + r.total, 0),
    intraCount:   filtered.filter(r => r.gstType === 'INTRA').length,
    interCount:   filtered.filter(r => r.gstType === 'INTER').length,
  }), [filtered])

  // GST rate breakdown for pie-style summary
  const rateGroups = useMemo(() => {
    const groups = {}
    filtered.forEach(r => {
      const key = `${r.gstRate}%`
      if (!groups[key]) groups[key] = { rate: r.gstRate, taxable: 0, tax: 0, count: 0 }
      groups[key].taxable += r.taxable
      groups[key].tax     += r.tax
      groups[key].count   += 1
    })
    return Object.values(groups).sort((a, b) => a.rate - b.rate)
  }, [filtered])

  const clearFilters = () => {
    setFromDate(''); setToDate(''); setParty('All')
    setSearch(''); setSupplyFilter('All')
  }

  return (
    <div className="animate-slide" style={{ fontFamily: 'var(--font)' }}>

      {/* ── Header ──────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onBack} style={{ ...BTN_GHOST, display: 'flex', alignItems: 'center', gap: 6 }}>
            ← Reports
          </button>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-.6px', lineHeight: 1 }}>
              GST Report
            </h1>
            <p style={{ fontSize: 13, color: 'var(--ink-40)', marginTop: 4 }}>
              Outward supplies — GSTR-1 format · CGST / SGST / IGST breakdown
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={BTN_GHOST} onClick={() => exportCSV(filtered, summary)}>⬇ Excel / CSV</button>
          <button style={BTN_PRIMARY} onClick={() => exportPDFText(filtered, summary)}>📄 PDF Report</button>
        </div>
      </div>

      {/* ── Business Header Banner ───────────────────── */}
      <div style={{ background: '#111', borderRadius: 'var(--r-lg)', padding: '16px 22px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', letterSpacing: '-.3px', marginBottom: 2 }}>{BUSINESS.name}</div>
          <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.5)', fontFamily: 'var(--mono)' }}>
            GSTIN: {BUSINESS.gstin} · {BUSINESS.address}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 2 }}>Period</div>
          <div style={{ fontSize: 13, color: '#fff', fontFamily: 'var(--mono)' }}>
            {fromDate ? fmtDate(fromDate) : 'All time'} {toDate ? `→ ${fmtDate(toDate)}` : ''}
          </div>
        </div>
      </div>

      {/* ── Summary KPI Cards ────────────────────────── */}
      <div className="kpi-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        <GSTKpiCard label="Total Taxable Value" value={fmtRs(summary.totalTaxable)} sub={`${filtered.length} invoices`} />
        <GSTKpiCard label="Total CGST"          value={fmtRs(summary.totalCGST)}    sub={`${summary.intraCount} intra-state`} color="#1e40af" />
        <GSTKpiCard label="Total SGST"          value={fmtRs(summary.totalSGST)}    sub="Intra-state only"               color="#1e40af" />
        <GSTKpiCard label="Total IGST"          value={fmtRs(summary.totalIGST)}    sub={`${summary.interCount} inter-state`} color="#7c3aed" />
      </div>

      {/* ── GST Rate Breakdown + Total Tax Summary ──── */}
      <div className="two-col-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>

        {/* Rate-wise table */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ padding: '13px 18px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>GST Rate-wise Breakup</div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-40)', marginTop: 1 }}>Taxable & tax amount by slab</div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['GST Rate', 'Bills', 'Taxable Amt', 'Tax Amt'].map((h, i) => (
                  <th key={h} style={{ ...TH, textAlign: i >= 2 ? 'right' : 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rateGroups.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: 32, textAlign: 'center', color: 'var(--ink-20)', fontSize: 13 }}>No data</td></tr>
              ) : rateGroups.map(g => (
                <tr key={g.rate}>
                  <td style={{ ...TD(), fontWeight: 600 }}>
                    <span style={{ background: '#f0f0f0', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: 99, fontSize: 12, fontFamily: 'var(--mono)' }}>
                      {g.rate}%
                    </span>
                  </td>
                  <td style={TD()}>{g.count}</td>
                  <td style={{ ...TD(true, false, 'var(--ink)', true) }}>{fmtRs(g.taxable)}</td>
                  <td style={{ ...TD(true, true, '#1e40af', true) }}>{fmtRs(g.tax)}</td>
                </tr>
              ))}
            </tbody>
            {rateGroups.length > 0 && (
              <tfoot>
                <tr style={{ background: '#f8f8f8', borderTop: '2px solid #e0e0e0' }}>
                  <td colSpan={2} style={{ padding: '10px 14px', fontSize: 12.5, fontWeight: 700, color: 'var(--ink)' }}>TOTAL</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, fontFamily: 'var(--mono)', fontSize: 12.5 }}>{fmtRs(summary.totalTaxable)}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, fontFamily: 'var(--mono)', fontSize: 12.5, color: '#1e40af' }}>{fmtRs(summary.totalTax)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* GST type summary */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ padding: '13px 18px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>GST Summary</div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-40)', marginTop: 1 }}>Total tax collected by type</div>
          </div>
          <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { label: 'CGST (Central GST)',  value: summary.totalCGST,    color: '#1e40af', bg: '#eff6ff', border: '#bfdbfe', note: 'Intra-state' },
              { label: 'SGST (State GST)',    value: summary.totalSGST,    color: '#1e40af', bg: '#eff6ff', border: '#bfdbfe', note: 'Intra-state' },
              { label: 'IGST (Integrated)',   value: summary.totalIGST,    color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', note: 'Inter-state' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: item.bg, border: `1px solid ${item.border}`, borderRadius: 'var(--r-sm)', padding: '12px 14px' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: item.color }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: item.color, opacity: .7, marginTop: 2 }}>{item.note}</div>
                </div>
                <div style={{ fontSize: 17, fontWeight: 800, color: item.color, fontFamily: 'var(--mono)' }}>{fmtRs(item.value)}</div>
              </div>
            ))}
            {/* Total */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px solid var(--border-2)', paddingTop: 14 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>Total GST Liability</span>
              <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)', fontFamily: 'var(--mono)' }}>{fmtRs(summary.totalTax)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────── */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '14px 18px', marginBottom: 14, display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap', boxShadow: 'var(--shadow-xs)' }}>
        <GSTFilterField label="From Date">
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} style={INPUT_STYLE} />
        </GSTFilterField>
        <GSTFilterField label="To Date">
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} style={INPUT_STYLE} />
        </GSTFilterField>
        <GSTFilterField label="Party">
          <select value={party} onChange={e => setParty(e.target.value)} style={{ ...INPUT_STYLE, cursor: 'pointer', minWidth: 160 }}>
            {partyOptions.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </GSTFilterField>
        <GSTFilterField label="Supply Type">
          <select value={supplyFilter} onChange={e => setSupplyFilter(e.target.value)} style={{ ...INPUT_STYLE, cursor: 'pointer' }}>
            <option value="All">All Supplies</option>
            <option value="Intra">Intra-State (CGST+SGST)</option>
            <option value="Inter">Inter-State (IGST)</option>
          </select>
        </GSTFilterField>
        <GSTFilterField label="Search Invoice">
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-20)', fontSize: 14, pointerEvents: 'none' }}>⌕</span>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="INV-2025-…" style={{ ...INPUT_STYLE, paddingLeft: 30, width: 150 }} />
          </div>
        </GSTFilterField>
        <button onClick={clearFilters} style={{ ...BTN_GHOST, fontSize: 12, paddingBottom: 8 }}>Clear</button>
      </div>

      {/* ── Invoice-wise GST Table ───────────────────── */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ padding: '13px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>Invoice-wise GST Detail</div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-40)', marginTop: 1 }}>
              {filtered.length} invoices · GSTR-1 format
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {['All', 'Intra', 'Inter'].map(t => (
              <button
                key={t}
                onClick={() => setSupplyFilter(t)}
                style={{
                  padding: '4px 11px', borderRadius: 99, fontSize: 12, fontWeight: 500,
                  border: '1px solid', cursor: 'pointer', fontFamily: 'var(--font)', transition: 'all .11s',
                  background: supplyFilter === t ? 'var(--ink)' : 'transparent',
                  borderColor: supplyFilter === t ? 'var(--ink)' : 'var(--border-2)',
                  color: supplyFilter === t ? '#fff' : 'var(--ink-40)',
                }}
              >
                {t === 'All' ? 'All' : t === 'Intra' ? 'Intra-State' : 'Inter-State'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {[
                  ['Invoice No',     false],
                  ['Date',           false],
                  ['Party Name',     false],
                  ['GSTIN',          false],
                  ['Type',           false],
                  ['Taxable Amt',    true ],
                  ['GST %',          true ],
                  ['CGST',           true ],
                  ['SGST',           true ],
                  ['IGST',           true ],
                  ['Total Tax',      true ],
                  ['Invoice Total',  true ],
                ].map(([h, right]) => (
                  <th key={h} style={{ ...TH, textAlign: right ? 'right' : 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={12} style={{ padding: 48, textAlign: 'center', color: 'var(--ink-20)', fontSize: 13 }}>
                    No invoices match the current filters
                  </td>
                </tr>
              ) : filtered.map((r, idx) => {
                const isLast = idx === filtered.length - 1
                const isIntra = r.gstType === 'INTRA'

                return (
                  <GSTRow key={r.id} r={r} isLast={isLast} isIntra={isIntra} />
                )
              })}
            </tbody>

            {/* Footer totals */}
            {filtered.length > 0 && (
              <tfoot>
                <tr style={{ background: '#f8f8f8', borderTop: '2px solid #e0e0e0' }}>
                  <td colSpan={5} style={{ padding: '11px 14px', fontSize: 12.5, fontWeight: 700, color: 'var(--ink)' }}>
                    TOTAL ({filtered.length} invoices)
                  </td>
                  <td style={{ padding: '11px 14px', textAlign: 'right', fontWeight: 700, fontFamily: 'var(--mono)', fontSize: 12.5 }}>
                    {fmtRs(summary.totalTaxable)}
                  </td>
                  <td style={{ padding: '11px 14px' }} />
                  <td style={{ padding: '11px 14px', textAlign: 'right', fontWeight: 700, fontFamily: 'var(--mono)', fontSize: 12.5, color: '#1e40af' }}>
                    {fmtRs(summary.totalCGST)}
                  </td>
                  <td style={{ padding: '11px 14px', textAlign: 'right', fontWeight: 700, fontFamily: 'var(--mono)', fontSize: 12.5, color: '#1e40af' }}>
                    {fmtRs(summary.totalSGST)}
                  </td>
                  <td style={{ padding: '11px 14px', textAlign: 'right', fontWeight: 700, fontFamily: 'var(--mono)', fontSize: 12.5, color: '#7c3aed' }}>
                    {fmtRs(summary.totalIGST)}
                  </td>
                  <td style={{ padding: '11px 14px', textAlign: 'right', fontWeight: 700, fontFamily: 'var(--mono)', fontSize: 12.5, color: '#111' }}>
                    {fmtRs(summary.totalTax)}
                  </td>
                  <td style={{ padding: '11px 14px', textAlign: 'right', fontWeight: 700, fontFamily: 'var(--mono)', fontSize: 12.5 }}>
                    {fmtRs(summary.totalRevenue)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* ── Footer note ─────────────────────────────── */}
      <div style={{ marginTop: 14, fontSize: 11.5, color: 'var(--ink-40)', display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        <span>* Intra-state: CGST + SGST (equal split) · Inter-state: IGST only</span>
        <span>· State code basis: {BUSINESS.gstin.slice(0, 2)} ({BUSINESS.city})</span>
        <span>· For GSTR-1 filing, verify with your CA / tax consultant</span>
      </div>
    </div>
  )
}

// ── GST Row (with hover) ──────────────────────────────────────
function GSTRow({ r, isLast, isIntra }) {
  const [hov, setHov] = useState(false)

  const borderB = isLast ? 'none' : '1px solid var(--border)'

  return (
    <tr
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ background: hov ? 'var(--surface-2)' : 'transparent', transition: 'background .09s' }}
    >
      {/* Invoice No */}
      <td style={{ padding: '11px 14px', borderBottom: borderB, fontFamily: 'var(--mono)', fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap' }}>
        {r.id}
      </td>
      {/* Date */}
      <td style={{ padding: '11px 14px', borderBottom: borderB, fontSize: 13, color: 'var(--ink-60)', whiteSpace: 'nowrap' }}>
        {fmtDate(r.date)}
      </td>
      {/* Party */}
      <td style={{ padding: '11px 14px', borderBottom: borderB, fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' }}>
        {r.party}
      </td>
      {/* GSTIN */}
      <td style={{ padding: '11px 14px', borderBottom: borderB, fontFamily: 'var(--mono)', fontSize: 11.5, color: r.gstin ? 'var(--ink-60)' : 'var(--ink-20)', whiteSpace: 'nowrap' }}>
        {r.gstin || 'Unregistered'}
      </td>
      {/* Supply Type */}
      <td style={{ padding: '11px 14px', borderBottom: borderB, whiteSpace: 'nowrap' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 99,
          fontSize: 11.5, fontWeight: 500,
          background: isIntra ? '#eff6ff' : '#f5f3ff',
          color: isIntra ? '#1e40af' : '#7c3aed',
          border: `1px solid ${isIntra ? '#bfdbfe' : '#ddd6fe'}`,
        }}>
          {isIntra ? 'Intra-State' : 'Inter-State'}
        </span>
      </td>
      {/* Taxable */}
      <td style={{ padding: '11px 14px', borderBottom: borderB, textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--ink)', whiteSpace: 'nowrap' }}>
        {fmtRs(r.taxable)}
      </td>
      {/* GST % */}
      <td style={{ padding: '11px 14px', borderBottom: borderB, textAlign: 'right', whiteSpace: 'nowrap' }}>
        {r.gstRate > 0 ? (
          <span style={{ background: '#f0f0f0', border: '1px solid var(--border)', padding: '1px 7px', borderRadius: 99, fontSize: 11.5, fontFamily: 'var(--mono)', fontWeight: 500 }}>
            {r.gstRate}%
          </span>
        ) : <span style={{ color: 'var(--ink-20)' }}>—</span>}
      </td>
      {/* CGST */}
      <td style={{ padding: '11px 14px', borderBottom: borderB, textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 13, fontWeight: r.cgst > 0 ? 600 : 400, color: r.cgst > 0 ? '#1e40af' : 'var(--ink-20)', whiteSpace: 'nowrap' }}>
        {r.cgst > 0 ? fmtRs(r.cgst) : '—'}
      </td>
      {/* SGST */}
      <td style={{ padding: '11px 14px', borderBottom: borderB, textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 13, fontWeight: r.sgst > 0 ? 600 : 400, color: r.sgst > 0 ? '#1e40af' : 'var(--ink-20)', whiteSpace: 'nowrap' }}>
        {r.sgst > 0 ? fmtRs(r.sgst) : '—'}
      </td>
      {/* IGST */}
      <td style={{ padding: '11px 14px', borderBottom: borderB, textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 13, fontWeight: r.igst > 0 ? 600 : 400, color: r.igst > 0 ? '#7c3aed' : 'var(--ink-20)', whiteSpace: 'nowrap' }}>
        {r.igst > 0 ? fmtRs(r.igst) : '—'}
      </td>
      {/* Total Tax */}
      <td style={{ padding: '11px 14px', borderBottom: borderB, textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600, color: r.tax > 0 ? 'var(--ink)' : 'var(--ink-20)', whiteSpace: 'nowrap' }}>
        {r.tax > 0 ? fmtRs(r.tax) : '—'}
      </td>
      {/* Invoice Total */}
      <td style={{ padding: '11px 14px', borderBottom: borderB, textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap' }}>
        {fmtRs(r.total)}
      </td>
    </tr>
  )
}

// ── Small helpers ─────────────────────────────────────────────
function GSTKpiCard({ label, value, sub, color = 'var(--ink)' }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '16px 18px', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-40)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color, letterSpacing: '-.5px', lineHeight: 1, marginBottom: 5, fontFamily: 'var(--mono)' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--ink-40)' }}>{sub}</div>}
    </div>
  )
}

function GSTFilterField({ label, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-40)', textTransform: 'uppercase', letterSpacing: '.07em' }}>{label}</span>
      {children}
    </label>
  )
}
