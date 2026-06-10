// ============================================================
// BizLedger Pro — GST Sub-Report Components
// BillwiseGST · GSTR1 · GSTR3B · PartyGST · HSNSummary
// RCMReport · CreditDebitNotes
// ============================================================
import React, { useState, useMemo } from 'react'
import {
  fmtRs, fmtDate, buildHSNSummary, buildPartyWiseGST, buildGSTR1, buildGSTR3B,
  exportBillwiseGSTCSV, exportGSTR1CSV, exportHSNCSV, exportPartyCSV,
  exportPlainTextReport, round2,
} from '../../utils/gstEngine.js'
import { BUSINESS } from '../../data/store.js'
import {
  S, GSTCardHead, GSTTableWrapper, GSTFilters, GSTFilterField,
  SupplyBadge, InvoiceTypeBadge, RCMBadge, ExportButtons,
  SortableTH, EmptyState, INPUT_S, SELECT_S, BTN_GHOST, BTN_PRIMARY, PeriodPills,
} from './GSTShared.jsx'

// ── Shared sort hook ──────────────────────────────────────────
function useSort(data, defaultKey = '') {
  const [sortKey, setSortKey] = useState(defaultKey)
  const [sortDir, setSortDir] = useState('asc')

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const sorted = useMemo(() => {
    if (!sortKey) return data
    return [...data].sort((a, b) => {
      const v1 = a[sortKey], v2 = b[sortKey]
      const cmp = typeof v1 === 'number' ? v1 - v2 : String(v1 ?? '').localeCompare(String(v2 ?? ''))
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [data, sortKey, sortDir])

  return { sorted, sortKey, sortDir, handleSort }
}

// ── Filter by date range ──────────────────────────────────────
function filterByDate(rows, fromDate, toDate, dateField = 'date') {
  return rows.filter(r => {
    const d = new Date(r[dateField])
    if (isNaN(d)) return true
    if (fromDate && d < new Date(fromDate)) return false
    if (toDate   && d > new Date(toDate))   return false
    return true
  })
}

// ── Hover row style ───────────────────────────────────────────
function HoverRow({ children, onClick }) {
  const [hov, setHov] = useState(false)
  return (
    <tr
      className="focusable-row"
      data-focus-item="true"
      tabIndex={0}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={onClick}
      onKeyDown={(event) => {
        if ((event.key === 'Enter' || event.key === ' ') && onClick) {
          event.preventDefault()
          onClick()
        }
      }}
      style={{ background: hov ? 'var(--surface-2)' : 'transparent', transition: 'background .08s, box-shadow .14s ease', cursor: onClick ? 'pointer' : 'default', outline: 'none' }}
    >
      {React.Children.map(children, (child) => (
        React.isValidElement(child)
          ? React.cloneElement(child, {
              className: [child.props.className, 'focusable-row-cell'].filter(Boolean).join(' '),
            })
          : child
      ))}
    </tr>
  )
}

// ══════════════════════════════════════════════════════════════
// 1. BILL-WISE GST REPORT
// ══════════════════════════════════════════════════════════════
export function BillwiseGSTReport({ processedSales }) {
  const [fromDate, setFromDate] = useState('')
  const [toDate,   setToDate]   = useState('')
  const [search,   setSearch]   = useState('')
  const [typeFilter, setTypeFilter] = useState('All')

  const types = ['All', 'sale', 'credit_note', 'debit_note', 'purchase']

  const filtered = useMemo(() => {
    let rows = filterByDate(processedSales, fromDate, toDate)
    if (typeFilter !== 'All') rows = rows.filter(r => r.invoiceType === typeFilter)
    if (search) rows = rows.filter(r => r.id.toLowerCase().includes(search.toLowerCase()) || r.party.toLowerCase().includes(search.toLowerCase()))
    return rows
  }, [processedSales, fromDate, toDate, search, typeFilter])

  const { sorted, sortKey, sortDir, handleSort } = useSort(filtered, 'date')

  const totals = useMemo(() => ({
    taxable:  round2(filtered.reduce((s, r) => s + r.subtotal,    0)),
    cgst:     round2(filtered.reduce((s, r) => s + r.totalCGST,   0)),
    sgst:     round2(filtered.reduce((s, r) => s + r.totalSGST,   0)),
    igst:     round2(filtered.reduce((s, r) => s + r.totalIGST,   0)),
    totalGST: round2(filtered.reduce((s, r) => s + r.totalGST,    0)),
    total:    round2(filtered.reduce((s, r) => s + (r.invoiceTotal || r.total || 0), 0)),
  }), [filtered])

  const handleExportPDF = () => {
    const lines = [
      `${BUSINESS.name} — Bill-wise GST Report`,
      `GSTIN: ${BUSINESS.gstin}  |  Generated: ${new Date().toLocaleString('en-IN')}`,
      '─'.repeat(90),
      '',
      `${'Invoice'.padEnd(20)}${'Date'.padEnd(15)}${'Party'.padEnd(25)}${'Taxable'.padStart(12)}${'CGST'.padStart(10)}${'SGST'.padStart(10)}${'IGST'.padStart(10)}${'Total'.padStart(12)}`,
      '─'.repeat(90),
      ...filtered.map(r =>
        `${r.id.padEnd(20)}${fmtDate(r.date).padEnd(15)}${r.party.slice(0, 24).padEnd(25)}${String(r.subtotal.toFixed(2)).padStart(12)}${String(r.totalCGST.toFixed(2)).padStart(10)}${String(r.totalSGST.toFixed(2)).padStart(10)}${String(r.totalIGST.toFixed(2)).padStart(10)}${String((r.invoiceTotal||r.total||0).toFixed(2)).padStart(12)}`
      ),
      '─'.repeat(90),
      `${'TOTAL'.padEnd(60)}${String(totals.taxable.toFixed(2)).padStart(12)}${String(totals.cgst.toFixed(2)).padStart(10)}${String(totals.sgst.toFixed(2)).padStart(10)}${String(totals.igst.toFixed(2)).padStart(10)}${String(totals.total.toFixed(2)).padStart(12)}`,
    ]
    exportPlainTextReport('BillwiseGST', lines)
  }

  const cols = [
    { key: 'id',        label: 'Invoice No',    right: false },
    { key: 'date',      label: 'Date',          right: false },
    { key: 'party',     label: 'Party',         right: false },
    { key: 'buyerGSTIN',label: 'GSTIN',         right: false },
    { key: 'supplyType',label: 'Type',          right: false, sortable: false },
    { key: 'subtotal',  label: 'Taxable Amt',   right: true  },
    { key: 'totalCGST', label: 'CGST',          right: true  },
    { key: 'totalSGST', label: 'SGST',          right: true  },
    { key: 'totalIGST', label: 'IGST',          right: true  },
    { key: 'totalGST',  label: 'Total Tax',     right: true  },
    { key: 'invoiceTotal', label: 'Inv. Total', right: true  },
  ]

  return (
    <div className="animate-slide">
      <GSTFilters fromDate={fromDate} setFromDate={setFromDate} toDate={toDate} setToDate={setToDate} onClear={() => { setFromDate(''); setToDate(''); setSearch(''); setTypeFilter('All') }}>
        <GSTFilterField label="Type">
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={SELECT_S}>
            {types.map(t => <option key={t} value={t}>{t === 'All' ? 'All Types' : t.replace('_', ' ')}</option>)}
          </select>
        </GSTFilterField>
        <GSTFilterField label="Search">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Invoice / party…" style={{ ...INPUT_S, width: 150 }} />
        </GSTFilterField>
      </GSTFilters>

      <GSTTableWrapper>
        <GSTCardHead
          title={`Bill-wise GST (${filtered.length} records)`}
          right={<ExportButtons onCSV={() => exportBillwiseGSTCSV(filtered)} onPDF={handleExportPDF} />}
        />
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {cols.map(c => (
                c.sortable === false
                  ? <th key={c.key} style={{ ...S.th, textAlign: c.right ? 'right' : 'left' }}>{c.label}</th>
                  : <SortableTH key={c.key} colKey={c.key} label={c.label} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} right={c.right} />
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? <EmptyState /> : sorted.map(r => (
              <HoverRow key={r.id}>
                <td style={{ ...S.td, fontFamily: 'var(--mono)', fontSize: 12.5, fontWeight: 600 }}>{r.id}</td>
                <td style={{ ...S.td, color: 'var(--ink-60)' }}>{fmtDate(r.date)}</td>
                <td style={{ ...S.td, fontWeight: 500 }}>{r.party}</td>
                <td style={{ ...S.td, fontFamily: 'var(--mono)', fontSize: 11.5, color: r.buyerGSTIN ? 'var(--ink-60)' : 'var(--ink-20)' }}>{r.buyerGSTIN || 'Unregistered'}</td>
                <td style={S.td}><SupplyBadge type={r.supplyType} /> {r.rcm && <RCMBadge />} <InvoiceTypeBadge type={r.invoiceType} /></td>
                <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--mono)' }}>{fmtRs(r.subtotal)}</td>
                <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--mono)', color: '#1e40af' }}>{r.totalCGST > 0 ? fmtRs(r.totalCGST) : '—'}</td>
                <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--mono)', color: '#1e40af' }}>{r.totalSGST > 0 ? fmtRs(r.totalSGST) : '—'}</td>
                <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--mono)', color: '#7c3aed' }}>{r.totalIGST > 0 ? fmtRs(r.totalIGST) : '—'}</td>
                <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 600 }}>{fmtRs(r.totalGST)}</td>
                <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 700 }}>{fmtRs(r.invoiceTotal || r.total || 0)}</td>
              </HoverRow>
            ))}
          </tbody>
          {sorted.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={5} style={{ ...S.tfootTd }}>TOTAL ({filtered.length})</td>
                <td style={{ ...S.tfootTd, textAlign: 'right', fontFamily: 'var(--mono)' }}>{fmtRs(totals.taxable)}</td>
                <td style={{ ...S.tfootTd, textAlign: 'right', fontFamily: 'var(--mono)', color: '#1e40af' }}>{fmtRs(totals.cgst)}</td>
                <td style={{ ...S.tfootTd, textAlign: 'right', fontFamily: 'var(--mono)', color: '#1e40af' }}>{fmtRs(totals.sgst)}</td>
                <td style={{ ...S.tfootTd, textAlign: 'right', fontFamily: 'var(--mono)', color: '#7c3aed' }}>{fmtRs(totals.igst)}</td>
                <td style={{ ...S.tfootTd, textAlign: 'right', fontFamily: 'var(--mono)' }}>{fmtRs(totals.totalGST)}</td>
                <td style={{ ...S.tfootTd, textAlign: 'right', fontFamily: 'var(--mono)' }}>{fmtRs(totals.total)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </GSTTableWrapper>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// 2. GSTR-1 REPORT
// ══════════════════════════════════════════════════════════════
export function GSTR1Report({ processedSales }) {
  const [tab, setTab] = useState('b2b')
  const gstr1 = useMemo(() => buildGSTR1(processedSales), [processedSales])

  const tabs = [
    { id: 'b2b',  label: `B2B (${gstr1.b2b.length})` },
    { id: 'b2c',  label: `B2C (${gstr1.b2c.length})` },
    { id: 'cdnr', label: `CDNR (${gstr1.cdnr.length})` },
    { id: 'hsn',  label: `HSN (${gstr1.hsn.length})` },
  ]

  return (
    <div className="animate-slide">
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 16, background: 'var(--surface-3)', padding: 4, borderRadius: 'var(--r-md)', border: '1px solid var(--border)', width: 'fit-content' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '7px 16px', borderRadius: 'var(--r-sm)', border: 'none', fontFamily: 'var(--font)', fontSize: 13, fontWeight: tab === t.id ? 600 : 400, cursor: 'pointer', transition: 'all .12s', background: tab === t.id ? 'var(--surface)' : 'transparent', color: tab === t.id ? 'var(--ink)' : 'var(--ink-40)', boxShadow: tab === t.id ? 'var(--shadow-xs)' : 'none' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'b2b'  && <GSTR1B2B rows={gstr1.b2b} onExport={() => exportGSTR1CSV(gstr1)} />}
      {tab === 'b2c'  && <GSTR1B2C rows={gstr1.b2c} />}
      {tab === 'cdnr' && <GSTR1CDNR rows={gstr1.cdnr} />}
      {tab === 'hsn'  && <HSNSummaryTable rows={gstr1.hsn} />}
    </div>
  )
}

function GSTR1B2B({ rows, onExport }) {
  const { sorted, sortKey, sortDir, handleSort } = useSort(rows, 'invoiceDate')
  const totals = { taxable: round2(rows.reduce((s, r) => s + r.taxableValue, 0)), cgst: round2(rows.reduce((s, r) => s + r.cgst, 0)), sgst: round2(rows.reduce((s, r) => s + r.sgst, 0)), igst: round2(rows.reduce((s, r) => s + r.igst, 0)), value: round2(rows.reduce((s, r) => s + r.invoiceValue, 0)) }
  return (
    <GSTTableWrapper>
      <GSTCardHead title="B2B — Supplies to Registered Buyers" sub="GSTR-1 Table 4" right={<ExportButtons onCSV={onExport} />} />
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr>
          {[['GSTIN', false], ['Party', false], ['Invoice No', false], ['Date', false], ['Invoice Value', true], ['RC', false], ['Taxable', true], ['CGST', true], ['SGST', true], ['IGST', true]].map(([h, right]) => (
            <th key={h} style={{ ...S.th, textAlign: right ? 'right' : 'left' }}>{h}</th>
          ))}
        </tr></thead>
        <tbody>
          {sorted.length === 0 ? <EmptyState msg="No B2B invoices" /> : sorted.map(r => (
            <HoverRow key={r.invoiceNo}>
              <td style={{ ...S.td, fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--ink-60)' }}>{r.gstin}</td>
              <td style={{ ...S.td, fontWeight: 500 }}>{r.partyName}</td>
              <td style={{ ...S.td, fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600 }}>{r.invoiceNo}</td>
              <td style={{ ...S.td, color: 'var(--ink-60)' }}>{fmtDate(r.invoiceDate)}</td>
              <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 700 }}>{fmtRs(r.invoiceValue)}</td>
              <td style={S.td}>{r.reverseCharge === 'Y' && <RCMBadge />}</td>
              <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--mono)' }}>{fmtRs(r.taxableValue)}</td>
              <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--mono)', color: '#1e40af' }}>{r.cgst > 0 ? fmtRs(r.cgst) : '—'}</td>
              <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--mono)', color: '#1e40af' }}>{r.sgst > 0 ? fmtRs(r.sgst) : '—'}</td>
              <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--mono)', color: '#7c3aed' }}>{r.igst > 0 ? fmtRs(r.igst) : '—'}</td>
            </HoverRow>
          ))}
        </tbody>
        {sorted.length > 0 && (
          <tfoot><tr>
            <td colSpan={4} style={S.tfootTd}>TOTAL</td>
            <td style={{ ...S.tfootTd, textAlign: 'right', fontFamily: 'var(--mono)' }}>{fmtRs(totals.value)}</td>
            <td style={S.tfootTd} />
            <td style={{ ...S.tfootTd, textAlign: 'right', fontFamily: 'var(--mono)' }}>{fmtRs(totals.taxable)}</td>
            <td style={{ ...S.tfootTd, textAlign: 'right', fontFamily: 'var(--mono)', color: '#1e40af' }}>{fmtRs(totals.cgst)}</td>
            <td style={{ ...S.tfootTd, textAlign: 'right', fontFamily: 'var(--mono)', color: '#1e40af' }}>{fmtRs(totals.sgst)}</td>
            <td style={{ ...S.tfootTd, textAlign: 'right', fontFamily: 'var(--mono)', color: '#7c3aed' }}>{fmtRs(totals.igst)}</td>
          </tr></tfoot>
        )}
      </table>
    </GSTTableWrapper>
  )
}

function GSTR1B2C({ rows }) {
  const totals = { taxable: round2(rows.reduce((s, r) => s + r.taxableValue, 0)), cgst: round2(rows.reduce((s, r) => s + r.cgst, 0)), sgst: round2(rows.reduce((s, r) => s + r.sgst, 0)), igst: round2(rows.reduce((s, r) => s + r.igst, 0)) }
  return (
    <GSTTableWrapper>
      <GSTCardHead title="B2C — Supplies to Unregistered Buyers" sub="GSTR-1 Table 7" />
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr>{[['Supply Type', false], ['Taxable Value', true], ['CGST', true], ['SGST', true], ['IGST', true], ['Invoice Value', true]].map(([h, right]) => <th key={h} style={{ ...S.th, textAlign: right ? 'right' : 'left' }}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.length === 0 ? <EmptyState msg="No B2C invoices" /> : rows.map((r, i) => (
            <HoverRow key={i}>
              <td style={S.td}><SupplyBadge type={r.supplyType} /></td>
              <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--mono)' }}>{fmtRs(r.taxableValue)}</td>
              <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--mono)', color: '#1e40af' }}>{r.cgst > 0 ? fmtRs(r.cgst) : '—'}</td>
              <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--mono)', color: '#1e40af' }}>{r.sgst > 0 ? fmtRs(r.sgst) : '—'}</td>
              <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--mono)', color: '#7c3aed' }}>{r.igst > 0 ? fmtRs(r.igst) : '—'}</td>
              <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 700 }}>{fmtRs(r.invoiceValue)}</td>
            </HoverRow>
          ))}
        </tbody>
      </table>
    </GSTTableWrapper>
  )
}

function GSTR1CDNR({ rows }) {
  return (
    <GSTTableWrapper>
      <GSTCardHead title="CDNR — Credit / Debit Notes (Registered)" sub="GSTR-1 Table 9" />
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr>{[['GSTIN', false], ['Party', false], ['Note No', false], ['Date', false], ['Type', false], ['Taxable', true], ['CGST', true], ['SGST', true], ['IGST', true]].map(([h, right]) => <th key={h} style={{ ...S.th, textAlign: right ? 'right' : 'left' }}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.length === 0 ? <EmptyState msg="No credit/debit notes" /> : rows.map(r => (
            <HoverRow key={r.noteNo}>
              <td style={{ ...S.td, fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--ink-60)' }}>{r.gstin || '—'}</td>
              <td style={{ ...S.td, fontWeight: 500 }}>{r.partyName}</td>
              <td style={{ ...S.td, fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600 }}>{r.noteNo}</td>
              <td style={{ ...S.td, color: 'var(--ink-60)' }}>{fmtDate(r.noteDate)}</td>
              <td style={S.td}><span style={{ fontWeight: 700, color: r.noteType === 'C' ? '#b91c1c' : '#92400e', fontSize: 12 }}>{r.noteType === 'C' ? '▼ Credit' : '▲ Debit'}</span></td>
              <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--mono)' }}>{fmtRs(r.taxableValue)}</td>
              <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--mono)', color: '#1e40af' }}>{r.cgst > 0 ? fmtRs(r.cgst) : '—'}</td>
              <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--mono)', color: '#1e40af' }}>{r.sgst > 0 ? fmtRs(r.sgst) : '—'}</td>
              <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--mono)', color: '#7c3aed' }}>{r.igst > 0 ? fmtRs(r.igst) : '—'}</td>
            </HoverRow>
          ))}
        </tbody>
      </table>
    </GSTTableWrapper>
  )
}

// ══════════════════════════════════════════════════════════════
// 3. GSTR-3B REPORT
// ══════════════════════════════════════════════════════════════
export function GSTR3BReport({ gstr3b, itcData }) {
  const { table31, table4, table5 } = gstr3b

  const Section = ({ title, children }) => (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)', marginBottom: 16 }}>
      <div style={{ padding: '11px 18px', background: '#111', color: '#fff', fontSize: 13, fontWeight: 700 }}>{title}</div>
      <div style={{ padding: '16px 18px' }}>{children}</div>
    </div>
  )

  const Row3B = ({ label, cgst, sgst, igst, bold }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 12, padding: '9px 0', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
      <span style={{ fontSize: 13, fontWeight: bold ? 700 : 400, color: bold ? 'var(--ink)' : 'var(--ink-60)' }}>{label}</span>
      <span style={{ textAlign: 'right', fontSize: 13, fontWeight: bold ? 700 : 500, fontFamily: 'var(--mono)' }}>{fmtRs(round2((cgst || 0) + (sgst || 0) + (igst || 0)))}</span>
      <span style={{ textAlign: 'right', fontSize: 13, fontFamily: 'var(--mono)', color: '#1e40af' }}>{fmtRs(cgst || 0)}</span>
      <span style={{ textAlign: 'right', fontSize: 13, fontFamily: 'var(--mono)', color: '#1e40af' }}>{fmtRs(sgst || 0)}</span>
      <span style={{ textAlign: 'right', fontSize: 13, fontFamily: 'var(--mono)', color: '#7c3aed' }}>{fmtRs(igst || 0)}</span>
    </div>
  )

  return (
    <div className="animate-slide">
      {/* Column headers */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 12, padding: '8px 18px', marginBottom: 8 }}>
        {['Description', 'Total', 'CGST (₹)', 'SGST (₹)', 'IGST (₹)'].map((h, i) => (
          <div key={h} style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-40)', textTransform: 'uppercase', letterSpacing: '.06em', textAlign: i > 0 ? 'right' : 'left' }}>{h}</div>
        ))}
      </div>

      <Section title="3.1 — Outward Taxable Supplies">
        <Row3B label="(a) Taxable Outward Supplies" cgst={table31.outwardTaxable.cgst} sgst={table31.outwardTaxable.sgst} igst={table31.outwardTaxable.igst} />
        <Row3B label="(b) Zero-rated (Export / SEZ)" cgst={0} sgst={0} igst={table31.zeroRated.igst} />
        <Row3B label="(c) Nil / Exempted Supplies" cgst={0} sgst={0} igst={0} />
        <Row3B label="(d) Inward Supplies (RCM)" cgst={0} sgst={0} igst={0} />
      </Section>

      <Section title="4 — Eligible Input Tax Credit">
        <Row3B label="(A)(3) Inward Supplies (other than above)" cgst={table4.itcAvailable.inward.cgst} sgst={table4.itcAvailable.inward.sgst} igst={table4.itcAvailable.inward.igst} />
        <Row3B label="(A)(4) Inward Supplies Attracting RCM" cgst={0} sgst={0} igst={0} />
        <Row3B label="Total ITC Available" cgst={table4.itcAvailable.inward.cgst} sgst={table4.itcAvailable.inward.sgst} igst={table4.itcAvailable.inward.igst} bold />
      </Section>

      <Section title="5 — Values of Exempt, Nil-rated and Non-GST Inward Supplies">
        <Row3B label="Inter-State Supplies" cgst={0} sgst={0} igst={0} />
        <Row3B label="Intra-State Supplies" cgst={0} sgst={0} igst={0} />
      </Section>

      {/* Net payable summary */}
      <div style={{ background: '#111', borderRadius: 'var(--r-lg)', padding: '20px 24px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
        {[
          { label: 'Net CGST Payable', value: fmtRs(table5.netCGST), color: '#93c5fd' },
          { label: 'Net SGST Payable', value: fmtRs(table5.netSGST), color: '#93c5fd' },
          { label: 'Net IGST Payable', value: fmtRs(table5.netIGST), color: '#c4b5fd' },
          { label: 'Total Payable',    value: fmtRs(table5.netTotal), color: '#fff', size: 20 },
        ].map(({ label, value, color, size }) => (
          <div key={label}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: size || 16, fontWeight: 700, color, fontFamily: 'var(--mono)' }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// 4. PARTY-WISE GST
// ══════════════════════════════════════════════════════════════
export function PartyGSTReport({ processedSales }) {
  const [selected, setSelected] = useState(null)
  const partyRows = useMemo(() => buildPartyWiseGST(processedSales.filter(i => i.invoiceType === 'sale')), [processedSales])
  const { sorted, sortKey, sortDir, handleSort } = useSort(partyRows, 'invoiceTotal')

  if (selected) {
    const invoices = processedSales.filter(i => i.party === selected)
    return (
      <div className="animate-slide">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
          <button onClick={() => setSelected(null)} style={BTN_GHOST}>← Party List</button>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-.4px' }}>{selected}</h2>
            <p style={{ fontSize: 12, color: 'var(--ink-40)' }}>Party GST ledger — {invoices.length} invoices</p>
          </div>
        </div>
        <BillwiseGSTReport processedSales={invoices} />
      </div>
    )
  }

  return (
    <div className="animate-slide">
      <GSTTableWrapper>
        <GSTCardHead
          title="Party-wise GST Summary"
          sub="Click any party to drill into their invoice ledger"
          right={<ExportButtons onCSV={() => exportPartyCSV(sorted)} />}
        />
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>
            <SortableTH colKey="partyName"    label="Party Name"    sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
            <th style={S.th}>GSTIN</th>
            <SortableTH colKey="invoiceCount" label="Invoices"      sortKey={sortKey} sortDir={sortDir} onSort={handleSort} right />
            <SortableTH colKey="taxableValue" label="Taxable Value" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} right />
            <SortableTH colKey="cgst"         label="CGST"          sortKey={sortKey} sortDir={sortDir} onSort={handleSort} right />
            <SortableTH colKey="sgst"         label="SGST"          sortKey={sortKey} sortDir={sortDir} onSort={handleSort} right />
            <SortableTH colKey="igst"         label="IGST"          sortKey={sortKey} sortDir={sortDir} onSort={handleSort} right />
            <SortableTH colKey="totalGST"     label="Total GST"     sortKey={sortKey} sortDir={sortDir} onSort={handleSort} right />
            <SortableTH colKey="invoiceTotal" label="Total Value"   sortKey={sortKey} sortDir={sortDir} onSort={handleSort} right />
          </tr></thead>
          <tbody>
            {sorted.length === 0 ? <EmptyState /> : sorted.map(r => (
              <HoverRow key={r.partyName} onClick={() => setSelected(r.partyName)}>
                <td style={{ ...S.td, fontWeight: 600, color: '#1e40af' }}>{r.partyName} <span style={{ fontSize: 11, color: 'var(--ink-20)' }}>→</span></td>
                <td style={{ ...S.td, fontFamily: 'var(--mono)', fontSize: 11.5, color: r.gstin ? 'var(--ink-60)' : 'var(--ink-20)' }}>{r.gstin || 'Unregistered'}</td>
                <td style={{ ...S.td, textAlign: 'right' }}>{r.invoiceCount}</td>
                <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--mono)' }}>{fmtRs(r.taxableValue)}</td>
                <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--mono)', color: '#1e40af' }}>{r.cgst > 0 ? fmtRs(r.cgst) : '—'}</td>
                <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--mono)', color: '#1e40af' }}>{r.sgst > 0 ? fmtRs(r.sgst) : '—'}</td>
                <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--mono)', color: '#7c3aed' }}>{r.igst > 0 ? fmtRs(r.igst) : '—'}</td>
                <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 700 }}>{fmtRs(r.totalGST)}</td>
                <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 700 }}>{fmtRs(r.invoiceTotal)}</td>
              </HoverRow>
            ))}
          </tbody>
        </table>
      </GSTTableWrapper>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// 5. HSN-WISE SUMMARY
// ══════════════════════════════════════════════════════════════
export function HSNSummaryTable({ rows: _rows, processedSales }) {
  const rows = _rows || (processedSales ? buildHSNSummary(processedSales) : [])
  const { sorted, sortKey, sortDir, handleSort } = useSort(rows, 'hsnCode')

  return (
    <div className={!_rows ? 'animate-slide' : ''}>
      <GSTTableWrapper>
        <GSTCardHead
          title="HSN-wise Summary"
          sub="Item classification & rate-wise tax aggregation"
          right={<ExportButtons onCSV={() => exportHSNCSV(sorted)} />}
        />
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>
            <SortableTH colKey="hsnCode"     label="HSN Code"    sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
            <th style={S.th}>Description</th>
            <SortableTH colKey="gstRate"     label="GST %"       sortKey={sortKey} sortDir={sortDir} onSort={handleSort} right />
            <SortableTH colKey="quantity"    label="Total Qty"   sortKey={sortKey} sortDir={sortDir} onSort={handleSort} right />
            <SortableTH colKey="taxableValue"label="Taxable Amt" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} right />
            <SortableTH colKey="cgst"        label="CGST"        sortKey={sortKey} sortDir={sortDir} onSort={handleSort} right />
            <SortableTH colKey="sgst"        label="SGST"        sortKey={sortKey} sortDir={sortDir} onSort={handleSort} right />
            <SortableTH colKey="igst"        label="IGST"        sortKey={sortKey} sortDir={sortDir} onSort={handleSort} right />
            <SortableTH colKey="totalGST"    label="Total Tax"   sortKey={sortKey} sortDir={sortDir} onSort={handleSort} right />
          </tr></thead>
          <tbody>
            {sorted.length === 0 ? <EmptyState msg="No HSN data" /> : sorted.map(r => (
              <HoverRow key={`${r.hsnCode}_${r.gstRate}`}>
                <td style={{ ...S.td, fontFamily: 'var(--mono)', fontWeight: 700 }}>{r.hsnCode}</td>
                <td style={{ ...S.td, fontSize: 12, color: 'var(--ink-60)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.description}</td>
                <td style={{ ...S.td, textAlign: 'right' }}>
                  <span style={{ background: '#f0f0f0', border: '1px solid var(--border)', padding: '1px 7px', borderRadius: 99, fontSize: 11.5, fontFamily: 'var(--mono)', fontWeight: 500 }}>{r.gstRate}%</span>
                </td>
                <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--mono)' }}>{r.quantity}</td>
                <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--mono)' }}>{fmtRs(r.taxableValue)}</td>
                <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--mono)', color: '#1e40af' }}>{r.cgst > 0 ? fmtRs(r.cgst) : '—'}</td>
                <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--mono)', color: '#1e40af' }}>{r.sgst > 0 ? fmtRs(r.sgst) : '—'}</td>
                <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--mono)', color: '#7c3aed' }}>{r.igst > 0 ? fmtRs(r.igst) : '—'}</td>
                <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 700 }}>{fmtRs(r.totalGST)}</td>
              </HoverRow>
            ))}
          </tbody>
        </table>
      </GSTTableWrapper>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// 6. RCM TRANSACTIONS
// ══════════════════════════════════════════════════════════════
export function RCMReport({ processedSales }) {
  const rcmInvoices = processedSales.filter(i => i.rcm)
  const total = { taxable: round2(rcmInvoices.reduce((s, r) => s + r.subtotal, 0)), gst: round2(rcmInvoices.reduce((s, r) => s + r.totalGST, 0)) }

  return (
    <div className="animate-slide">
      <div className="kpi-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
        <div style={{ background: '#fefce8', border: '1px solid #fde047', borderRadius: 'var(--r-lg)', padding: '16px 18px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#854d0e', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>RCM Invoices</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#854d0e', fontFamily: 'var(--mono)' }}>{rcmInvoices.length}</div>
        </div>
        <div style={{ background: '#fefce8', border: '1px solid #fde047', borderRadius: 'var(--r-lg)', padding: '16px 18px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#854d0e', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Taxable Value</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#854d0e', fontFamily: 'var(--mono)' }}>{fmtRs(total.taxable)}</div>
        </div>
        <div style={{ background: '#fefce8', border: '1px solid #fde047', borderRadius: 'var(--r-lg)', padding: '16px 18px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#854d0e', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>RCM GST Payable</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#854d0e', fontFamily: 'var(--mono)' }}>{fmtRs(total.gst)}</div>
        </div>
      </div>
      <GSTTableWrapper>
        <GSTCardHead title="Reverse Charge Mechanism Transactions" sub="Liability to be paid by buyer under RCM" />
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>{[['Invoice No', false], ['Date', false], ['Supplier', false], ['GSTIN', false], ['Taxable', true], ['GST Rate', true], ['CGST', true], ['SGST', true], ['IGST', true]].map(([h, right]) => <th key={h} style={{ ...S.th, textAlign: right ? 'right' : 'left' }}>{h}</th>)}</tr></thead>
          <tbody>
            {rcmInvoices.length === 0 ? <EmptyState msg="No RCM transactions" /> : rcmInvoices.map(r => (
              <HoverRow key={r.id}>
                <td style={{ ...S.td, fontFamily: 'var(--mono)', fontWeight: 600 }}>{r.id} <RCMBadge /></td>
                <td style={{ ...S.td, color: 'var(--ink-60)' }}>{fmtDate(r.date)}</td>
                <td style={{ ...S.td, fontWeight: 500 }}>{r.party}</td>
                <td style={{ ...S.td, fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--ink-40)' }}>{r.buyerGSTIN || 'Unregistered'}</td>
                <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--mono)' }}>{fmtRs(r.subtotal)}</td>
                <td style={{ ...S.td, textAlign: 'right' }}>{r.enrichedItems[0]?.gstRate || 0}%</td>
                <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--mono)', color: '#1e40af' }}>{r.totalCGST > 0 ? fmtRs(r.totalCGST) : '—'}</td>
                <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--mono)', color: '#1e40af' }}>{r.totalSGST > 0 ? fmtRs(r.totalSGST) : '—'}</td>
                <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--mono)', color: '#7c3aed' }}>{r.totalIGST > 0 ? fmtRs(r.totalIGST) : '—'}</td>
              </HoverRow>
            ))}
          </tbody>
        </table>
      </GSTTableWrapper>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// 7. CREDIT / DEBIT NOTES
// ══════════════════════════════════════════════════════════════
export function CreditDebitNotes({ processedSales }) {
  const notes = processedSales.filter(i => i.invoiceType === 'credit_note' || i.invoiceType === 'debit_note')
  const creditTotal = round2(notes.filter(n => n.invoiceType === 'credit_note').reduce((s, n) => s + n.subtotal, 0))
  const debitTotal  = round2(notes.filter(n => n.invoiceType === 'debit_note').reduce((s, n) => s + n.subtotal, 0))

  return (
    <div className="animate-slide">
      <div className="kpi-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 'var(--r-lg)', padding: '16px 18px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#b91c1c', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Credit Notes</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#b91c1c', fontFamily: 'var(--mono)' }}>{notes.filter(n => n.invoiceType === 'credit_note').length}</div>
          <div style={{ fontSize: 12, color: '#b91c1c', marginTop: 4 }}>{fmtRs(creditTotal)}</div>
        </div>
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 'var(--r-lg)', padding: '16px 18px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Debit Notes</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#92400e', fontFamily: 'var(--mono)' }}>{notes.filter(n => n.invoiceType === 'debit_note').length}</div>
          <div style={{ fontSize: 12, color: '#92400e', marginTop: 4 }}>{fmtRs(debitTotal)}</div>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '16px 18px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-40)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Net Adjustment</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)', fontFamily: 'var(--mono)' }}>{fmtRs(debitTotal - creditTotal)}</div>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '16px 18px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-40)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>Total GST Adjusted</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)', fontFamily: 'var(--mono)' }}>{fmtRs(round2(notes.reduce((s, n) => s + n.totalGST, 0)))}</div>
        </div>
      </div>
      <GSTTableWrapper>
        <GSTCardHead title="Credit & Debit Notes Register" sub="Adjustments to original tax invoices" />
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>{[['Note No', false], ['Date', false], ['Type', false], ['Party', false], ['Ref Invoice', false], ['Taxable', true], ['CGST', true], ['SGST', true], ['IGST', true], ['Total GST', true]].map(([h, right]) => <th key={h} style={{ ...S.th, textAlign: right ? 'right' : 'left' }}>{h}</th>)}</tr></thead>
          <tbody>
            {notes.length === 0 ? <EmptyState msg="No credit/debit notes" /> : notes.map(n => (
              <HoverRow key={n.id}>
                <td style={{ ...S.td, fontFamily: 'var(--mono)', fontWeight: 600 }}>{n.id}</td>
                <td style={{ ...S.td, color: 'var(--ink-60)' }}>{fmtDate(n.date)}</td>
                <td style={S.td}><InvoiceTypeBadge type={n.invoiceType} /></td>
                <td style={{ ...S.td, fontWeight: 500 }}>{n.party}</td>
                <td style={{ ...S.td, fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--ink-40)' }}>{n.refInvoice || '—'}</td>
                <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--mono)' }}>{fmtRs(n.subtotal)}</td>
                <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--mono)', color: '#1e40af' }}>{n.totalCGST > 0 ? fmtRs(n.totalCGST) : '—'}</td>
                <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--mono)', color: '#1e40af' }}>{n.totalSGST > 0 ? fmtRs(n.totalSGST) : '—'}</td>
                <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--mono)', color: '#7c3aed' }}>{n.totalIGST > 0 ? fmtRs(n.totalIGST) : '—'}</td>
                <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 700 }}>{fmtRs(n.totalGST)}</td>
              </HoverRow>
            ))}
          </tbody>
        </table>
      </GSTTableWrapper>
    </div>
  )
}
