// ============================================================
// BizLedger Pro — Toast Context
// ============================================================
import React, { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const toast = useCallback((msg, type = 'info') => {
    const id = Date.now() + Math.random()
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
  }, [])

  const dismiss = useCallback((id) => {
    setToasts(t => t.filter(x => x.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

/* ── Toast Container UI ─────────────────────────────────── */
function ToastContainer({ toasts, onDismiss }) {
  return (
    <div
      className="no-print"
      style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: 8,
        pointerEvents: 'none',
      }}
    >
      {toasts.map(t => (
        <div
          key={t.id}
          onClick={() => onDismiss(t.id)}
          style={{
            background: '#fff',
            border: '1px solid #e4e4e4',
            borderLeft: `3px solid ${
              t.type === 'error'   ? '#b91c1c' :
              t.type === 'success' ? '#1a6b3c' : '#111'
            }`,
            padding: '10px 14px',
            borderRadius: 5,
            fontSize: 13,
            color: '#111',
            boxShadow: '0 4px 16px rgba(0,0,0,.10)',
            minWidth: 240, maxWidth: 320,
            animation: 'toastIn .22s ease',
            fontFamily: "'IBM Plex Sans', sans-serif",
            pointerEvents: 'all',
            cursor: 'pointer',
            lineHeight: 1.5,
          }}
        >
          {t.msg}
        </div>
      ))}
    </div>
  )
}
