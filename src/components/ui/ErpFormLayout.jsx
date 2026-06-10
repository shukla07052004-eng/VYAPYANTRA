import React, { useRef } from 'react'
import { Card, CardBody, CardHead } from './Card.jsx'
import useAutoScrollOnFocus from '../../hooks/useAutoScrollOnFocus.js'

export function ErpFormPage({ title, sub, actions, sidebar, children, formProps }) {
  const formRef = useRef(null)
  useAutoScrollOnFocus(formRef)

  return (
    <form ref={formRef} {...formProps} style={{ display: 'grid', gap: 22, ...formProps?.style }}>
      <div
        style={{
          display: 'grid',
          gap: 18,
          gridTemplateColumns: 'minmax(0, 1fr) 320px',
          alignItems: 'start',
        }}
      >
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.8px', marginBottom: 6 }}>
            {title}
          </h1>
          {sub && <p style={{ fontSize: 13.5, color: 'var(--ink-40)', maxWidth: 760 }}>{sub}</p>}
        </div>
        {sidebar && <div>{sidebar}</div>}
      </div>

      {actions && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
          {actions}
        </div>
      )}

      {children}
    </form>
  )
}

export function ErpFormSection({ title, sub, right, children, bodyStyle }) {
  return (
    <Card>
      <CardHead title={title} sub={sub} right={right} />
      <CardBody style={{ display: 'grid', gap: 16, ...bodyStyle }}>
        {children}
      </CardBody>
    </Card>
  )
}

export function ErpStatCard({ label, value, sub }) {
  return (
    <Card style={{ height: '100%' }}>
      <CardBody style={{ display: 'grid', gap: 6 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-40)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
          {label}
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-1px' }}>
          {value}
        </div>
        {sub && <div style={{ fontSize: 12.5, color: 'var(--ink-40)' }}>{sub}</div>}
      </CardBody>
    </Card>
  )
}

export function ErpNote({ title, children }) {
  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-lg)',
        background: 'linear-gradient(180deg, var(--surface), var(--surface-2))',
        padding: '14px 16px',
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-40)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>
        {title}
      </div>
      <div style={{ fontSize: 13, color: 'var(--ink-60)', lineHeight: 1.6 }}>
        {children}
      </div>
    </div>
  )
}
