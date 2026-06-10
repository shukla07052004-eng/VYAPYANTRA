// ============================================================
// BizLedger Pro — Badge & Avatar Components
// ============================================================
import React from 'react'
import { initials, avatarBg } from '../../utils/helpers.js'

/* ── Badge ─────────────────────────────────────────────────── */
const BADGE_MAP = {
  Paid:     { bg: '#f0faf4', color: '#1a6b3c', border: '#c3e6d4' },
  Partial:  { bg: '#fffde7', color: '#92400e', border: '#fde68a' },
  Pending:  { bg: '#fff5f5', color: '#b91c1c', border: '#fecaca' },
  Overdue:  { bg: '#fff5f5', color: '#991b1b', border: '#feb2b2' },
  Unpaid:   { bg: '#fff5f5', color: '#b91c1c', border: '#fecaca' },
  Success:  { bg: '#f0faf4', color: '#1a6b3c', border: '#c3e6d4' },
  Manual:   { bg: '#f8f8f8', color: '#333',    border: '#e0e0e0' },
  Auto:     { bg: '#f0faf4', color: '#1a6b3c', border: '#c3e6d4' },
  Customer: { bg: '#f8f8f8', color: '#333',    border: '#e0e0e0' },
  Supplier: { bg: '#f2f2f2', color: '#555',    border: '#ddd'    },
  Both:     { bg: '#efefef', color: '#444',    border: '#ddd'    },
  Active:   { bg: '#f0faf4', color: '#1a6b3c', border: '#c3e6d4' },
  OK:       { bg: '#f0faf4', color: '#1a6b3c', border: '#c3e6d4' },
}

export function Badge({ status, children, style = {} }) {
  const s = BADGE_MAP[status] || { bg: '#f5f5f5', color: '#666', border: '#e0e0e0' }
  return (
    <span style={{
      display:     'inline-flex',
      alignItems:  'center',
      padding:     '2px 8px',
      borderRadius: 99,
      fontSize:    11.5,
      fontWeight:  500,
      background:  s.bg,
      color:       s.color,
      border:      `1px solid ${s.border}`,
      whiteSpace:  'nowrap',
      ...style,
    }}>
      {children || status}
    </span>
  )
}

/* ── Avatar ─────────────────────────────────────────────────── */
export function Avatar({ name = '', size = 32 }) {
  return (
    <div style={{
      width:          size,
      height:         size,
      borderRadius:   Math.round(size * .22),
      background:     avatarBg(name),
      color:          '#444',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      fontSize:       Math.round(size * .34),
      fontWeight:     700,
      flexShrink:     0,
      fontFamily:     'var(--mono)',
      border:         '1px solid var(--border)',
      userSelect:     'none',
    }}>
      {initials(name)}
    </div>
  )
}
