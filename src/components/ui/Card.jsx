// ============================================================
// BizLedger Pro — Card Components
// ============================================================
import React from 'react'

/* ── Card ─────────────────────────────────────────────────── */
export function Card({ children, style = {}, className, onClick, ...props }) {
  return (
    <div
      className={className}
      onClick={onClick}
      {...props}
      style={{
        background:   'var(--surface)',
        border:       '1px solid var(--border)',
        borderRadius: 'var(--r-lg)',
        overflow:     'hidden',
        boxShadow:    'var(--shadow-sm)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

/* ── CardHead ─────────────────────────────────────────────── */
export function CardHead({ title, sub, right }) {
  return (
    <div className="card-head-wrap" style={{
      padding:        '13px 18px',
      borderBottom:   '1px solid var(--border)',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'space-between',
      gap:            12,
      flexWrap:       'wrap',
    }}>
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-.2px' }}>
          {title}
        </div>
        {sub && (
          <div style={{ fontSize: 11.5, color: 'var(--ink-40)', marginTop: 1 }}>
            {sub}
          </div>
        )}
      </div>
      {right && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
          {right}
        </div>
      )}
    </div>
  )
}

/* ── CardBody ─────────────────────────────────────────────── */
export function CardBody({ children, style = {}, ...props }) {
  return (
    <div {...props} style={{ padding: '16px 18px', ...style }}>
      {children}
    </div>
  )
}

/* ── KpiCard ──────────────────────────────────────────────── */
export function KpiCard({ label, value, sub, trend, trendUp, style = {} }) {
  return (
    <Card style={style}>
      <div style={{ padding: '16px 18px' }}>
        <div style={{
          fontSize:      '11px',
          fontWeight:    600,
          color:         'var(--ink-40)',
          textTransform: 'uppercase',
          letterSpacing: '.07em',
          marginBottom:  9,
        }}>
          {label}
        </div>
        <div style={{
          fontSize:      26,
          fontWeight:    700,
          letterSpacing: '-1px',
          color:         'var(--ink)',
          lineHeight:    1,
          marginBottom:  6,
        }}>
          {value}
        </div>
        {trend !== undefined && (
          <div style={{
            fontSize: 12,
            color:    trendUp ? 'var(--green)' : 'var(--red)',
            display:  'flex',
            alignItems: 'center',
            gap: 3,
          }}>
            <span>{trendUp ? '▲' : '▼'}</span>
            <span>{trend}</span>
          </div>
        )}
        {sub && (
          <div style={{ fontSize: 12, color: 'var(--ink-40)', marginTop: 3 }}>{sub}</div>
        )}
      </div>
    </Card>
  )
}

/* ── PageHeader ───────────────────────────────────────────── */
export function PageHeader({ title, sub, right }) {
  return (
    <div className="page-header-wrap" style={{
      display:        'flex',
      alignItems:     'flex-start',
      justifyContent: 'space-between',
      marginBottom:   22,
      gap:            16,
      flexWrap:       'wrap',
    }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-.6px', lineHeight: 1 }}>
          {title}
        </h1>
        {sub && (
          <p style={{ fontSize: 13, color: 'var(--ink-40)', marginTop: 5 }}>{sub}</p>
        )}
      </div>
      {right && (
        <div className="page-header-right" style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
          {right}
        </div>
      )}
    </div>
  )
}
