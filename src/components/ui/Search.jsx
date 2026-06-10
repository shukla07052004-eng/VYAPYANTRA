import React from 'react'

export function SearchInput({ value, onChange, placeholder = 'Search…', inputRef }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r-sm)',
      padding: '7px 10px',
      minWidth: 210,
    }}
    >
      <span style={{ color: 'var(--ink-20)', fontSize: 14 }}>⌕</span>
      <input
        ref={inputRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        style={{
          border: 'none',
          outline: 'none',
          background: 'transparent',
          width: '100%',
          fontSize: 12.5,
          color: 'var(--ink)',
          fontFamily: 'var(--font)',
        }}
      />
    </div>
  )
}

export function FilterPills({ options = [], value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {options.map((option) => {
        const active = option === value
        return (
          <button
            key={option}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onChange(option)}
            style={{
              border: '1px solid var(--border)',
              background: active ? 'var(--ink)' : 'var(--surface)',
              color: active ? '#fff' : 'var(--ink-40)',
              borderRadius: 999,
              padding: '6px 10px',
              fontSize: 11.5,
              cursor: 'pointer',
              fontFamily: 'var(--font)',
            }}
          >
            {option}
          </button>
        )
      })}
    </div>
  )
}
