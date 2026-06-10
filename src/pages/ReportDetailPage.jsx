import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bar, BarChart, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import ReportLayout, { ReportListCard, ReportSummaryCard, ReportTableCard, fmt, fmtShort } from '../components/reports/ReportLayout.jsx'
import { REPORT_BY_ID } from '../components/reports/reportDefinitions.js'
import GSTReportsPage from './reports/gst/GSTReportsPage.jsx'
import { Button, Card, CardBody, FormGrid, Input } from '../components/ui/index.js'
import { downloadCsv, printTextReport } from '../utils/helpers.js'
import { formatRangeLabel } from '../data/reportUtils.js'
import { useApp } from '../context/AppContext.jsx'
import useAutocomplete from '../hooks/useAutocomplete.js'
import useFocusList from '../hooks/useFocusList.js'

const CHART_COLORS = ['#163a5f', '#2f6690', '#58a4b0', '#7ec8b2', '#d9ed92']

function ExportButtons({ onExcel, onPdf }) {
  return (
    <>
      <Button variant="ghost" onClick={onExcel}>Download Excel</Button>
      <Button variant="primary" onClick={onPdf}>Download PDF</Button>
    </>
  )
}

function FilterFooter({ onClear }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
      <Button variant="ghost" onClick={onClear}>Clear</Button>
      <Button variant="primary">Search</Button>
    </div>
  )
}

function DateRangeSearchFilters({ fromDate, toDate, setFromDate, setToDate, clearBaseFilters, searchLabel = 'Search' }) {
  const endDateRef = useState(() => ({ current: null }))[0]
  const searchButtonRef = useState(() => ({ current: null }))[0]

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <FormGrid cols={3}>
        <Input
          label="Start Date"
          type="date"
          value={fromDate}
          onChange={(event) => setFromDate(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              endDateRef.current?.focus({ preventScroll: true })
            }
          }}
        />
        <Input
          ref={(node) => {
            endDateRef.current = node
          }}
          label="End Date"
          type="date"
          value={toDate}
          onChange={(event) => setToDate(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              searchButtonRef.current?.click()
            }
          }}
        />
        <div style={{ display: 'flex', alignItems: 'end' }}>
          <Button
            ref={(node) => {
              searchButtonRef.current = node
            }}
            variant="primary"
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {searchLabel}
          </Button>
        </div>
      </FormGrid>
      <FilterFooter onClear={clearBaseFilters} />
    </div>
  )
}

function exportSalesReport(reportState, fromDate, toDate) {
  downloadCsv('sales-report.csv', [
    { label: 'Invoice No', key: 'id' },
    { label: 'Date', key: 'date' },
    { label: 'Customer', key: 'party' },
    { label: 'Phone', key: 'phone' },
    { label: 'GSTIN', key: 'gstin' },
    { label: 'Taxable Amount', value: (row) => row.subtotal || 0 },
    { label: 'GST', value: (row) => row.tax || 0 },
    { label: 'Sales Total', value: (row) => row.total || 0 },
  ], reportState.filteredSales)

  printTextReport({
    title: 'Sales Report',
    subtitle: `Summary: ${formatRangeLabel(fromDate, toDate)} | Invoices: ${reportState.totals.salesInvoices} | Sales: ${fmt(reportState.totals.totalSales)} | GST: ${fmt(reportState.totals.salesGST)}`,
    sections: [
      {
        title: 'Invoice List',
        columns: [
          { label: 'Invoice', value: (row) => row.id },
          { label: 'Date', value: (row) => row.date },
          { label: 'Customer', value: (row) => row.party },
          { label: 'GST', value: (row) => fmt(row.tax || 0), align: 'right' },
          { label: 'Total', value: (row) => fmt(row.total || 0), align: 'right' },
        ],
        rows: reportState.filteredSales,
      },
    ],
  })
}

function exportPurchaseReport(reportState, fromDate, toDate) {
  downloadCsv('purchase-report.csv', [
    { label: 'Invoice No', key: 'id' },
    { label: 'Date', key: 'date' },
    { label: 'Supplier', key: 'supplier' },
    { label: 'Amount', value: (row) => row.amount || 0 },
    { label: 'Paid', value: (row) => row.paid || 0 },
    { label: 'Due', value: (row) => Math.max((row.amount || 0) - (row.paid || 0), 0) },
    { label: 'GST', value: (row) => row.tax || 0 },
  ], reportState.filteredPurchases)

  printTextReport({
    title: 'Purchase Report',
    subtitle: `Summary: ${formatRangeLabel(fromDate, toDate)} | Purchases: ${fmt(reportState.totals.totalPurchases)} | Paid: ${fmt(reportState.totals.purchasePaid)} | Due: ${fmt(reportState.totals.purchaseDue)}`,
    sections: [
      {
        title: 'Supplier Invoices',
        columns: [
          { label: 'Invoice', value: (row) => row.id },
          { label: 'Supplier', value: (row) => row.supplier },
          { label: 'Paid', value: (row) => fmt(row.paid || 0), align: 'right' },
          { label: 'Due', value: (row) => fmt(Math.max((row.amount || 0) - (row.paid || 0), 0)), align: 'right' },
          { label: 'Amount', value: (row) => fmt(row.amount || 0), align: 'right' },
        ],
        rows: reportState.filteredPurchases,
      },
    ],
  })
}

function exportStockReport(rows) {
  downloadCsv('stock-report.csv', [
    { label: 'Item', key: 'item' },
    { label: 'Batch No', key: 'batchNo' },
    { label: 'Purchase Rate', key: 'purchaseRate' },
    { label: 'Sale Rate', key: 'saleRate' },
    { label: 'Purchase Date', key: 'purchaseDate' },
    { label: 'Expiry Date', key: 'expiryDate' },
    { label: 'Stock', key: 'currentStock' },
  ], rows)

  printTextReport({
    title: 'Stock Report',
    subtitle: `Items: ${rows.length} | Current Stock Value: ${fmt(rows.reduce((sum, row) => sum + ((row.currentStock || 0) * (row.purchaseRate || 0)), 0))}`,
    sections: [
      {
        title: 'Inventory Snapshot',
        columns: [
          { label: 'Item', value: (row) => row.item },
          { label: 'Batch', value: (row) => row.batchNo },
          { label: 'Purchase', value: (row) => fmt(row.purchaseRate || 0), align: 'right' },
          { label: 'Sale', value: (row) => fmt(row.saleRate || 0), align: 'right' },
          { label: 'Stock', value: (row) => row.currentStock || 0, align: 'right' },
        ],
        rows,
      },
    ],
  })
}

function exportProfitReport(reportState, fromDate, toDate) {
  downloadCsv('profit-report.csv', [
    { label: 'Invoice No', key: 'id' },
    { label: 'Customer', key: 'customerName' },
    { label: 'Sales Amount', key: 'salesAmount' },
    { label: 'Purchase Cost', key: 'purchaseCost' },
    { label: 'Profit Earned', key: 'profitEarned' },
    { label: 'Profit %', value: (row) => row.profitPct.toFixed(2) },
  ], reportState.billWiseProfit)

  printTextReport({
    title: 'Profit Report',
    subtitle: `Range: ${formatRangeLabel(fromDate, toDate)} | Total Sales: ${fmt(reportState.totals.totalSales)} | Gross Profit: ${fmt(reportState.totals.grossProfit)} | Net Profit: ${fmt(reportState.totals.netProfit)}`,
    sections: [
      {
        title: 'Bill-wise Profit',
        columns: [
          { label: 'Invoice', value: (row) => row.id },
          { label: 'Customer', value: (row) => row.customerName },
          { label: 'Sales', value: (row) => fmt(row.salesAmount), align: 'right' },
          { label: 'Cost', value: (row) => fmt(row.purchaseCost), align: 'right' },
          { label: 'Profit', value: (row) => fmt(row.profitEarned), align: 'right' },
        ],
        rows: reportState.billWiseProfit,
      },
      {
        title: 'Item-wise Profit & Loss',
        columns: [
          { label: 'Item', value: (row) => row.itemName },
          { label: 'Qty Sold', value: (row) => row.quantitySold, align: 'right' },
          { label: 'Sale Value', value: (row) => fmt(row.saleValue), align: 'right' },
          { label: 'Profit/Loss', value: (row) => fmt(row.profitLoss), align: 'right' },
        ],
        rows: reportState.itemWiseProfit,
      },
    ],
  })
}

function exportExpenseReport(reportState, fromDate, toDate) {
  downloadCsv('expense-report.csv', [
    { label: 'Date', key: 'date' },
    { label: 'Category', key: 'category' },
    { label: 'Title', value: (row) => row.title || row.desc || '' },
    { label: 'Amount', key: 'amount' },
    { label: 'Payment Mode', value: (row) => row.paymentMode || row.mode || '' },
    { label: 'Notes', value: (row) => row.notes || '' },
  ], reportState.filteredExpenses)

  printTextReport({
    title: 'Expense Report',
    subtitle: `Range: ${formatRangeLabel(fromDate, toDate)} | Total Expense: ${fmt(reportState.totals.totalExpenses)} | Avg Daily: ${fmt(reportState.totals.averageDailyExpense)} | Highest Category: ${reportState.highestExpenseCategory?.category || 'N/A'}`,
    sections: [
      {
        title: 'Expense Entries',
        columns: [
          { label: 'Date', value: (row) => row.date },
          { label: 'Category', value: (row) => row.category },
          { label: 'Title', value: (row) => row.title || row.desc || '' },
          { label: 'Amount', value: (row) => fmt(row.amount || 0), align: 'right' },
        ],
        rows: reportState.filteredExpenses,
      },
    ],
  })
}

const PROFIT_SECTIONS = [
  {
    id: 'billwise',
    title: 'Bill Wise Profit',
    sub: 'Open invoice-level profit analysis',
    accent: '#1f4e79',
  },
  {
    id: 'itemwise',
    title: 'Item Wise Profit & Loss',
    sub: 'Open item margin and quantity analysis',
    accent: '#2d6a4f',
  },
  {
    id: 'netprofit',
    title: 'Net Profit Dashboard',
    sub: 'Open gross and net profit summary',
    accent: '#8d5524',
  },
  {
    id: 'partywise',
    title: 'Party Wise Profit & Loss',
    sub: 'Open customer and supplier margin view',
    accent: '#7b2cbf',
  },
]

function ProfitReportsWorkspace({ reportState }) {
  const [activeSectionId, setActiveSectionId] = useState(PROFIT_SECTIONS[0].id)
  const focusList = useFocusList({
    count: PROFIT_SECTIONS.length,
    orientation: 'horizontal',
    onEnter: (index, event) => {
      event.preventDefault()
      setActiveSectionId(PROFIT_SECTIONS[index].id)
    },
  })

  const activeSection = PROFIT_SECTIONS.find((section) => section.id === activeSectionId) ?? PROFIT_SECTIONS[0]

  return (
    <>
      <Card style={{ marginBottom: 18 }}>
        <CardBody style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>Profit Report Sections</div>
              <div style={{ fontSize: 12, color: 'var(--ink-40)' }}>Use arrow keys to move across cards and press Enter to open the selected detail.</div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-40)' }}>Selected: <strong style={{ color: 'var(--ink)' }}>{activeSection.title}</strong></div>
          </div>

          <div className="reports-card-grid">
            {PROFIT_SECTIONS.map((section, index) => {
              const active = section.id === activeSectionId
              return (
                <Card
                  key={section.id}
                  className="focusable-card report-nav-card"
                  {...focusList.getItemProps(index, {
                    onClick: () => setActiveSectionId(section.id),
                  })}
                  style={{
                    padding: 18,
                    cursor: 'pointer',
                    border: `1px solid ${active ? section.accent : 'var(--border)'}`,
                    background: active ? 'linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)' : 'var(--surface)',
                    boxShadow: active ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                  }}
                >
                  <div style={{ width: 44, height: 5, borderRadius: 999, background: section.accent, marginBottom: 12 }} />
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>{section.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-40)', lineHeight: 1.6 }}>{section.sub}</div>
                  <div style={{ marginTop: 14, fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: active ? section.accent : 'var(--ink-40)' }}>
                    {active ? 'Detail Open Below' : 'Press Enter To Open'}
                  </div>
                </Card>
              )
            })}
          </div>
        </CardBody>
      </Card>

      {activeSectionId === 'billwise' && (
        <ReportTableCard
          title="Bill Wise Profit"
          sub="Profit earned on each sales invoice."
          focusId="report-profit-billwise"
          cols={[
            { key: 'id', label: 'Invoice No', mono: true },
            { key: 'customerName', label: 'Customer Name' },
            { key: 'salesAmount', label: 'Sales Amount', right: true, render: (value) => fmt(value) },
            { key: 'purchaseCost', label: 'Purchase Cost', right: true, render: (value) => fmt(value) },
            { key: 'profitEarned', label: 'Profit Earned', right: true, render: (value) => <strong style={{ color: value >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmt(value)}</strong> },
            { key: 'profitPct', label: 'Profit %', right: true, render: (value) => `${value.toFixed(1)}%` },
          ]}
          rows={reportState.billWiseProfit}
          emptyMsg="No invoice profits available for the selected period."
        />
      )}

      {activeSectionId === 'itemwise' && (
        <ReportTableCard
          title="Item Wise Profit & Loss"
          sub="Margins by sold item."
          focusId="report-profit-itemwise"
          cols={[
            { key: 'itemName', label: 'Item Name', wrap: true },
            { key: 'quantitySold', label: 'Quantity Sold', right: true },
            { key: 'purchaseCost', label: 'Purchase Cost', right: true, render: (value) => fmt(value) },
            { key: 'saleValue', label: 'Sale Value', right: true, render: (value) => fmt(value) },
            { key: 'profitLoss', label: 'Profit/Loss', right: true, render: (value) => <strong style={{ color: value >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmt(value)}</strong> },
          ]}
          rows={reportState.itemWiseProfit}
        />
      )}

      {activeSectionId === 'netprofit' && (
        <ReportListCard title="Net Profit Dashboard" sub="Gross profit and net margin overview.">
          <div style={{ display: 'grid', gap: 12 }}>
            {[
              ['Total Sales', reportState.totals.totalSales],
              ['Total Purchase', reportState.totals.totalPurchases],
              ['Total Expense', reportState.totals.totalExpenses],
              ['Gross Profit', reportState.totals.grossProfit],
              ['Net Profit', reportState.totals.netProfit],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', background: 'var(--surface-2)' }}>
                <span style={{ fontWeight: 600 }}>{label}</span>
                <strong style={{ color: label === 'Net Profit' && value < 0 ? 'var(--red)' : 'var(--ink)' }}>{fmt(value)}</strong>
              </div>
            ))}
          </div>
        </ReportListCard>
      )}

      {activeSectionId === 'partywise' && (
        <ReportTableCard
          title="Party Wise Profit & Loss"
          sub="Customer and supplier margin analysis."
          focusId="report-profit-partywise"
          cols={[
            { key: 'partyName', label: 'Party Name' },
            { key: 'totalBusiness', label: 'Total Business', right: true, render: (value) => fmt(value) },
            { key: 'profitGenerated', label: 'Profit Generated', right: true, render: (value) => fmt(value) },
            { key: 'lossGenerated', label: 'Loss Generated', right: true, render: (value) => fmt(value) },
            { key: 'netMargin', label: 'Net Margin', right: true, render: (value) => `${value.toFixed(1)}%` },
          ]}
          rows={reportState.partyWiseProfit}
        />
      )}
    </>
  )
}

const renderers = {
  billwiseprofit: {
    filters: ({ fromDate, toDate, setFromDate, setToDate, clearBaseFilters }) => (
      <DateRangeSearchFilters
        fromDate={fromDate}
        toDate={toDate}
        setFromDate={setFromDate}
        setToDate={setToDate}
        clearBaseFilters={clearBaseFilters}
      />
    ),
    actions: ({ reportState, fromDate, toDate }) => (
      <ExportButtons
        onExcel={() => downloadCsv('sales-report.csv', [
          { label: 'Invoice No', key: 'id' },
          { label: 'Date', key: 'date' },
          { label: 'Customer', key: 'party' },
          { label: 'Phone', key: 'phone' },
          { label: 'GSTIN', key: 'gstin' },
          { label: 'Taxable Amount', value: (row) => row.subtotal || 0 },
          { label: 'GST', value: (row) => row.tax || 0 },
          { label: 'Sales Total', value: (row) => row.total || 0 },
        ], reportState.filteredSales)}
        onPdf={() => exportSalesReport(reportState, fromDate, toDate)}
      />
    ),
    summary: ({ reportState }) => [
      ReportSummaryCard({ label: 'Total Invoices', value: reportState.totals.salesInvoices, sub: 'Filtered invoice count' }),
      ReportSummaryCard({ label: 'Total Sales Amount', value: fmtShort(reportState.totals.totalSales), sub: 'Gross sales in range' }),
      ReportSummaryCard({ label: 'GST Collected', value: fmtShort(reportState.totals.salesGST), sub: 'Sales tax total' }),
      ReportSummaryCard({ label: 'Customers', value: new Set(reportState.filteredSales.map((row) => row.party)).size, sub: 'Active buyers in range' }),
    ],
    body: ({ reportState }) => (
      <ReportTableCard
        title="Invoice List"
        sub="Auto-refreshes as soon as the date period changes."
        focusId="report-billwise-profit"
        cols={[
          { key: 'id', label: 'Invoice No', mono: true },
          { key: 'date', label: 'Date', dim: true },
          { key: 'party', label: 'Customer Details', render: (_, row) => <div><strong>{row.party}</strong><div style={{ fontSize: 11.5, color: 'var(--ink-40)' }}>{row.phone || '-'} | {row.gstin || '-'}</div></div> },
          { key: 'subtotal', label: 'Taxable', right: true, render: (value) => fmt(value || 0) },
          { key: 'tax', label: 'GST', right: true, render: (value) => fmt(value || 0) },
          { key: 'total', label: 'Sales Total', right: true, render: (value) => <strong>{fmt(value || 0)}</strong> },
        ]}
        rows={reportState.filteredSales}
        emptyMsg="No sales invoices found for the selected period."
      />
    ),
  },
  statement: {
    filters: ({ fromDate, toDate, setFromDate, setToDate, clearBaseFilters }) => (
      <DateRangeSearchFilters
        fromDate={fromDate}
        toDate={toDate}
        setFromDate={setFromDate}
        setToDate={setToDate}
        clearBaseFilters={clearBaseFilters}
      />
    ),
    actions: ({ reportState, fromDate, toDate }) => (
      <ExportButtons
        onExcel={() => downloadCsv('purchase-report.csv', [
          { label: 'Invoice No', key: 'id' },
          { label: 'Date', key: 'date' },
          { label: 'Supplier', key: 'supplier' },
          { label: 'Amount', value: (row) => row.amount || 0 },
          { label: 'Paid', value: (row) => row.paid || 0 },
          { label: 'Due', value: (row) => Math.max((row.amount || 0) - (row.paid || 0), 0) },
          { label: 'GST', value: (row) => row.tax || 0 },
        ], reportState.filteredPurchases)}
        onPdf={() => exportPurchaseReport(reportState, fromDate, toDate)}
      />
    ),
    summary: ({ reportState }) => [
      ReportSummaryCard({ label: 'Total Purchase Invoices', value: reportState.totals.purchaseInvoices, sub: 'Filtered purchase count' }),
      ReportSummaryCard({ label: 'Total Purchase Amount', value: fmtShort(reportState.totals.totalPurchases), sub: 'Gross purchases in range' }),
      ReportSummaryCard({ label: 'Total Payments Done', value: fmtShort(reportState.totals.purchasePaid), sub: 'Amount already paid' }),
      ReportSummaryCard({ label: 'Total Dues Pending', value: fmtShort(reportState.totals.purchaseDue), sub: 'Outstanding payable' }),
    ],
    body: ({ reportState }) => (
      <ReportTableCard
        title="Supplier Invoices"
        sub="Payment tracking and GST-ready purchase breakdown."
        focusId="report-party-statement"
        cols={[
          { key: 'id', label: 'Invoice No', mono: true },
          { key: 'date', label: 'Date', dim: true },
          { key: 'supplier', label: 'Supplier' },
          { key: 'paid', label: 'Payments Done', right: true, render: (value) => fmt(value || 0) },
          { key: 'amount', label: 'Purchase Total', right: true, render: (value) => fmt(value || 0) },
          { key: 'due', label: 'Pending Dues', right: true, render: (_, row) => <strong>{fmt(Math.max((row.amount || 0) - (row.paid || 0), 0))}</strong> },
          { key: 'tax', label: 'GST', right: true, render: (value) => fmt(value || 0) },
        ]}
        rows={reportState.filteredPurchases.map((row) => ({ ...row, due: Math.max((row.amount || 0) - (row.paid || 0), 0) }))}
        emptyMsg="No purchase invoices found for the selected period."
      />
    ),
  },
  stock: {
    summary: ({ reportState }) => [
      ReportSummaryCard({ label: 'Tracked Items', value: reportState.stockReport.length, sub: 'Inventory search ready' }),
      ReportSummaryCard({ label: 'Stock Value', value: fmtShort(reportState.totals.stockValue), sub: 'Purchase-rate valuation' }),
      ReportSummaryCard({ label: 'Low Stock Items', value: reportState.stockReport.filter((row) => (row.currentStock || 0) <= 5).length, sub: 'Needs reordering soon' }),
      ReportSummaryCard({ label: 'Live Search', value: 'On', sub: 'Autocomplete + arrow navigation' }),
    ],
    body: ({ reportState }) => <StockBody stockReport={reportState.stockReport} />,
  },
  'profit-loss': {
    stickyFilters: false,
    filters: ({ fromDate, toDate, setFromDate, setToDate, clearBaseFilters }) => (
      <DateRangeSearchFilters
        fromDate={fromDate}
        toDate={toDate}
        setFromDate={setFromDate}
        setToDate={setToDate}
        clearBaseFilters={clearBaseFilters}
      />
    ),
    actions: ({ reportState, fromDate, toDate }) => (
      <ExportButtons
        onExcel={() => downloadCsv('profit-report.csv', [
          { label: 'Invoice No', key: 'id' },
          { label: 'Customer', key: 'customerName' },
          { label: 'Sales Amount', key: 'salesAmount' },
          { label: 'Purchase Cost', key: 'purchaseCost' },
          { label: 'Profit Earned', key: 'profitEarned' },
          { label: 'Profit %', value: (row) => row.profitPct.toFixed(2) },
        ], reportState.billWiseProfit)}
        onPdf={() => exportProfitReport(reportState, fromDate, toDate)}
      />
    ),
    summary: ({ reportState }) => [
      ReportSummaryCard({ label: 'Total Sales', value: fmtShort(reportState.totals.totalSales), sub: 'Revenue in selected range' }),
      ReportSummaryCard({ label: 'Total Purchase', value: fmtShort(reportState.totals.totalPurchases), sub: 'Direct cost base' }),
      ReportSummaryCard({ label: 'Total Expense', value: fmtShort(reportState.totals.totalExpenses), sub: 'Operating expenses' }),
      ReportSummaryCard({ label: 'Gross Profit', value: fmtShort(reportState.totals.grossProfit), sub: 'Sales - purchase cost' }),
    ],
    body: ({ reportState }) => <ProfitReportsWorkspace reportState={reportState} />,
  },
  expensesanalysis: {
    stickyFilters: false,
    filters: ({ fromDate, toDate, setFromDate, setToDate, clearBaseFilters }) => (
      <DateRangeSearchFilters
        fromDate={fromDate}
        toDate={toDate}
        setFromDate={setFromDate}
        setToDate={setToDate}
        clearBaseFilters={clearBaseFilters}
      />
    ),
    actions: ({ reportState, fromDate, toDate }) => (
      <ExportButtons
        onExcel={() => downloadCsv('expense-report.csv', [
          { label: 'Date', key: 'date' },
          { label: 'Category', key: 'category' },
          { label: 'Title', value: (row) => row.title || row.desc || '' },
          { label: 'Amount', key: 'amount' },
          { label: 'Payment Mode', value: (row) => row.paymentMode || row.mode || '' },
        ], reportState.filteredExpenses)}
        onPdf={() => exportExpenseReport(reportState, fromDate, toDate)}
      />
    ),
    summary: ({ reportState }) => [
      ReportSummaryCard({ label: 'Total Expenses', value: fmtShort(reportState.totals.totalExpenses), sub: 'Selected range total' }),
      ReportSummaryCard({ label: 'Highest Expense Category', value: reportState.highestExpenseCategory?.category || 'N/A', sub: reportState.highestExpenseCategory ? fmtShort(reportState.highestExpenseCategory.amount) : 'No data' }),
      ReportSummaryCard({ label: 'Average Daily Expense', value: fmtShort(reportState.totals.averageDailyExpense), sub: 'Active expense days only' }),
      ReportSummaryCard({ label: 'Monthly Expense Trend', value: reportState.expenseTrend.length, sub: 'Tracked month buckets' }),
    ],
    body: ({ reportState }) => (
      <>
        <div className="two-col-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 }}>
          <Card>
            <CardBody style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reportState.expenseAnalysis}>
                  <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => fmt(value)} />
                  <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                    {reportState.expenseAnalysis.map((entry, index) => (
                      <Cell key={entry.category} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>
          <Card>
            <CardBody style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={reportState.expenseTrend}>
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => fmt(value)} />
                  <Line dataKey="amount" stroke="#163a5f" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>
        </div>
        <ReportTableCard
          title="Expense Breakdown"
          sub="Date-filtered expense rows with category totals."
          focusId="report-expenses-analysis"
          cols={[
            { key: 'date', label: 'Date', dim: true },
            { key: 'category', label: 'Category' },
            { key: 'title', label: 'Expense Title', render: (_, row) => row.title || row.desc || '-' },
            { key: 'paymentMode', label: 'Payment Mode', render: (_, row) => row.paymentMode || row.mode || '-' },
            { key: 'amount', label: 'Amount', right: true, render: (value) => <strong>{fmt(value || 0)}</strong> },
          ]}
          rows={reportState.filteredExpenses}
        />
      </>
    ),
  },
}

function StockBody({ stockReport }) {
  const [query, setQuery] = useState('')
  const { isOpen, setOpen, suggestions, highlightedIndex, setHighlightedIndex, handleKeyDown } = useAutocomplete({
    items: stockReport.map((row) => ({ ...row, label: row.item })),
    value: query,
    getLabel: (item) => item.item,
    maxSuggestions: 6,
  })

  const filteredRows = useMemo(() => {
    if (!query.trim()) return stockReport
    const value = query.trim().toLowerCase()
    return stockReport.filter((row) => row.item.toLowerCase().includes(value))
  }, [query, stockReport])

  return (
    <>
      <Card style={{ marginBottom: 18 }}>
        <CardBody style={{ display: 'grid', gap: 14 }}>
          <div style={{ position: 'relative' }}>
            <Input
              label="Smart Item Search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setOpen(true)
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={(event) => {
                if (handleKeyDown(event, (item) => {
                  setQuery(item.item)
                  setOpen(false)
                })) return
              }}
              placeholder="Type Para to see suggestions"
            />
            {isOpen && query && suggestions.length > 0 && (
              <div style={{ position: 'absolute', left: 0, right: 0, top: 'calc(100% + 6px)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', boxShadow: 'var(--shadow-md)', zIndex: 8, overflow: 'hidden' }}>
                {suggestions.map((item, index) => (
                  <button
                    key={`${item.item}-${index}`}
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault()
                      setQuery(item.item)
                      setHighlightedIndex(index)
                      setOpen(false)
                    }}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    style={{ width: '100%', border: 'none', background: highlightedIndex === index ? '#eef4fb' : 'transparent', padding: '10px 12px', textAlign: 'left' }}
                  >
                    <div style={{ fontWeight: 600 }}>{item.item}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-40)' }}>Batch {item.batchNo} | Stock {item.currentStock}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 12, color: 'var(--ink-40)' }}>Real-time filtering, autocomplete, Enter selection, arrow navigation, and Esc support.</div>
            <ExportButtons onExcel={() => exportStockReport(filteredRows)} onPdf={() => exportStockReport(filteredRows)} />
          </div>
        </CardBody>
      </Card>
      <ReportTableCard
        title="Inventory Stock Report"
        sub="Expanded stock columns with batch, pricing and stock visibility."
        focusId="report-stock"
        cols={[
          { key: 'item', label: 'Item', wrap: true },
          { key: 'batchNo', label: 'Batch No' },
          { key: 'purchaseRate', label: 'Purchase Rate', right: true, render: (value) => fmt(value || 0) },
          { key: 'saleRate', label: 'Sale Rate', right: true, render: (value) => fmt(value || 0) },
          { key: 'purchaseDate', label: 'Purchase Date', dim: true },
          { key: 'expiryDate', label: 'Expiry Date', dim: true },
          { key: 'currentStock', label: 'Stock', right: true, render: (value) => <strong>{value || 0}</strong> },
        ]}
        rows={filteredRows}
        emptyMsg="No stock items match the current search."
      />
    </>
  )
}

export default function ReportDetailPage({ reportId }) {
  const navigate = useNavigate()
  const report = REPORT_BY_ID[reportId]
  const { itemMaster } = useApp()

  if (reportId === 'gst') {
    return <GSTReportsPage onBack={() => { sessionStorage.setItem('reports-last-card', 'gst'); navigate('/reports') }} />
  }

  const renderer = renderers[reportId]
  if (!report || !renderer) return null

  return <ReportLayout key={`${reportId}-${itemMaster.length}`} report={report} renderContent={renderer} />
}
