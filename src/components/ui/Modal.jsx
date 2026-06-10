import React, { useEffect, useRef } from 'react'
import { useEscapeAction } from '../../context/EscapeContext.jsx'
import useFocusRestore from '../../hooks/useFocusRestore.js'

export default function Modal({
  open,
  onClose,
  title,
  children,
  width = 500,
  footer,
}) {
  const dialogRef = useRef(null)
  useFocusRestore({
    active: open,
    restore: (node) => node.focus({ preventScroll: true }),
  })

  useEscapeAction({
    active: open,
    priority: 100,
    handler: () => {
      onClose?.()
      return true
    },
  })

  useEffect(() => {
    if (!open) return undefined

    const handleKey = (event) => {
      if (event.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        )
        if (!focusable.length) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKey, true)
    document.body.style.overflow = 'hidden'
    requestAnimationFrame(() => {
      const firstFocusable = dialogRef.current?.querySelector('[data-autofocus="true"]')
        || dialogRef.current?.querySelector(
          'input, select, textarea, button:not([disabled]):not([data-modal-close="true"]), [tabindex]:not([tabindex="-1"])',
        )
      firstFocusable?.focus?.({ preventScroll: true })
    })

    return () => {
      document.removeEventListener('keydown', handleKey, true)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      onClick={onClose}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) event.preventDefault()
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,.38)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: 'clamp(10px, 4vw, 20px)',
        paddingTop: 'clamp(16px, 5vh, 40px)',
        overflowY: 'auto',
        animation: 'fadeIn .15s ease',
        backdropFilter: 'blur(2px)',
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        style={{
          background: 'var(--surface)',
          borderRadius: 'var(--r-lg)',
          width: '100%',
          maxWidth: width,
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-modal)',
          animation: 'modalIn .18s ease',
          margin: '0 auto',
        }}
      >
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
        >
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-.3px' }}>
            {title}
          </div>
          <button
            onClick={onClose}
            data-modal-close="true"
            onMouseDown={(event) => {
              event.preventDefault()
              event.stopPropagation()
            }}
            aria-label="Close modal"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--ink-40)',
              fontSize: 18,
              lineHeight: 1,
              padding: '4px 6px',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              transition: 'color .12s',
            }}
          >
            ×
          </button>
        </div>

        <div style={{
          padding: '20px',
          overflowY: 'auto',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
        >
          {children}
        </div>

        {footer && (
          <div style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
            flexShrink: 0,
          }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
