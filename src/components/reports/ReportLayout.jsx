import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext.jsx'
import { buildReportState } from '../../data/reportUtils.js'
import { Card, CardBody, CardHead, KpiCard, PageHeader, Table, Button } from '../ui/index.js'
import { fmt, fmtShort } from '../../utils/helpers.js'
import { useEscapeAction } from '../../context/EscapeContext.jsx'

const FILTER_CARD_STYLE = {
  marginBottom: 18,
}

export default function ReportLayout({ report, renderContent }) {
  const navigate = useNavigate()
  const { invoices, purchases, parties, expenses, itemMaster } = useApp()
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [partyFilter, setPartyFilter] = useState('All')

  const reportState = useMemo(() => buildReportState({
    sales: invoices,
    purchases,
    parties,
    expenses,
    itemMaster,
    fromDate,
    toDate,
    partyFilter,
  }), [expenses, fromDate, invoices, itemMaster, parties, partyFilter, purchases, toDate])

  const context = {
    reportState,
    fromDate,
    toDate,
    partyFilter,
    setFromDate,
    setToDate,
    setPartyFilter,
    parties,
    clearBaseFilters: () => {
      setFromDate('')
      setToDate('')
      setPartyFilter('All')
    },
  }

  useEscapeAction({
    active: true,
    priority: 50,
    handler: () => {
      sessionStorage.setItem('reports-last-card', report.id)
      navigate('/reports')
      return true
    },
  })

  const summaryCards = renderContent.summary?.(context) ?? []
  const filterContent = renderContent.filters?.(context)
  const actions = renderContent.actions?.(context) ?? null
  const stickyFilters = renderContent.stickyFilters ?? true

  return (
    <div className="animate-slide">
      <PageHeader
        title={report.name}
        sub={report.desc}
        right={
          <>
            {actions}
            <Button
              variant="ghost"
              onClick={() => {
                sessionStorage.setItem('reports-last-card', report.id)
                navigate('/reports')
              }}
            >
              Back to Reports
            </Button>
          </>
        }
      />

      {filterContent && (
        <Card
          style={stickyFilters ? {
            ...FILTER_CARD_STYLE,
            position: 'sticky',
            top: 0,
            zIndex: 3,
          } : FILTER_CARD_STYLE}
        >
          <CardHead title="Filters" sub="Keyboard-first filters with live report refresh." />
          <CardBody>{filterContent}</CardBody>
        </Card>
      )}

      {summaryCards.length > 0 && (
        <div
          className="kpi-grid-4"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.min(summaryCards.length, 4)}, 1fr)`,
            gap: 14,
            marginBottom: 18,
          }}
        >
          {summaryCards.map((card) => (
            <KpiCard key={card.label} label={card.label} value={card.value} sub={card.sub} />
          ))}
        </div>
      )}

      {renderContent.body(context)}
    </div>
  )
}

export function ReportSummaryCard({ label, value, sub }) {
  return { label, value, sub }
}

export function ReportTableCard({ title, sub, focusId, cols, rows, emptyMsg = 'No records found', onRowClick, right }) {
  return (
    <Card style={{ marginBottom: 18 }}>
      <CardHead title={title} sub={sub} right={right} />
      <Table focusId={focusId} cols={cols} rows={rows} emptyMsg={emptyMsg} onRowClick={onRowClick} />
    </Card>
  )
}

export function ReportListCard({ title, sub, children, right }) {
  return (
    <Card style={{ marginBottom: 18 }}>
      <CardHead title={title} sub={sub} right={right} />
      <CardBody>{children}</CardBody>
    </Card>
  )
}

export { fmt, fmtShort }
