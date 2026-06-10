// ============================================================
// BizLedger Pro — Shared GST Components
// Reusable across all GST report sections
// ============================================================
import React, { useState } from 'react'
import { fmtRs, fmtDate } from '../../utils/gstEngine.js'

// ── Style tokens ─────────────────────────────────────────────
export const S = {
  th: { padding: '9px 13px', fontSize: '11px', fontWeight: 700, color: 'var(--ink-40)', textTransform: 'uppercase', letterSpacing: '.06em', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', userSelect: 'none' },
  td: { padding: '10px 13px', fontSize: 13, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' },
  tfootTd: { padding: '10px 13px', fontSize: 12.5, fontWeight: 700, background: '#f5f5f5', borderTop: '2px solid #d4d4d4', whiteSpace: 'nowrap' },
}

// ── GSTCard ───────────────────────────────────────────────────
export function GSTCard({ label, value, sub, color = 'var(--ink)', border }) {
  return (
    <div className="focusable-card focus-stick-shell" data-focus-item="true" tabIndex={0} style={{ background: 'var(--surface)', border: border ? `1px solid ${border}` : '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '16px 18px', boxShadow: 'var(--shadow-sm)', outline: 'none' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-40)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color, fontFamily: 'var(--mono)', letterSpacing: '-.5px', lineHeight: 1, marginBottom: 5 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--ink-40)' }}>{sub}</div>}
    </div>
  )
}

// ── GSTBadge (supply type) ────────────────────────────────────
export function SupplyBadge({ type }) {
  const cfg = type === 'INTRA'
    ? { bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe', label: 'Intra-State' }
    : { bg: '#f5f3ff', color: '#7c3aed', border: '#ddd6fe', label: 'Inter-State' }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 99, fontSize: 11.5, fontWeight: 500, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
      {cfg.label}
    </span>
  )
}

// ── Type badge (invoice, credit note etc) ─────────────────────
export function InvoiceTypeBadge({ type }) {
  const map = {
    sale:           { label: 'Sale',         bg: '#f0faf4', color: '#166534', border: '#c3e6d4' },
    purchase:       { label: 'Purchase',     bg: '#f0f9ff', color: '#0369a1', border: '#bae6fd' },
    credit_note:    { label: 'Credit Note',  bg: '#fff5f5', color: '#b91c1c', border: '#fecaca' },
    debit_note:     { label: 'Debit Note',   bg: '#fffbeb', color: '#92400e', border: '#fde68a' },
    sale_return:    { label: 'Sale Return',  bg: '#fff5f5', color: '#b91c1c', border: '#fecaca' },
    purchase_return:{ label: 'Purch Return', bg: '#f5f3ff', color: '#7c3aed', border: '#ddd6fe' },
  }
  const c = map[type] || { label: type, bg: '#f5f5f5', color: '#666', border: '#ddd' }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
      {c.label}
    </span>
  )
}

// ── RCM Badge ─────────────────────────────────────────────────
export function RCMBadge() {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '1px 7px', borderRadius: 99, fontSize: 10.5, fontWeight: 700, background: '#fefce8', color: '#854d0e', border: '1px solid #fde047', letterSpacing: '.04em' }}>
      RCM
    </span>
  )
}

// ── GSTTableWrapper ───────────────────────────────────────────
export function GSTTableWrapper({ children }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {children}
      </div>
    </div>
  )
}

// ── GSTCardHead ───────────────────────────────────────────────
export function GSTCardHead({ title, sub, right }) {
  return (
    <div style={{ padding: '13px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>{title}</div>
        {sub && <div style={{ fontSize: 11.5, color: 'var(--ink-40)', marginTop: 1 }}>{sub}</div>}
      </div>
      {right && <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>{right}</div>}
    </div>
  )
}

// ── GSTFilter bar ─────────────────────────────────────────────
export function GSTFilters({ fromDate, setFromDate, toDate, setToDate, children, onClear }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '13px 18px', marginBottom: 14, display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap', boxShadow: 'var(--shadow-xs)' }}>
      <GSTFilterField label="From">
        <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} style={INPUT_S} />
      </GSTFilterField>
      <GSTFilterField label="To">
        <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} style={INPUT_S} />
      </GSTFilterField>
      {children}
      <button onClick={onClear} style={BTN_GHOST}>Clear</button>
    </div>
  )
}

export function GSTFilterField({ label, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-40)', textTransform: 'uppercase', letterSpacing: '.07em' }}>{label}</span>
      {children}
    </label>
  )
}

// ── Sortable column header ────────────────────────────────────
export function SortableTH({ label, colKey, sortKey, sortDir, onSort, right }) {
  const active = sortKey === colKey
  return (
    <th onClick={() => onSort(colKey)} style={{ ...S.th, textAlign: right ? 'right' : 'left', cursor: 'pointer' }}>
      {label}
      {active && <span style={{ marginLeft: 4, opacity: .7 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>}
    </th>
  )
}

// ── Export buttons ────────────────────────────────────────────
export function ExportButtons({ onCSV, onPDF }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <ExportBtn icon="⬇" label="CSV" onClick={onCSV} />
      {onPDF && <ExportBtn icon="📄" label="PDF" onClick={onPDF} primary />}
    </div>
  )
}

function ExportBtn({ icon, label, onClick, primary }) {
  const [hov, setHov] = useState(false)
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 13px', borderRadius: 'var(--r-sm)', border: primary ? 'none' : '1px solid var(--border-2)', background: primary ? (hov ? '#333' : '#111') : (hov ? '#f3f3f3' : 'var(--surface)'), color: primary ? '#fff' : 'var(--ink-60)', fontSize: 12.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font)', transition: 'background .12s' }}>
      {icon} {label}
    </button>
  )
}

// ── Period filter pills ───────────────────────────────────────
export function PeriodPills({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {['All', 'This Month', 'Q1', 'Q2', 'Q3', 'Q4', 'FY'].map(p => (
        <button key={p} onClick={() => onChange(p)} style={{ padding: '4px 10px', borderRadius: 99, fontSize: 11.5, fontWeight: 500, border: '1px solid', cursor: 'pointer', fontFamily: 'var(--font)', transition: 'all .1s', background: value === p ? 'var(--ink)' : 'transparent', borderColor: value === p ? 'var(--ink)' : 'var(--border-2)', color: value === p ? '#fff' : 'var(--ink-40)' }}>
          {p}
        </button>
      ))}
    </div>
  )
}

// ── GST summary footer row ────────────────────────────────────
export function TotalsRow({ cols, values }) {
  return (
    <tr>
      {cols.map((c, i) => (
        <td key={i} style={{ ...S.tfootTd, textAlign: c.right ? 'right' : 'left', color: c.color || 'var(--ink)', fontFamily: c.mono ? 'var(--mono)' : 'var(--font)' }}>
          {values[i]}
        </td>
      ))}
    </tr>
  )
}

// ── Empty state ───────────────────────────────────────────────
export function EmptyState({ msg = 'No records found' }) {
  return (
    <tr>
      <td colSpan={99} style={{ padding: 48, textAlign: 'center', color: 'var(--ink-20)', fontSize: 13 }}>
        {msg}
      </td>
    </tr>
  )
}

// ── Shared style constants ────────────────────────────────────
export const INPUT_S = {
  padding: '7px 10px', border: '1px solid var(--border-2)', borderRadius: 'var(--r-sm)',
  fontSize: 13, fontFamily: 'var(--font)', color: 'var(--ink)', background: 'var(--surface)', outline: 'none', cursor: 'text',
}

export const SELECT_S = { ...INPUT_S, cursor: 'pointer', minWidth: 140 }

export const BTN_GHOST = {
  padding: '7px 13px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border-2)',
  background: 'var(--surface)', fontSize: 12.5, color: 'var(--ink-60)', cursor: 'pointer',
  fontFamily: 'var(--font)', fontWeight: 500,
}

export const BTN_PRIMARY = { ...BTN_GHOST, background: '#111', color: '#fff', border: 'none' }
