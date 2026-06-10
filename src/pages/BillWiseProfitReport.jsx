// ============================================================
// BizLedger Pro — Bill-wise Profit Report
// Pharma-focused distribution profit analytics
// Full features: expand rows, filters, PDF/Excel export,
// MRP vs Selling analysis, CA-grade summary
// ============================================================
import React, { useState, useMemo, useCallback } from 'react'
import {
  SAMPLE_BILLS,
  processBills,
  filterBills,
  getPartyOptions,
  fmtRs,
  fmtPct,
  fmtDate,
  exportToCSV,
  generatePDFText,
} from '../utils/billProfitHelpers.js'

// ── Tiny helpers ─────────────────────────────────────────────
const chevron = (open) => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
    style={{ transition: 'transform .18s', transform: open ? 'rotate(90deg)' : 'rotate(0deg)', flexShrink: 0 }}>
    <path d="M4 3l5 4-5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

// ── Margin color helper ───────────────────────────────────────
const marginColor = (pct) => {
  if (pct >= 25) return '#166534'    // dark green
  if (pct >= 15) return '#1a6b3c'    // green
  if (pct >= 8)  return '#92400e'    // amber
  return '#b91c1c'                    // red
}

const marginBg = (pct) => {
  if (pct >= 25) return '#dcfce7'
  if (pct >= 15) return '#f0faf4'
  if (pct >= 8)  return '#fffbeb'
  return '#fff5f5'
}

// ── Main Component ────────────────────────────────────────────
export default function BillWiseProfitReport({ onBack }) {
  // Filters
  const [fromDate,    setFromDate]    = useState('')
  const [toDate,      setToDate]      = useState('')
  const [party,       setParty]       = useState('All')
  const [search,      setSearch]      = useState('')
  const [showMrp,     setShowMrp]     = useState(false)   // toggle MRP column
  const [expandedRows, setExpandedRows] = useState(new Set())

  const partyOptions = useMemo(() => getPartyOptions(SAMPLE_BILLS), [])

  // Filter then process
  const filtered = useMemo(() =>
    filterBills(SAMPLE_BILLS, { fromDate, toDate, party, search }),
    [fromDate, toDate, party, search]
  )

  const { enriched, summary } = useMemo(() => processBills(filtered), [filtered])

  // Toggle expand
  const toggleRow = useCallback((billNo) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      next.has(billNo) ? next.delete(billNo) : next.add(billNo)
      return next
    })
  }, [])

  const collapseAll = () => setExpandedRows(new Set())
  const expandAll   = () => setExpandedRows(new Set(enriched.map(b => b.billNo)))

  // Export handlers
  const handleExportCSV = () => exportToCSV(enriched)

  const handleExportPDF = () => {
    const text = generatePDFText(enriched, summary)
    const blob = new Blob([text], { type: 'text/plain' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `BillWiseProfitReport_${new Date().toISOString().slice(0,10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="animate-slide" style={{ fontFamily: 'var(--font)' }}>

      {/* ── Page Header ─────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={onBack}
            style={{ background: 'none', border: '1px solid var(--border-2)', borderRadius: 'var(--r-sm)', padding: '6px 12px', cursor: 'pointer', fontSize: 13, color: 'var(--ink-60)', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            ← Reports
          </button>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-.6px', lineHeight: 1 }}>
              Bill-wise Profit Report
            </h1>
            <p style={{ fontSize: 13, color: 'var(--ink-40)', marginTop: 4 }}>
              Per-invoice profit analysis with item-level breakdown — Pharma Distribution
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <ExportBtn icon="⬇" label="Excel / CSV" onClick={handleExportCSV} />
          <ExportBtn icon="📄" label="PDF Report"  onClick={handleExportPDF} variant="primary" />
        </div>
      </div>

      {/* ── Summary Cards ───────────────────────────── */}
      <div className="kpi-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 22 }}>
        <SummaryCard label="Total Revenue"   value={fmtRs(summary.totalRevenue)}    sub={`${summary.billCount} bills`} />
        <SummaryCard label="Gross Profit"    value={fmtRs(summary.totalGrossProfit)} sub={`Disc: ${fmtRs(summary.totalDiscount)}`} highlight />
        <SummaryCard label="Net Profit"      value={fmtRs(summary.totalNetProfit)}   sub="After discounts" highlight />
        <SummaryCard label="Avg Margin"      value={fmtPct(summary.avgMarginPct)}    sub="Across all bills" pct={summary.avgMarginPct} />
      </div>

      {/* ── Filters ─────────────────────────────────── */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '14px 18px', marginBottom: 16, display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap', boxShadow: 'var(--shadow-xs)' }}>
        <FilterField label="From Date">
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} style={INPUT_STYLE} />
        </FilterField>
        <FilterField label="To Date">
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} style={INPUT_STYLE} />
        </FilterField>
        <FilterField label="Party">
          <select value={party} onChange={e => setParty(e.target.value)} style={INPUT_STYLE}>
            {partyOptions.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </FilterField>
        <FilterField label="Search Bill No">
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-20)', fontSize: 14, pointerEvents: 'none' }}>⌕</span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="INV-2025-…"
              style={{ ...INPUT_STYLE, paddingLeft: 30, width: 160 }}
            />
          </div>
        </FilterField>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          {/* MRP toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12.5, color: 'var(--ink-60)', userSelect: 'none', paddingBottom: 2 }}>
            <input type="checkbox" checked={showMrp} onChange={e => setShowMrp(e.target.checked)} style={{ cursor: 'pointer', accentColor: '#111', width: 14, height: 14 }} />
            MRP Column
          </label>
          <button
            onClick={() => { setFromDate(''); setToDate(''); setParty('All'); setSearch('') }}
            style={{ ...BTN_GHOST, fontSize: 12 }}
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* ── Expand / Collapse controls ───────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 12.5, color: 'var(--ink-40)' }}>
          Showing <strong style={{ color: 'var(--ink)' }}>{enriched.length}</strong> bill{enriched.length !== 1 ? 's' : ''}
          {enriched.length !== SAMPLE_BILLS.length && ` (filtered from ${SAMPLE_BILLS.length})`}
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={expandAll}   style={BTN_GHOST}>Expand All</button>
          <button onClick={collapseAll} style={BTN_GHOST}>Collapse All</button>
        </div>
      </div>

      {/* ── Main Table ──────────────────────────────── */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>

        {/* Table header */}
        <div style={{ display: 'grid', gridTemplateColumns: buildGridCols(showMrp), background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', padding: '0 0' }}>
          {buildHeaderCells(showMrp).map((h, i) => (
            <div key={i} style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: 'var(--ink-40)', textTransform: 'uppercase', letterSpacing: '.06em', textAlign: i >= 3 ? 'right' : 'left' }}>
              {h}
            </div>
          ))}
        </div>

        {enriched.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--ink-20)', fontSize: 13 }}>
            No bills match the current filters
          </div>
        ) : (
          enriched.map((bill, idx) => (
            <BillRow
              key={bill.billNo}
              bill={bill}
              expanded={expandedRows.has(bill.billNo)}
              onToggle={() => toggleRow(bill.billNo)}
              showMrp={showMrp}
              isLast={idx === enriched.length - 1}
            />
          ))
        )}

        {/* Totals footer */}
        {enriched.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: buildGridCols(showMrp), background: '#f8f8f8', borderTop: '2px solid #e0e0e0' }}>
            <div style={{ padding: '11px 14px', fontSize: 12, fontWeight: 700, color: 'var(--ink)', gridColumn: '1 / 4' }}>
              TOTAL ({enriched.length} bills)
            </div>
            <div style={{ padding: '11px 14px', textAlign: 'right', fontSize: 12.5, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--mono)' }}>
              {fmtRs(summary.totalRevenue)}
            </div>
            <div style={{ padding: '11px 14px', textAlign: 'right', fontSize: 12.5, fontWeight: 700, color: '#1a6b3c', fontFamily: 'var(--mono)' }}>
              {fmtRs(summary.totalNetProfit)}
            </div>
            <div style={{ padding: '11px 14px', textAlign: 'right', fontSize: 12.5, fontWeight: 700 }}>
              <span style={{ color: marginColor(summary.avgMarginPct), background: marginBg(summary.avgMarginPct), padding: '2px 8px', borderRadius: 99, fontSize: 11.5 }}>
                {fmtPct(summary.avgMarginPct)}
              </span>
            </div>
            {showMrp && (
              <div style={{ padding: '11px 14px', textAlign: 'right', fontSize: 12.5, fontWeight: 700, color: '#92400e', fontFamily: 'var(--mono)' }}>
                {fmtRs(summary.totalMrpDelta)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Legend ──────────────────────────────────── */}
      <div style={{ marginTop: 16, display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 11.5, color: 'var(--ink-40)' }}>
        <span>Margin Legend:</span>
        {[['≥25%','#166534','#dcfce7','Excellent'],['≥15%','#1a6b3c','#f0faf4','Good'],['≥8%','#92400e','#fffbeb','Moderate'],['<8%','#b91c1c','#fff5f5','Low']].map(([l,c,bg,t]) => (
          <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: c }} />
            <span style={{ color: c }}>{l}</span>
            <span style={{ color: 'var(--ink-20)' }}>({t})</span>
          </span>
        ))}
        <span style={{ marginLeft: 'auto' }}>
          * GST excluded from profit calculation per CA standards
        </span>
      </div>
    </div>
  )
}

// ── Bill Row (with expandable items) ─────────────────────────
function BillRow({ bill, expanded, onToggle, showMrp, isLast }) {
  const [hov, setHov] = useState(false)

  return (
    <>
      {/* Main bill row */}
      <div
        onClick={onToggle}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          display:         'grid',
          gridTemplateColumns: buildGridCols(showMrp),
          cursor:          'pointer',
          background:      expanded ? '#fafafa' : hov ? '#f9f9f9' : 'var(--surface)',
          borderBottom:    isLast && !expanded ? 'none' : '1px solid var(--border)',
          transition:      'background .09s',
        }}
      >
        {/* Bill No + expand icon */}
        <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: expanded ? 'var(--ink)' : 'var(--ink-40)', transition: 'color .1s' }}>
            {chevron(expanded)}
          </span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>
            {bill.billNo}
          </span>
        </div>

        {/* Date */}
        <div style={{ padding: '12px 14px', fontSize: 13, color: 'var(--ink-60)', display: 'flex', alignItems: 'center' }}>
          {fmtDate(bill.date)}
        </div>

        {/* Party */}
        <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <PartyBadge name={bill.partyName} />
          <span style={{ fontSize: 13, fontWeight: 500 }}>{bill.partyName}</span>
        </div>

        {/* Total Amount */}
        <div style={{ padding: '12px 14px', textAlign: 'right', fontSize: 13, fontWeight: 600, fontFamily: 'var(--mono)', color: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          {fmtRs(bill.totalAmount)}
        </div>

        {/* Net Profit */}
        <div style={{ padding: '12px 14px', textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--mono)', color: bill.netProfit >= 0 ? '#1a6b3c' : '#b91c1c' }}>
            {fmtRs(bill.netProfit)}
          </span>
          {bill.discount > 0 && (
            <span style={{ marginLeft: 5, fontSize: 10, color: 'var(--ink-20)' }} title={`Disc: ${fmtRs(bill.discount)}`}>
              -disc
            </span>
          )}
        </div>

        {/* Margin % */}
        <div style={{ padding: '12px 14px', textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          <span style={{
            fontSize: 12, fontWeight: 600, padding: '3px 9px', borderRadius: 99,
            color: marginColor(bill.marginPct), background: marginBg(bill.marginPct),
          }}>
            {fmtPct(bill.marginPct)}
          </span>
        </div>

        {/* MRP vs Selling (optional) */}
        {showMrp && (
          <div style={{ padding: '12px 14px', textAlign: 'right', fontSize: 13, fontWeight: 500, fontFamily: 'var(--mono)', color: '#92400e', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
            {fmtRs(bill.totalMrpVsSelling)}
          </div>
        )}
      </div>

      {/* Expanded: item-level breakdown */}
      {expanded && (
        <ItemBreakdown bill={bill} showMrp={showMrp} isLast={isLast} />
      )}
    </>
  )
}

// ── Item-level breakdown panel ────────────────────────────────
function ItemBreakdown({ bill, showMrp, isLast }) {
  return (
    <div style={{
      borderBottom:  isLast ? 'none' : '1px solid var(--border)',
      background:    '#fafafa',
    }}>
      {/* Item sub-header */}
      <div style={{
        display:             'grid',
        gridTemplateColumns: buildItemCols(showMrp),
        padding:             '6px 14px 6px 46px',
        borderBottom:        '1px solid var(--border)',
        background:          '#f3f3f3',
      }}>
        {buildItemHeaders(showMrp).map((h, i) => (
          <div key={i} style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--ink-40)', textTransform: 'uppercase', letterSpacing: '.06em', textAlign: i >= 2 ? 'right' : 'left' }}>
            {h}
          </div>
        ))}
      </div>

      {/* Item rows */}
      {bill.items.map((item, i) => (
        <div
          key={i}
          style={{
            display:             'grid',
            gridTemplateColumns: buildItemCols(showMrp),
            padding:             '9px 14px 9px 46px',
            borderBottom:        i < bill.items.length - 1 ? '1px solid #efefef' : 'none',
            alignItems:          'center',
          }}
        >
          {/* Product */}
          <div style={{ fontSize: 12.5, color: 'var(--ink)', fontWeight: 500 }}>
            {item.productName}
            <span style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 6, fontSize: 10, background: '#f0f0f0', color: 'var(--ink-40)', padding: '1px 6px', borderRadius: 99, border: '1px solid var(--border)', fontWeight: 500 }}>
              GST {item.gstPercentage}%
            </span>
          </div>

          {/* Qty */}
          <div style={{ fontSize: 12.5, color: 'var(--ink-60)', textAlign: 'right', fontFamily: 'var(--mono)' }}>
            {item.quantity}
          </div>

          {/* Purchase Price */}
          <div style={{ fontSize: 12.5, color: 'var(--ink-60)', textAlign: 'right', fontFamily: 'var(--mono)' }}>
            {fmtRs(item.purchasePrice)}
          </div>

          {/* Selling Price */}
          <div style={{ fontSize: 12.5, color: 'var(--ink)', textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 500 }}>
            {fmtRs(item.sellingPrice)}
          </div>

          {/* Item Profit */}
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, fontFamily: 'var(--mono)', color: item.itemProfit >= 0 ? '#1a6b3c' : '#b91c1c' }}>
              {fmtRs(item.itemProfit)}
            </span>
            <div style={{ fontSize: 10, color: marginColor(item.itemMarginPct), marginTop: 1 }}>
              {fmtPct(item.itemMarginPct)}
            </div>
          </div>

          {/* MRP vs Selling (optional) */}
          {showMrp && (
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 12.5, fontFamily: 'var(--mono)', color: '#92400e', fontWeight: 500 }}>
                {fmtRs(item.mrpVsSelling)}
              </span>
              {item.mrp && (
                <div style={{ fontSize: 10, color: 'var(--ink-40)', marginTop: 1 }}>
                  MRP {fmtRs(item.mrp)}
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Bill subtotals */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 24, padding: '10px 14px 10px 46px', background: '#f0f0f0', borderTop: '1px solid var(--border)' }}>
        <SubtotalChip label="Gross Profit"   value={fmtRs(bill.grossProfit)} color="#1a6b3c" />
        {bill.discount > 0 && <SubtotalChip label="Discount"     value={`− ${fmtRs(bill.discount)}`} color="#b91c1c" />}
        <SubtotalChip label="Net Profit"     value={fmtRs(bill.netProfit)}   color="#166534" bold />
        <SubtotalChip label="Margin"         value={fmtPct(bill.marginPct)}  color={marginColor(bill.marginPct)} bold />
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────
function SummaryCard({ label, value, sub, highlight, pct }) {
  return (
    <div style={{
      background:   'var(--surface)',
      border:       highlight ? '1px solid #c3e6d4' : '1px solid var(--border)',
      borderRadius: 'var(--r-lg)',
      padding:      '16px 18px',
      boxShadow:    'var(--shadow-sm)',
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-40)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{
        fontSize:   24,
        fontWeight: 800,
        color:      pct !== undefined ? marginColor(pct) : (highlight ? '#1a6b3c' : 'var(--ink)'),
        letterSpacing: '-.5px',
        lineHeight: 1,
        marginBottom: 6,
        fontFamily: 'var(--mono)',
      }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: 'var(--ink-40)' }}>{sub}</div>}
    </div>
  )
}

function PartyBadge({ name }) {
  const colors = ['#e8e8e8','#ebebeb','#e5e5e5','#ededed','#e2e2e2','#f0f0f0']
  const bg = colors[name.charCodeAt(0) % colors.length]
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div style={{ width: 26, height: 26, borderRadius: 5, background: bg, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#444', flexShrink: 0 }}>
      {initials}
    </div>
  )
}

function FilterField({ label, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-40)', textTransform: 'uppercase', letterSpacing: '.07em' }}>
        {label}
      </span>
      {children}
    </label>
  )
}

function ExportBtn({ icon, label, onClick, variant }) {
  const [hov, setHov] = useState(false)
  const isPrimary = variant === 'primary'
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display:      'inline-flex',
        alignItems:   'center',
        gap:          6,
        padding:      '7px 14px',
        borderRadius: 'var(--r-sm)',
        border:       isPrimary ? 'none' : '1px solid var(--border-2)',
        background:   isPrimary ? (hov ? '#333' : '#111') : (hov ? '#f3f3f3' : 'var(--surface)'),
        color:        isPrimary ? '#fff' : 'var(--ink-60)',
        fontSize:     13,
        fontWeight:   500,
        cursor:       'pointer',
        fontFamily:   'var(--font)',
        transition:   'background .12s',
      }}
    >
      {icon} {label}
    </button>
  )
}

function SubtotalChip({ label, value, color, bold }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
      <span style={{ fontSize: 10, color: 'var(--ink-40)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: bold ? 700 : 500, color, fontFamily: 'var(--mono)' }}>{value}</span>
    </div>
  )
}

// ── Grid layout helpers ───────────────────────────────────────
function buildGridCols(showMrp) {
  // BillNo | Date | Party | Amount | Profit | Margin | [MRP]
  return showMrp
    ? '160px 110px 1fr 130px 130px 110px 130px'
    : '160px 110px 1fr 130px 130px 110px'
}

function buildHeaderCells(showMrp) {
  const base = ['Bill No', 'Date', 'Party Name', 'Total Amount', 'Net Profit', 'Margin %']
  return showMrp ? [...base, 'MRP vs SP ↓'] : base
}

function buildItemCols(showMrp) {
  // Product | Qty | PP | SP | Profit | [MRP]
  return showMrp
    ? '1fr 70px 100px 100px 130px 130px'
    : '1fr 70px 100px 100px 130px'
}

function buildItemHeaders(showMrp) {
  const base = ['Product Name', 'Qty', 'Purch. Price', 'Sell. Price', 'Item Profit']
  return showMrp ? [...base, 'MRP vs SP'] : base
}

// ── Style constants ───────────────────────────────────────────
const INPUT_STYLE = {
  padding:     '7px 10px',
  border:      '1px solid var(--border-2)',
  borderRadius: 'var(--r-sm)',
  fontSize:    13,
  fontFamily:  'var(--font)',
  color:       'var(--ink)',
  background:  'var(--surface)',
  outline:     'none',
  cursor:      'text',
}

const BTN_GHOST = {
  padding:      '6px 12px',
  borderRadius: 'var(--r-sm)',
  border:       '1px solid var(--border-2)',
  background:   'var(--surface)',
  fontSize:     12,
  color:        'var(--ink-60)',
  cursor:       'pointer',
  fontFamily:   'var(--font)',
}
