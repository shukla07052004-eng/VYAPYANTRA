import React, { forwardRef, useState } from 'react'

const LABEL_STYLE = {
  fontSize: '11px',
  fontWeight: 600,
  color: 'var(--ink-40)',
  textTransform: 'uppercase',
  letterSpacing: '.07em',
  display: 'block',
  marginBottom: 5,
}

const INPUT_BASE = {
  width: '100%',
  padding: '8px 11px',
  border: '1px solid var(--border-2)',
  borderRadius: 'var(--r-sm)',
  fontSize: '13px',
  fontFamily: 'var(--font)',
  color: 'var(--ink)',
  background: 'var(--surface)',
  outline: 'none',
  transition: 'border-color .15s',
  lineHeight: 1.5,
}

export const Input = forwardRef(function Input({ label, error, style = {}, inputClassName, onFocus, onBlur, ...props }, ref) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {label && <span style={LABEL_STYLE}>{label}</span>}
      <input
        ref={ref}
        className={inputClassName}
        onFocus={(event) => {
          setFocused(true)
          onFocus?.(event)
        }}
        onBlur={(event) => {
          setFocused(false)
          onBlur?.(event)
        }}
        style={{
          ...INPUT_BASE,
          borderColor: error ? 'var(--red)' : focused ? '#888' : 'var(--border-2)',
          ...style,
        }}
        {...props}
      />
      {error && <span style={{ fontSize: 11, color: 'var(--red)', marginTop: 3 }}>{error}</span>}
    </div>
  )
})

export const Select = forwardRef(function Select({ label, options = [], error, style = {}, selectClassName, onFocus, onBlur, ...props }, ref) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {label && <span style={LABEL_STYLE}>{label}</span>}
      <select
        ref={ref}
        className={selectClassName}
        onFocus={(event) => {
          setFocused(true)
          onFocus?.(event)
        }}
        onBlur={(event) => {
          setFocused(false)
          onBlur?.(event)
        }}
        style={{
          ...INPUT_BASE,
          cursor: 'pointer',
          borderColor: error ? 'var(--red)' : focused ? '#888' : 'var(--border-2)',
          ...style,
        }}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value ?? option} value={option.value ?? option}>
            {option.label ?? option}
          </option>
        ))}
      </select>
      {error && <span style={{ fontSize: 11, color: 'var(--red)', marginTop: 3 }}>{error}</span>}
    </div>
  )
})

export const Textarea = forwardRef(function Textarea({ label, rows = 3, style = {}, textareaClassName, onFocus, onBlur, ...props }, ref) {
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {label && <span style={LABEL_STYLE}>{label}</span>}
      <textarea
        ref={ref}
        className={textareaClassName}
        rows={rows}
        onFocus={(event) => {
          setFocused(true)
          onFocus?.(event)
        }}
        onBlur={(event) => {
          setFocused(false)
          onBlur?.(event)
        }}
        style={{
          ...INPUT_BASE,
          resize: 'vertical',
          borderColor: focused ? '#888' : 'var(--border-2)',
          ...style,
        }}
        {...props}
      />
    </div>
  )
})

export function FormGrid({ cols = 2, children }) {
  return (
    <div
      className={`form-grid-${cols}`}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 12,
      }}
    >
      {children}
    </div>
  )
}
