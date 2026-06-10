/**
 * ReportsWorkspace.jsx — with horizontal keyboard navigation
 *
 * Navigation model:
 *   • Report cards are in a horizontal focus list (ArrowLeft / ArrowRight)
 *   • Enter opens the selected report detail panel
 *   • Escape from the detail panel returns focus to the report card
 *   • useSectionNav manages two vertical sections:
 *       1. "cards"  – the report card grid (horizontal focus list inside)
 *       2. "detail" – the open report detail (when visible)
 */
import React, { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext.jsx'
import { buildReportState } from '../../data/reportUtils.js'
import { Card, CardBody, CardHead, Input, KpiCard, PageHeader, Select, Table } from '../ui/index.js'
import Button from '../ui/Button.jsx'
import useFocusList from '../../hooks/useFocusList.js'
import useSectionNav from '../../hooks/useSectionNav.js'
import { fmt, fmtShort } from '../../utils/helpers.js'

const REPORTS = [
  { id: 'pl',       name: 'Profit & Loss',   desc: 'Revenue, costs, and net profitability for the selected period.',            accent: '#111111' },
  { id: 'cashflow', name: 'Cash Flow',        desc: 'Operational inflow versus outflow with a clean movement table.',            accent: '#0f766e' },
  { id: 'party',    name: 'Party Ledger',     desc: 'Ledger-style balances by party with sales and purchase splits.',            accent: '#1d4ed8' },
  { id: 'expense',  name: 'Expense Analysis', desc: 'Category-wise spending trends and contribution to total cost.',             accent: '#92400e' },
  { id: 'stock',    name: 'Stock Report',     desc: 'Closing quantity, valuation rate, and total stock value.',                  accent: '#166534' },
  { id: 'gst',      name: 'GST Report',       desc: 'Open the existing GST workspace.',                                          accent: '#7c3aed', route: '/reports/gst' },
  { id: 'billwise', name: 'Bill-wise Profit', desc: 'Open the existing bill-wise profit report.',                               accent: '#be123c', route: '/reports/billwise' },
]

export default function ReportsWorkspace() {
  const navigate = useNavigate()
  const { invoices, purchases, parties, expenses } = useApp()
  const [activeReportId, setActiveReportId] = useState(REPORTS[0].id)
  const [detailOpen, setDetailOpen] = useState(false)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [partyFilter, setPartyFilter] = useState('All')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const detailRef = useRef(null)

  const reportState = useMemo(() => buildReportState({
    sales: invoices, purchases, parties, expenses, fromDate, toDate, partyFilter,
  }), [expenses, fromDate, invoices, parties, partyFilter, purchases, toDate])

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(expenses.map((e) => e.category))).sort()],
    [expenses],
  )

  const activeReport = REPORTS.find((r) => r.id === activeReportId) ?? REPORTS[0]

  // ── Horizontal focus list for report cards ──────────────────────────────
  const focusList = useFocusList({
    count: REPORTS.length,
    orientation: 'horizontal',          // ← ArrowLeft / ArrowRight
    onEnter: (index, event) => {
      event.preventDefault()
      openReport(REPORTS[index])
    },
  })

  // ── Section nav: cards section → detail section ─────────────────────────
  const sectionNav = useSectionNav({
    sections: detailOpen ? ['cards', 'detail'] : ['cards'],
    orientation: 'vertical',            // ArrowDown enters the detail panel
  })

  function openReport(report) {
    setActiveReportId(report.id)
    if (report.route) {
      navigate(report.route)
      return
    }
    setDetailOpen(true)
    // Move focus into the detail section on the next frame
    requestAnimationFrame(() => detailRef.current?.focus({ preventScroll: true }))
  }

  function closeDetail() {
    setDetailOpen(false)
    // Restore focus to the active report card
    const nextIndex = REPORTS.findIndex((r) => r.id === activeReportId)
    focusList.focusItem(nextIndex >= 0 ? nextIndex : 0)
  }

  return (
    <div className="animate-slide" {...sectionNav.getRootProps()}>
      <PageHeader title="Reports" sub="Complete business insights in one place." />

      {/* ── Section 1: Report cards (horizontal navigation) ── */}
      <Card style={{ marginBottom: 20 }} {...sectionNav.getSectionProps('cards')}>
        <CardHead
          title="Report Cards"
          sub="ArrowLeft / ArrowRight to move between cards · Enter to open · ArrowDown to enter detail."
        />
        <CardBody>
          <div className="reports-card-grid">
            {REPORTS.map((report, index) => {
              const active = report.id === activeReportId
              return (
                <Card
                  key={report.id}
                  {...focusList.getItemProps(index, {
                    // Mark index 0 as the section entry point
                    sectionEntry: index === 0,
                    onClick: () => {
                      setActiveReportId(report.id)
                      openReport(report)
                    },
                  })}
                  className="report-nav-card"
                  style={{
                    padding: 18,
                    border: `1px solid ${active ? report.accent : 'var(--border)'}`,
                    background: active
                      ? 'linear-gradient(180deg, #ffffff 0%, #f7f7f7 100%)'
                      : 'var(--surface)',
                    boxShadow: active ? 'var(--shadow-md)' : 'var(--shadow-xs)',
                    display: 'grid',
                    gap: 10,
                    cursor: 'pointer',
                    minHeight: 162,
                    outline: focusList.currentIndex === index
                      ? `2px solid ${report.accent}`
                      : 'none',
                    outlineOffset: 2,
                  }}
                >
                  <div style={{ width: 40, height: 5, borderRadius: 999, background: report.accent, opacity: active ? 1 : 0.45 }} />
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>{report.name}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-40)', lineHeight: 1.6 }}>{report.desc}</div>
                  <div style={{ fontSize: 11, color: active ? report.accent : 'var(--ink-20)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '.07em' }}>
                    {report.route ? 'Open linked report' : 'Open report'}
                  </div>
                </Card>
              )
            })}
          </div>
        </CardBody>
      </Card>

      {/* ── Section 2: Detail panel ── */}
      {detailOpen && !activeReport.route && (
        <div
          {...sectionNav.getSectionProps('detail')}
          ref={detailRef}
          tabIndex={-1}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault()
              event.stopPropagation()
              closeDetail()
            }
          }}
          style={{ outline: 'none' }}
        >
          <Card style={{ marginBottom: 20 }}>
            <CardHead
              title={activeReport.name}
              sub="Esc returns to report cards · ArrowUp returns to cards section."
              right={<Button variant="ghost" onClick={closeDetail}>Back to Cards</Button>}
            />
            <CardBody style={{ display: 'grid', gap: 18 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
                <Input label="From" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} data-section-entry />
                <Input label="To" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                <Select label="Party" value={partyFilter} onChange={(e) => setPartyFilter(e.target.value)} options={['All', ...parties.map((p) => p.name)]} />
                <Select label="Category" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} options={categories} />
              </div>
              <ReportDetail activeReportId={activeReportId} reportState={reportState} categoryFilter={categoryFilter} />
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  )
}

function ReportDetail({ activeReportId, reportState, categoryFilter }) {
  if (activeReportId === 'pl')       return <ProfitLossDetail reportState={reportState} />
  if (activeReportId === 'cashflow') return <CashFlowDetail reportState={reportState} />
  if (activeReportId === 'party')    return <PartyLedgerDetail reportState={reportState} />
  if (activeReportId === 'expense')  return <ExpenseDetail reportState={reportState} categoryFilter={categoryFilter} />
  return <StockDetail reportState={reportState} />
}

function ProfitLossDetail({ reportState }) {
  const rows = [
    { label: 'Sales',       amount: reportState.totals.totalSales },
    { label: 'Purchases',   amount: -reportState.totals.totalPurchases },
    { label: 'Expenses',    amount: -reportState.totals.totalExpenses },
    { label: 'Gross Profit',amount: reportState.totals.grossProfit },
    { label: 'Net Profit',  amount: reportState.totals.netProfit },
  ]
  return (
    <Card>
      <CardBody style={{ display: 'grid', gap: 20 }}>
        <div className="kpi-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          <KpiCard label="Sales"      value={fmtShort(reportState.totals.totalSales)} />
          <KpiCard label="Purchases"  value={fmtShort(reportState.totals.totalPurchases)} />
          <KpiCard label="Expenses"   value={fmtShort(reportState.totals.totalExpenses)} />
          <KpiCard label="Net Profit" value={fmtShort(reportState.totals.netProfit)} />
        </div>
        <Table
          cols={[
            { key: 'label',  label: 'Metric' },
            { key: 'amount', label: 'Amount', right: true, render: (v) => <strong style={{ color: v < 0 ? 'var(--red)' : 'var(--ink)' }}>{fmt(v)}</strong> },
          ]}
          rows={rows}
        />
      </CardBody>
    </Card>
  )
}

function CashFlowDetail({ reportState }) {
  const rows = [
    ...reportState.filteredSales.map((i)     => ({ date: i.date, type: 'Inflow',  source: i.party,    amount:  i.total })),
    ...reportState.filteredPurchases.map((p) => ({ date: p.date, type: 'Outflow', source: p.supplier, amount: -p.amount })),
    ...reportState.filteredExpenses.map((e)  => ({ date: e.date, type: 'Outflow', source: e.category, amount: -e.amount })),
  ].sort((a, b) => String(b.date).localeCompare(String(a.date)))
  return (
    <Card>
      <CardBody style={{ display: 'grid', gap: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          <KpiCard label="Cash Inflow"   value={fmtShort(reportState.totals.cashInflow)} />
          <KpiCard label="Cash Outflow"  value={fmtShort(reportState.totals.cashOutflow)} />
          <KpiCard label="Net Movement"  value={fmtShort(reportState.totals.cashInflow - reportState.totals.cashOutflow)} />
        </div>
        <Table
          cols={[
            { key: 'date',   label: 'Date',   dim: true },
            { key: 'type',   label: 'Type' },
            { key: 'source', label: 'Source', wrap: true },
            { key: 'amount', label: 'Amount', right: true, render: (v) => <strong style={{ color: v < 0 ? 'var(--red)' : 'var(--green)' }}>{fmt(v)}</strong> },
          ]}
          rows={rows}
          emptyMsg="No cash movement found for the selected filters."
        />
      </CardBody>
    </Card>
  )
}

function PartyLedgerDetail({ reportState }) {
  return (
    <Card>
      <CardBody>
        <Table
          cols={[
            { key: 'name',          label: 'Party' },
            { key: 'salesValue',    label: 'Sales',     right: true, render: (v) => fmt(v) },
            { key: 'purchaseValue', label: 'Purchases', right: true, render: (v) => fmt(v) },
            { key: 'balanceValue',  label: 'Net',       right: true, render: (v) => <strong style={{ color: v < 0 ? 'var(--red)' : 'var(--ink)' }}>{fmt(v)}</strong> },
          ]}
          rows={reportState.partyStatement}
        />
      </CardBody>
    </Card>
  )
}

function ExpenseDetail({ reportState, categoryFilter }) {
  const rows = categoryFilter === 'All'
    ? reportState.expenseAnalysis
    : reportState.expenseAnalysis.filter((r) => r.category === categoryFilter)
  const maxAmount = Math.max(...rows.map((r) => r.amount), 1)
  return (
    <Card>
      <CardBody style={{ display: 'grid', gap: 18 }}>
        <div style={{ display: 'grid', gap: 12 }}>
          {rows.map((row) => (
            <div key={row.category} style={{ display: 'grid', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                <span style={{ color: 'var(--ink-60)' }}>{row.category}</span>
                <strong>{fmt(row.amount)}</strong>
              </div>
              <div style={{ height: 10, borderRadius: 999, background: 'var(--surface-3)', overflow: 'hidden' }}>
                <div style={{ width: `${Math.max((row.amount / maxAmount) * 100, 10)}%`, height: '100%', background: 'var(--ink)' }} />
              </div>
            </div>
          ))}
        </div>
        <Table
          cols={[
            { key: 'category', label: 'Category' },
            { key: 'count',    label: 'Entries', right: true },
            { key: 'amount',   label: 'Amount',  right: true, render: (v) => <strong>{fmt(v)}</strong> },
          ]}
          rows={rows}
        />
      </CardBody>
    </Card>
  )
}

function StockDetail({ reportState }) {
  return (
    <Card>
      <CardBody>
        <Table
          cols={[
            { key: 'item',          label: 'Item',       wrap: true },
            { key: 'closingQty',    label: 'Closing Qty',right: true },
            { key: 'valuationRate', label: 'Rate',        right: true, render: (v) => fmt(v) },
            { key: 'valuation',     label: 'Value',       right: true, render: (v) => <strong>{fmt(v)}</strong> },
          ]}
          rows={reportState.stockReport}
        />
      </CardBody>
    </Card>
  )
}