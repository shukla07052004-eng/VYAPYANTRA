import React from 'react'
import { FormGrid, Input, Select, Textarea } from '../components/ui/Form.jsx'

export { FormGrid, Input, Select, Textarea }

export function FieldRow({ label, action }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
        {label}
      </div>
      {action}
    </div>
  )
}

export function CheckboxField({ label, values = [], selected = [], onToggle, soft = false }) {
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
        {label}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {values.map((value) => {
          const active = selected.includes(value)
          return (
            <button
              key={value}
              type="button"
              onClick={() => onToggle(value)}
              style={{
                border: `1px solid ${active ? (soft ? '#3d5a80' : 'var(--ink)') : 'var(--border)'}`,
                background: active ? (soft ? '#e8eef5' : '#111') : '#fff',
                color: active ? (soft ? '#1a2f45' : '#fff') : 'var(--ink-60)',
                borderRadius: soft ? 8 : 0,
                padding: soft ? '7px 12px' : '6px 10px',
                fontSize: 11.5,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font)',
              }}
            >
              {value}
            </button>
          )
        })}
      </div>
    </div>
  )
}
