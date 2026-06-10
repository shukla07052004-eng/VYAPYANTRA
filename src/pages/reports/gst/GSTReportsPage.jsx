// ============================================================
// BizLedger Pro — GST Reports Main Page
// Marg ERP-style layout: left sidebar nav + content panel
// All 8 sections driven by real gstEngine.js calculations
// ============================================================
import React, { useEffect, useMemo, useState } from 'react'
import {
  processInvoice, calcITC, calcNetGST, buildGSTR3B,
  fmtRs, round2,
} from '../../../utils/gstEngine.js'
import {
  GST_INVOICES, GST_PURCHASES, SELLER_GSTIN,
} from '../../../data/gstData.js'
import { BUSINESS } from '../../../data/store.js'
import useKeyboardListNavigation from '../../../hooks/useKeyboardListNavigation.js'
import { useEscapeAction } from '../../../context/EscapeContext.jsx'

import GSTDashboard   from '../../../components/gst/GSTDashboard.jsx'
import {
  BillwiseGSTReport, GSTR1Report, GSTR3BReport,
  PartyGSTReport, HSNSummaryTable, RCMReport, CreditDebitNotes,
} from '../../../components/gst/GSTReportSections.jsx'

// ── Sidebar nav items ─────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'dashboard',  icon: '◈', label: 'GST Dashboard',      sub: 'Overview & monthly' },
  { id: 'billwise',   icon: '▦', label: 'Bill-wise GST',       sub: 'Invoice breakup'   },
  { id: 'gstr1',      icon: '①', label: 'GSTR-1',              sub: 'Outward supplies'  },
  { id: 'gstr3b',     icon: '③', label: 'GSTR-3B',             sub: 'Summary return'    },
  { id: 'partywise',  icon: '◑', label: 'Party-wise GST',      sub: 'Ledger per party'  },
  { id: 'hsn',        icon: '▣', label: 'HSN Summary',         sub: 'Item classification'},
  { id: 'rcm',        icon: '⚡', label: 'RCM Transactions',    sub: 'Reverse charge'    },
  { id: 'notes',      icon: '↕', label: 'Credit / Debit Notes', sub: 'Adjustments'      },
]

// ── Section titles for breadcrumb ─────────────────────────────
const TITLES = {
  dashboard: 'GST Dashboard',
  billwise:  'Bill-wise GST Report',
  gstr1:     'GSTR-1 Report',
  gstr3b:    'GSTR-3B Report',
  partywise: 'Party-wise GST',
  hsn:       'HSN-wise Summary',
  rcm:       'RCM Transactions',
  notes:     'Credit / Debit Notes',
}

export default function GSTReportsPage({ onBack }) {
  const [active, setActive] = useState('dashboard')
  const sidebarFocus = useKeyboardListNavigation({
    orientation: 'vertical',
    onSelect: (_, index) => setActive(NAV_ITEMS[index]?.id ?? 'dashboard'),
    onLeaveForward: () => {
      const contentFocused = contentFocus.focusFirst()
      return contentFocused
    },
  })
  const contentFocus = useKeyboardListNavigation({
    orientation: 'vertical',
    selector: '[data-focus-item="true"]',
    onLeaveBackward: () => {
      const index = NAV_ITEMS.findIndex((item) => item.id === active)
      return sidebarFocus.focusItem(index >= 0 ? index : 0)
    },
    onEscape: () => {
      onBack?.()
      return true
    },
  })

  // ── Process all invoices once ─────────────────────────────
  const processedSales = useMemo(() =>
    GST_INVOICES.map(inv => processInvoice(inv, SELLER_GSTIN)),
    []
  )

  const itcData = useMemo(() =>
    calcITC(GST_PURCHASES, SELLER_GSTIN),
    []
  )

  const outputTotals = useMemo(() => {
    const sales = processedSales.filter(i => i.invoiceType !== 'credit_note' && i.invoiceType !== 'debit_note')
    return {
      totalCGST: round2(sales.reduce((s, i) => s + i.totalCGST, 0)),
      totalSGST: round2(sales.reduce((s, i) => s + i.totalSGST, 0)),
      totalIGST: round2(sales.reduce((s, i) => s + i.totalIGST, 0)),
      totalGST:  round2(sales.reduce((s, i) => s + i.totalGST,  0)),
    }
  }, [processedSales])

  const netGST = useMemo(() =>
    calcNetGST(outputTotals, itcData),
    [outputTotals, itcData]
  )

  const gstr3b = useMemo(() =>
    buildGSTR3B(processedSales, itcData),
    [processedSales, itcData]
  )

  useEscapeAction({
    active: true,
    priority: 45,
    handler: () => {
      onBack?.()
      return true
    },
  })

  useEffect(() => {
    requestAnimationFrame(() => {
      const activeElement = document.activeElement
      const contentRoot = document.getElementById('gst-content-zone')
      const sidebarRoot = document.getElementById('gst-sidebar-nav')
      const insideKnownZone = activeElement instanceof HTMLElement
        && (contentRoot?.contains(activeElement) || sidebarRoot?.contains(activeElement))

      if (!insideKnownZone) {
        const index = NAV_ITEMS.findIndex((item) => item.id === active)
        sidebarFocus.focusItem(index >= 0 ? index : 0)
      }
    })
  }, [active, sidebarFocus.focusItem])

  useEffect(() => {
    requestAnimationFrame(() => {
      contentFocus.refresh(0)
    })
  }, [active, contentFocus.refresh])

  // ── Render active section ─────────────────────────────────
  const renderSection = () => {
    switch (active) {
      case 'dashboard': return <GSTDashboard processedSales={processedSales} itcData={itcData} netGST={netGST} />
      case 'billwise':  return <BillwiseGSTReport processedSales={processedSales} />
      case 'gstr1':     return <GSTR1Report processedSales={processedSales} />
      case 'gstr3b':    return <GSTR3BReport gstr3b={gstr3b} itcData={itcData} />
      case 'partywise': return <PartyGSTReport processedSales={processedSales} />
      case 'hsn':       return <HSNSummaryTable processedSales={processedSales} />
      case 'rcm':       return <RCMReport processedSales={processedSales} />
      case 'notes':     return <CreditDebitNotes processedSales={processedSales} />
      default:          return null
    }
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - var(--topbar-h))', overflow: 'hidden', margin: '-26px -30px', fontFamily: 'var(--font)' }}>

      {/* ── Left Sidebar Nav ──────────────────────────── */}
      <aside style={{
        width:         260,
        flexShrink:    0,
        background:    '#0f0f0f',
        borderRight:   '1px solid #1c1c1c',
        display:       'flex',
        flexDirection: 'column',
        overflowY:     'auto',
      }}>
        {/* GST module header */}
        <div style={{ padding: '20px 20px 14px' }}>
          <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '1px solid rgba(255,255,255,.12)', borderRadius: 'var(--r-sm)', padding: '5px 10px', cursor: 'pointer', color: 'rgba(255,255,255,.45)', fontSize: 12, fontFamily: 'var(--font)', marginBottom: 16 }}>
            ← Reports
          </button>
          <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,.25)', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 4, fontWeight: 600 }}>GST Module</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', letterSpacing: '-.4px' }}>GST Reports</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', marginTop: 2 }}>FY {BUSINESS.fy}</div>
        </div>

        {/* Status pills */}
        <div style={{ padding: '0 16px 16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,.05)', borderRadius: 6, padding: '8px 12px' }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,.4)' }}>Output GST</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#93c5fd', fontFamily: 'var(--mono)' }}>{fmtRs(outputTotals.totalGST)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,.05)', borderRadius: 6, padding: '8px 12px' }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,.4)' }}>ITC</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#86efac', fontFamily: 'var(--mono)' }}>{fmtRs(itcData.itcTotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(185,28,28,.15)', border: '1px solid rgba(185,28,28,.25)', borderRadius: 6, padding: '8px 12px' }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', fontWeight: 600 }}>Net Payable</span>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#fca5a5', fontFamily: 'var(--mono)' }}>{fmtRs(netGST.netTotal)}</span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,.07)', margin: '0 0 8px' }} />

        {/* Nav items */}
        <nav id="gst-sidebar-nav" ref={sidebarFocus.ref} style={{ padding: '0 10px', flex: 1 }}>
          {NAV_ITEMS.map((item, index) => {
            const isActive = active === item.id
            return (
              <SideNavItem
                key={item.id}
                item={item}
                index={index}
                active={isActive}
                onClick={() => setActive(item.id)}
              />
            )
          })}
        </nav>

        {/* Footer GSTIN */}
        <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(255,255,255,.07)' }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,.2)', marginBottom: 2 }}>SELLER GSTIN</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'rgba(255,255,255,.4)', letterSpacing: '.04em' }}>{SELLER_GSTIN}</div>
        </div>
      </aside>

      {/* ── Main Content Area ─────────────────────────── */}
      <main style={{ flex: 1, overflowY: 'auto', background: 'var(--bg)' }}>
        {/* Topbar */}
        <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 52, boxShadow: 'var(--shadow-xs)' }}>
          <div>
            <span style={{ fontSize: 11, color: 'var(--ink-40)', textTransform: 'uppercase', letterSpacing: '.07em' }}>GST Reports</span>
            <span style={{ color: 'var(--ink-20)', margin: '0 6px' }}>›</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{TITLES[active]}</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-40)', fontFamily: 'var(--mono)' }}>
            {processedSales.length} invoices processed
          </div>
        </div>

        {/* Content */}
        <div id="gst-content-zone" ref={contentFocus.ref} style={{ padding: '24px 28px' }}>
          {renderSection()}
        </div>
      </main>
    </div>
  )
}

// ── Sidebar nav item ──────────────────────────────────────────
function SideNavItem({ item, active, onClick, index }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      className="focusable-card focus-stick-shell"
      data-focus-item="true"
      data-gst-sidebar-item="true"
      tabIndex={index === 0 ? 0 : -1}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width:    '100%',
        display:  'flex',
        alignItems: 'center',
        gap:      10,
        padding:  '9px 11px',
        borderRadius: 'var(--r-sm)',
        border:   'none',
        cursor:   'pointer',
        background: active ? 'rgba(255,255,255,.1)' : hov ? 'rgba(255,255,255,.05)' : 'transparent',
        marginBottom: 2,
        transition: 'background .1s, box-shadow .14s ease, border-color .14s ease',
        textAlign: 'left',
        outline: 'none',
      }}
    >
      <span style={{ fontSize: 14, color: active ? '#fff' : 'rgba(255,255,255,.35)', flexShrink: 0, lineHeight: 1 }}>
        {item.icon}
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: active ? '#fff' : 'rgba(255,255,255,.6)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {item.label}
        </div>
        <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,.25)', marginTop: 1 }}>
          {item.sub}
        </div>
      </div>
      {active && (
        <div style={{ marginLeft: 'auto', width: 3, height: 16, borderRadius: 99, background: '#60a5fa', flexShrink: 0 }} />
      )}
    </button>
  )
}
