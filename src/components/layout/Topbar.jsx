import React from 'react'
import { useNavigate } from 'react-router-dom'
import { BUSINESS } from '../../data/store.js'

export default function Topbar({
  onNewInvoice,
  onNewPurchase,
  onNewParty,
  searchRef,
  compact = false,
}) {
  const navigate = useNavigate()
  const now = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <header
      className={compact ? 'topbar-focus-mode' : ''}
      style={{
        height: 'var(--topbar-h)',
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        position: 'sticky',
        top: 0,
        zIndex: 300,
        boxShadow: 'var(--shadow-xs)',
        gap: 10,
      }}
    >
      <div
        onClick={() => navigate('/dashboard')}
        onMouseDown={(event) => event.preventDefault()}
        style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: compact ? 10 : 18, cursor: 'pointer', userSelect: 'none' }}
      >
        <div style={{ width: 26, height: 26, borderRadius: 5, background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 9, fontWeight: 700, fontFamily: 'var(--mono)' }}>
          VP
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-.4px', lineHeight: 1 }}>VYAPPYANTRA</div>
          <div style={{ fontSize: 9, color: 'var(--ink-20)', textTransform: 'uppercase', letterSpacing: '.08em' }}>PRO</div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div className="topbar-search" style={{ display: compact ? 'none' : 'flex', alignItems: 'center', gap: 8, background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '5px 11px', width: 215, minWidth: 140 }}>
          <span style={{ color: 'var(--ink-20)', fontSize: 15 }}>o</span>
          <input
            ref={searchRef}
            placeholder="Search...  Ctrl+K"
            aria-label="Global search"
            style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 12.5, color: 'var(--ink)', width: '100%', fontFamily: 'var(--font)' }}
          />
        </div>

        <div style={{ display: compact ? 'none' : 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: 'var(--ink-20)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Quick Actions</span>
          <button onClick={onNewInvoice} onMouseDown={suppressMouseDown} style={PRIMARY_ACTION_STYLE}>+ Invoice</button>
          <button onClick={onNewPurchase} onMouseDown={suppressMouseDown} style={SECONDARY_ACTION_STYLE}>+ Purchase</button>
          <button onClick={onNewParty} onMouseDown={suppressMouseDown} style={SECONDARY_ACTION_STYLE}>+ Party</button>
        </div>
      </div>

      <div style={{ padding: '7px 10px', borderRadius: 'var(--r-sm)', background: 'var(--surface-2)', border: '1px solid var(--border)', fontSize: 11.5, color: 'var(--ink-40)', whiteSpace: 'nowrap' }}>
        Fixed sidebar workspace
      </div>

      <div className="topbar-date" style={{ fontSize: 12, color: 'var(--ink-20)', fontFamily: 'var(--mono)', userSelect: 'none' }}>
        {now}
      </div>

      <div style={{ width: 30, height: 30, borderRadius: 'var(--r-sm)', background: 'var(--ink)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, fontFamily: 'var(--mono)', userSelect: 'none' }}>
        {BUSINESS.initials}
      </div>
    </header>
  )
}

function suppressMouseDown(event) {
  event.preventDefault()
  event.stopPropagation()
}

const PRIMARY_ACTION_STYLE = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  background: 'var(--ink)',
  color: '#fff',
  border: 'none',
  borderRadius: 'var(--r-sm)',
  padding: '7px 12px',
  fontSize: 12.5,
  fontWeight: 600,
}

const SECONDARY_ACTION_STYLE = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  background: 'var(--surface)',
  color: 'var(--ink-60)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--r-sm)',
  padding: '7px 12px',
  fontSize: 12,
  fontWeight: 600,
}
