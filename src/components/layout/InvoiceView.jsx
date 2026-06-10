// ============================================================
// BizLedger Pro — Professional Invoice View
// Print-ready, PDF-downloadable structured bill layout
// ============================================================
import React, { useEffect, useRef } from 'react'
import { BUSINESS } from '../../data/store.js'
import { fmt }      from '../../utils/helpers.js'
import { Badge }    from '../ui/index.js'
import Button       from '../ui/Button.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { useEscapeAction } from '../../context/EscapeContext.jsx'
import useFocusRestore from '../../hooks/useFocusRestore.js'

export default function InvoiceView({ invoice, onClose }) {
  const toast = useToast()
  const overlayRef = useRef(null)
  useFocusRestore({
    active: Boolean(invoice),
    restore: (node) => node.focus({ preventScroll: true }),
  })

  const handlePrint = () => window.print()

  const handleDownloadPDF = () => {
    // In production: use jsPDF or backend PDF generation
    toast('PDF download started', 'success')
    window.print()
  }

  useEscapeAction({
    active: Boolean(invoice),
    priority: 100,
    handler: () => {
      onClose?.()
      return true
    },
  })

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    requestAnimationFrame(() => {
      overlayRef.current?.querySelector('button')?.focus({ preventScroll: true })
    })
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  return (
    <div
      ref={overlayRef}
      style={{
        position:   'fixed',
        inset:      0,
        background: 'rgba(0,0,0,.45)',
        zIndex:     2000,
        display:    'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding:    '24px 20px',
        overflowY:  'auto',
        animation:  'fadeIn .15s ease',
      }}
    >
      <div style={{ width: '100%', maxWidth: 780 }}>

        {/* ── Action bar ── */}
        <div
          className="no-print"
          style={{
            display:        'flex',
            gap:            8,
            marginBottom:   14,
            justifyContent: 'space-between',
            alignItems:     'center',
          }}
        >
          <Button variant="ghost" onClick={onClose}>← Back</Button>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="ghost" onClick={handlePrint}>🖨  Print</Button>
            <Button variant="primary" onClick={handleDownloadPDF}>⬇  Download PDF</Button>
          </div>
        </div>

        {/* ── Invoice document ── */}
        <div style={{
          background:   '#fff',
          border:       '1px solid #e0e0e0',
          borderRadius: 8,
          overflow:     'hidden',
          boxShadow:    '0 4px 28px rgba(0,0,0,.12)',
        }}>

          {/* Header band */}
          <div style={{
            padding:        '32px 40px 28px',
            borderBottom:   '2px solid #111',
            display:        'flex',
            justifyContent: 'space-between',
            alignItems:     'flex-start',
          }}>
            {/* Left: Business */}
            <div>
              <div style={{
                fontSize:      24,
                fontWeight:    800,
                letterSpacing: '-1px',
                color:         '#111',
                marginBottom:  8,
              }}>
                {BUSINESS.name}
              </div>
              <div style={{
                fontSize:   12.5,
                color:      '#666',
                lineHeight: 1.8,
                fontFamily: "'IBM Plex Mono', monospace",
              }}>
                {BUSINESS.address}<br />
                GSTIN: {BUSINESS.gstin}<br />
                Ph: {BUSINESS.phone}  ·  {BUSINESS.email}
              </div>
            </div>

            {/* Right: Invoice meta */}
            <div style={{ textAlign: 'right' }}>
              <div style={{
                fontSize:      30,
                fontWeight:    800,
                color:         '#111',
                letterSpacing: '-1px',
                marginBottom:  6,
              }}>
                INVOICE
              </div>
              <div style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize:   13.5,
                color:      '#555',
                fontWeight: 600,
                marginBottom: 6,
              }}>
                {invoice.id}
              </div>
              <table style={{ marginLeft: 'auto', fontSize: 12, color: '#888', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ paddingRight: 10, paddingBottom: 3 }}>Invoice Date</td>
                    <td style={{ fontWeight: 600, color: '#333', textAlign: 'right', paddingBottom: 3 }}>
                      {invoice.date}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ paddingRight: 10 }}>Due Date</td>
                    <td style={{ fontWeight: 600, color: '#333', textAlign: 'right' }}>
                      {invoice.dueDate || '—'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Bill To + Status */}
          <div style={{
            padding:             '22px 40px',
            borderBottom:        '1px solid #f0f0f0',
            display:             'grid',
            gridTemplateColumns: '1fr auto',
            gap:                 24,
            alignItems:          'flex-start',
          }}>
            <div>
              <div style={{
                fontSize:      10,
                fontWeight:    700,
                color:         '#bbb',
                textTransform: 'uppercase',
                letterSpacing: '.1em',
                marginBottom:  8,
              }}>
                Bill To
              </div>
              <div style={{
                fontSize:   15,
                fontWeight: 700,
                color:      '#111',
                marginBottom: 4,
              }}>
                {invoice.party}
              </div>
              <div style={{
                fontSize:   12.5,
                color:      '#666',
                lineHeight: 1.8,
                fontFamily: "'IBM Plex Mono', monospace",
              }}>
                {invoice.city && <>{invoice.city}<br /></>}
                {invoice.phone && <>Ph: {invoice.phone}<br /></>}
                {invoice.gstin && <>GSTIN: {invoice.gstin}</>}
              </div>
            </div>
            <div>
              <Badge status={invoice.status} style={{ fontSize: 12.5, padding: '5px 14px' }} />
            </div>
          </div>

          {/* Items table */}
          <div style={{ padding: '24px 40px', borderBottom: '1px solid #f0f0f0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #111' }}>
                  {['#', 'Description', 'Qty', 'Rate (₹)', 'Amount (₹)'].map((h, i) => (
                    <th key={h} style={{
                      padding:       '7px 0 10px',
                      textAlign:     i >= 2 ? 'right' : i === 0 ? 'center' : 'left',
                      paddingLeft:   i === 1 ? 12 : 0,
                      fontSize:      11,
                      fontWeight:    700,
                      color:         '#111',
                      textTransform: 'uppercase',
                      letterSpacing: '.07em',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f5f5f5' }}>
                    <td style={{
                      padding:   '13px 0',
                      textAlign: 'center',
                      fontSize:  12,
                      color:     '#bbb',
                    }}>
                      {i + 1}
                    </td>
                    <td style={{
                      padding:    '13px 12px',
                      fontSize:   13.5,
                      color:      '#111',
                      fontWeight: 500,
                    }}>
                      {item.desc}
                    </td>
                    <td style={{
                      padding:   '13px 0',
                      textAlign: 'right',
                      fontSize:  13,
                      color:     '#555',
                    }}>
                      {item.qty}
                    </td>
                    <td style={{
                      padding:    '13px 0',
                      textAlign:  'right',
                      fontSize:   13,
                      color:      '#555',
                      fontFamily: "'IBM Plex Mono', monospace",
                    }}>
                      {Number(item.rate).toLocaleString('en-IN')}
                    </td>
                    <td style={{
                      padding:    '13px 0',
                      textAlign:  'right',
                      fontSize:   13.5,
                      fontWeight: 600,
                      color:      '#111',
                      fontFamily: "'IBM Plex Mono', monospace",
                    }}>
                      {Number(item.amount).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div style={{
            padding:        '22px 40px 28px',
            display:        'flex',
            justifyContent: 'flex-end',
          }}>
            <div style={{ width: 270 }}>
              <TotalRow label="Subtotal" value={fmt(invoice.subtotal)} />
              {invoice.tax > 0 && (
                <TotalRow label={`GST / Tax (${invoice.taxPct || ''}%)`} value={fmt(invoice.tax)} />
              )}
              <div style={{ borderTop: '2px solid #111', marginTop: 10, paddingTop: 10 }}>
                <TotalRow
                  label="Grand Total"
                  value={fmt(invoice.total)}
                  bold
                  size={16}
                />
              </div>
              {invoice.paid > 0 && (
                <>
                  <TotalRow
                    label="Amount Paid"
                    value={`− ${fmt(invoice.paid)}`}
                    color="#1a6b3c"
                    style={{ marginTop: 8 }}
                  />
                  <div style={{ borderTop: '1.5px solid #e0e0e0', marginTop: 8, paddingTop: 8 }}>
                    <TotalRow
                      label="Balance Due"
                      value={fmt(invoice.total - invoice.paid)}
                      bold
                      color={invoice.total - invoice.paid > 0 ? '#b91c1c' : '#1a6b3c'}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Bank & Notes */}
          <div style={{
            padding:    '18px 40px 22px',
            background: '#fafafa',
            borderTop:  '1px solid #f0f0f0',
            display:    'grid',
            gridTemplateColumns: '1fr 1fr',
            gap:        32,
          }}>
            <div>
              <div style={{
                fontSize:      10,
                fontWeight:    700,
                color:         '#bbb',
                textTransform: 'uppercase',
                letterSpacing: '.1em',
                marginBottom:  6,
              }}>
                Payment Details
              </div>
              <div style={{
                fontSize:   12.5,
                color:      '#666',
                lineHeight: 1.9,
                fontFamily: "'IBM Plex Mono', monospace",
              }}>
                Bank: {BUSINESS.bank}<br />
                A/C:  {BUSINESS.account}<br />
                IFSC: {BUSINESS.ifsc}
              </div>
            </div>
            {invoice.notes && (
              <div>
                <div style={{
                  fontSize:      10,
                  fontWeight:    700,
                  color:         '#bbb',
                  textTransform: 'uppercase',
                  letterSpacing: '.1em',
                  marginBottom:  6,
                }}>
                  Notes
                </div>
                <div style={{ fontSize: 12.5, color: '#666', lineHeight: 1.7 }}>
                  {invoice.notes}
                </div>
              </div>
            )}
          </div>

          {/* Footer strip */}
          <div style={{
            padding:        '14px 40px',
            background:     '#111',
            display:        'flex',
            justifyContent: 'space-between',
            alignItems:     'center',
          }}>
            <span style={{ fontSize: 12, color: '#888' }}>
              Thank you for your business
            </span>
            <span style={{
              fontSize:   12,
              color:      '#888',
              fontFamily: "'IBM Plex Mono', monospace",
            }}>
              {BUSINESS.name} · {BUSINESS.gstin}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Helper row ─────────────────────────────────────────── */
function TotalRow({ label, value, bold, size = 13, color, style = {} }) {
  return (
    <div style={{
      display:        'flex',
      justifyContent: 'space-between',
      alignItems:     'center',
      marginBottom:   7,
      ...style,
    }}>
      <span style={{ fontSize: size, color: color || '#888' }}>{label}</span>
      <span style={{
        fontSize:   size,
        fontWeight: bold ? 700 : 500,
        color:      color || '#111',
        fontFamily: "'IBM Plex Mono', monospace",
      }}>
        {value}
      </span>
    </div>
  )
}
