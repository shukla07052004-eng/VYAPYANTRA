import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useApp } from '../context/AppContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { AI_REPORT_DEFINITIONS, BANKING_DEFINITIONS, UTILITY_DEFINITIONS } from '../data/erpModules.js'
import { Card, CardBody, CardHead, FormGrid, Input, KpiCard, PageHeader, Select, Table, Textarea } from '../components/ui/index.js'
import Button from '../components/ui/Button.jsx'
import Modal from '../components/ui/Modal.jsx'
import { consumeSequentialEnter } from '../utils/erpEnterNav.js'
import { fmt, fmtShort, todayISO } from '../utils/helpers.js'
import FileImportConverter from '../modules/file-import/components/FileImportConverter.jsx'
import ErpImportModal from '../components/import/ErpImportModal.jsx'

const STATUS_OPTIONS = ['Active', 'Inactive', 'Discontinued']
const PRODUCT_TYPE_OPTIONS = ['Tablet', 'Capsule', 'Softgel', 'Syrup', 'Infusion', 'Injection', 'Other Goods']
const GST_OPTIONS = [0, 5, 12, 18, 28]
const EXPIRY_ALERT_DAYS = 60
let lastSelectedProductType = 'Tablet'
let lastSelectedGstSlab = 12

export function ItemsMasterPage() {
  const { itemMaster, addItem, updateItem, deleteItem, touchRecentItem } = useApp()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All Product Types')
  const [editor, setEditor] = useState(null)
  const [importOpen, setImportOpen] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return itemMaster.filter((item) => {
      const matchesQuery = !q
        || item.name.toLowerCase().includes(q)
        || String(item.batchNo || '').toLowerCase().includes(q)
        || String(item.barcode || '').toLowerCase().includes(q)
      const matchesCategory = category === 'All Product Types' || item.category === category
      return matchesQuery && matchesCategory
    })
  }, [category, itemMaster, query])

  return (
    <div className="animate-slide">
      <ErpImportModal open={importOpen} onClose={() => setImportOpen(false)} defaultKind="products" />
      <PageHeader
        title="Items"
        sub="Central inventory database for sales and purchase entry with fast keyboard-first search."
        right={(
          <>
            <Button variant="ghost" onClick={() => setImportOpen(true)}>Import</Button>
            <Button variant="primary" onClick={() => setEditor(createEmptyItem())}>+ Add Item</Button>
          </>
        )}
      />

      <Card style={{ marginBottom: 14 }}>
        <CardBody style={{ padding: '12px 14px', position: 'sticky', top: 0, zIndex: 5, background: 'var(--surface)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 360px) 200px', gap: 10, alignItems: 'end', justifyContent: 'start' }}>
            <Input label="Search Items" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search item, batch no., code or barcode" />
            <Select label="Product Type" value={category} onChange={(event) => setCategory(event.target.value)} options={['All Product Types', ...PRODUCT_TYPE_OPTIONS]} />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHead title="Items Master Table" sub="Compact ERP-style table with direct edit actions and minimal chrome." />
        <Table
          focusId="items-master-table"
          onRowClick={(row) => {
            touchRecentItem(row.id, 'edited')
            setEditor(row)
          }}
          cols={[
            { key: 'name', label: 'Item Name', bold: true },
            { key: 'category', label: 'Category' },
            { key: 'batchNo', label: 'Batch No.', mono: true, dim: true, render: (value) => value || '—' },
            { key: 'expiryDate', label: 'Expiry Date', render: (_, row) => <ExpiryCell item={row} /> },
            { key: 'gstSlab', label: 'GST', right: true, render: (value) => `${value}%` },
            { key: 'stockQty', label: 'Stock', right: true },
            { key: 'purchasePrice', label: 'Purchase Price', right: true, render: (value) => fmt(value) },
            { key: 'salesPrice', label: 'Sale Price', right: true, render: (value) => fmt(value) },
            { key: '_act', label: '', sortable: false, render: (_, row) => <ActionCell onEdit={() => { touchRecentItem(row.id, 'edited'); setEditor(row) }} onDelete={() => deleteItem(row.id)} /> },
          ]}
          rows={filtered}
          emptyMsg="No items found for this filter."
        />
      </Card>

      <ItemEditorModal
        value={editor}
        onClose={() => setEditor(null)}
        onSave={(payload, mode = 'close') => {
          if (payload.id) updateItem(payload.id, payload)
          else addItem(payload)
          setEditor(mode === 'new' ? createEmptyItem() : null)
        }}
      />
    </div>
  )
}

export function AiReportsDashboardPage() {
  return (
    <DashboardCardPage
      title="AI Analysed Reports"
      sub="Open a focused AI dashboard, then move into the individual prediction and analysis pages."
      focusId="ai-reports-dashboard"
      cards={AI_REPORT_DEFINITIONS}
    />
  )
}

export function BankingDashboardPage() {
  return (
    <DashboardCardPage
      title="Banking"
      sub="Loan accounts, checks, bank accounts and cash-in-hand flow from one clean banking dashboard."
      focusId="banking-dashboard"
      cards={BANKING_DEFINITIONS}
    />
  )
}

export function UtilitiesDashboardPage() {
  return (
    <DashboardCardPage
      title="Important Utilities"
      sub="Company management, backup, verification, item libraries and sync tools stay grouped here."
      focusId="utilities-dashboard"
      cards={UTILITY_DEFINITIONS}
    />
  )
}

export function AiReportPage() {
  const { reportId, salesView } = useParams()
  const navigate = useNavigate()
  const { reports, stockLedger, parties, itemMaster } = useApp()
  const report = AI_REPORT_DEFINITIONS.find((entry) => entry.id === reportId)
  if (!report) return null

  const topStock = stockLedger.slice().sort((a, b) => b.closingQty - a.closingQty).slice(0, 8)
  const deadStock = stockLedger.filter((row) => row.soldQty === 0)
  const customerRows = parties.map((party) => ({
    name: party.name,
    invoices: reports.filteredSales.filter((sale) => sale.party === party.name).length,
    value: reports.filteredSales.filter((sale) => sale.party === party.name).reduce((sum, sale) => sum + sale.total, 0),
  })).filter((row) => row.value > 0).sort((a, b) => b.value - a.value)
  const vendorRows = parties.map((party) => ({
    name: party.name,
    purchases: reports.filteredPurchases.filter((purchase) => purchase.supplier === party.name).length,
    value: reports.filteredPurchases.filter((purchase) => purchase.supplier === party.name).reduce((sum, purchase) => sum + purchase.amount, 0),
  })).filter((row) => row.value > 0).sort((a, b) => b.value - a.value)

  if (reportId === 'sales-prediction') {
    return (
      <AiSalesPredictionPage
        report={report}
        reports={reports}
        stockLedger={stockLedger}
        itemMaster={itemMaster}
        salesView={salesView}
        onBack={() => navigate('/ai-reports')}
      />
    )
  }

  const config = {
    'sales-prediction': {
      kpis: [
        { label: 'Projected Sales', value: fmtShort(reports.totals.totalSales * 1.12) },
        { label: 'Current Sales', value: fmtShort(reports.totals.totalSales) },
        { label: 'Tracked Items', value: stockLedger.length },
        { label: 'Growth Signal', value: '+12%' },
      ],
      rows: topStock.map((row) => ({ item: row.item, qty: row.soldQty, value: row.soldQty * row.valuationRate, note: 'Sales velocity' })),
    },
    'purchase-prediction': {
      kpis: [
        { label: 'Projected Purchase', value: fmtShort(reports.totals.totalPurchases * 1.08) },
        { label: 'Current Purchase', value: fmtShort(reports.totals.totalPurchases) },
        { label: 'Low Stock', value: stockLedger.filter((row) => row.closingQty <= 10).length },
        { label: 'Vendor Base', value: vendorRows.length },
      ],
      rows: vendorRows.map((row) => ({ item: row.name, qty: row.purchases, value: row.value, note: 'Vendor dependency' })),
    },
    'dead-stock-analysis': {
      kpis: [
        { label: 'Dead Stock', value: deadStock.length },
        { label: 'Blocked Value', value: fmtShort(deadStock.reduce((sum, row) => sum + row.valuation, 0)) },
        { label: 'Tracked Items', value: stockLedger.length },
        { label: 'Action Queue', value: deadStock.length },
      ],
      rows: deadStock.map((row) => ({ item: row.item, qty: row.closingQty, value: row.valuation, note: 'No movement' })),
    },
    'fast-moving-items': {
      kpis: [
        { label: 'Fast Movers', value: stockLedger.filter((row) => row.soldQty > 0).length },
        { label: 'Units Sold', value: stockLedger.reduce((sum, row) => sum + row.soldQty, 0) },
        { label: 'Low Balance', value: stockLedger.filter((row) => row.closingQty <= 10).length },
        { label: 'Sales Value', value: fmtShort(reports.totals.totalSales) },
      ],
      rows: stockLedger.filter((row) => row.soldQty > 0).sort((a, b) => b.soldQty - a.soldQty).map((row) => ({ item: row.item, qty: row.soldQty, value: row.valuationRate, note: 'Fast movement' })),
    },
    'smart-reorder-suggestions': {
      kpis: [
        { label: 'Reorder Queue', value: stockLedger.filter((row) => row.closingQty <= 10).length },
        { label: 'Required Budget', value: fmtShort(stockLedger.filter((row) => row.closingQty <= 10).reduce((sum, row) => sum + ((12 - row.closingQty) * row.valuationRate), 0)) },
        { label: 'Low Stock', value: stockLedger.filter((row) => row.closingQty <= 5).length },
        { label: 'Tracked Vendors', value: vendorRows.length },
      ],
      rows: stockLedger.filter((row) => row.closingQty <= 10).map((row) => ({ item: row.item, qty: Math.max(12 - row.closingQty, 4), value: row.valuationRate, note: 'Suggested reorder qty' })),
    },
    'profit-analysis': {
      kpis: [
        { label: 'Gross Profit', value: fmtShort(reports.totals.grossProfit) },
        { label: 'Net Profit', value: fmtShort(reports.totals.netProfit) },
        { label: 'Sales', value: fmtShort(reports.totals.totalSales) },
        { label: 'Expenses', value: fmtShort(reports.totals.totalExpenses) },
      ],
      rows: topStock.map((row) => ({ item: row.item, qty: row.soldQty, value: row.soldQty * row.valuationRate, note: 'Profit driver' })),
    },
    'gst-analysis': {
      kpis: [
        { label: 'GST Total', value: fmtShort(reports.filteredSales.reduce((sum, sale) => sum + (sale.tax || 0), 0)) },
        { label: 'Invoices', value: reports.filteredSales.length },
        { label: 'Taxable Sales', value: fmtShort(reports.totals.totalSales) },
        { label: 'GST Rows', value: stockLedger.length },
      ],
      rows: reports.filteredSales.map((row) => ({ item: row.id, qty: row.subtotal, value: row.tax || 0, note: row.party })),
    },
    'customer-behaviour': {
      kpis: [
        { label: 'Customers', value: customerRows.length },
        { label: 'Repeat Buyers', value: customerRows.filter((row) => row.invoices > 1).length },
        { label: 'Sales Value', value: fmtShort(reports.totals.totalSales) },
        { label: 'Invoices', value: reports.filteredSales.length },
      ],
      rows: customerRows.map((row) => ({ item: row.name, qty: row.invoices, value: row.value, note: 'Customer spend' })),
    },
    'vendor-analysis': {
      kpis: [
        { label: 'Vendors', value: vendorRows.length },
        { label: 'Purchase Value', value: fmtShort(reports.totals.totalPurchases) },
        { label: 'Purchase Bills', value: reports.filteredPurchases.length },
        { label: 'Dependency Alerts', value: vendorRows.filter((row) => row.purchases > 1).length },
      ],
      rows: vendorRows.map((row) => ({ item: row.name, qty: row.purchases, value: row.value, note: 'Vendor spend' })),
    },
    'expense-analysis': {
      kpis: [
        { label: 'Expense Total', value: fmtShort(reports.totals.totalExpenses) },
        { label: 'Expense Heads', value: reports.expenseAnalysis.length },
        { label: 'Operating Ratio', value: `${Math.round((reports.totals.totalExpenses / Math.max(reports.totals.totalSales, 1)) * 100)}%` },
        { label: 'Records', value: reports.filteredExpenses.length },
      ],
      rows: reports.expenseAnalysis.map((row) => ({ item: row.category, qty: row.count, value: row.amount, note: 'Expense category' })),
    },
  }[reportId]

  return (
    <AnalyticsDetailPage
      title={report.name}
      sub={report.desc}
      kpis={config.kpis}
      rows={config.rows}
      onBack={() => navigate('/ai-reports')}
      focusId={`ai-${reportId}`}
    />
  )
}

const OPEN_METEO_PRAYAGRAJ = {
  latitude: 25.4358,
  longitude: 81.8463,
  label: 'Prayagraj',
}

const SEASON_INTELLIGENCE = [
  {
    season: 'Summer',
    high: 'ORS, glucose, cold beverages, sunscreen, electrolyte sachets',
    low: 'Cough syrups, winter balms, heavy wool-care products',
    stock: 'Lift hydration and heat-care inventory by 18-24%.',
    profit: 86,
  },
  {
    season: 'Monsoon',
    high: 'Antifungal creams, mosquito repellents, fever medicine, digestive care',
    low: 'Heat-stroke products, sunscreen, dry-season wellness items',
    stock: 'Prioritize fever, infection and rain-footfall basket planning.',
    profit: 78,
  },
  {
    season: 'Winter',
    high: 'Cough syrups, vapor rubs, immunity boosters, pain relief gels',
    low: 'Cold beverages, heat-care sachets, high-summer consumables',
    stock: 'Build cold, cough and respiratory SKU depth before month-end.',
    profit: 82,
  },
]

const DISEASE_TABS = [
  { id: 'disease', label: 'Disease Stock' },
  { id: 'purchase', label: 'Items to Purchase' },
  { id: 'time', label: 'Day / Month Focus' },
]

const SALES_PREDICTION_PAGES = [
  { id: 'forecast', title: 'Sales Forecast', desc: 'Weekly and monthly demand, revenue and stock planning.' },
  { id: 'seasonal', title: 'Seasonal Intelligence', desc: 'Prepare inventory before seasonal demand arrives.' },
  { id: 'doctor-pattern', title: 'Doctor Pattern Analysis', desc: 'Prescription-driven stock and purchase signals.' },
  { id: 'disease-trend', title: 'Disease Trend Mapping', desc: 'Disease patterns linked to product demand.' },
  { id: 'stock-suggestion', title: 'Stock Suggestion', desc: 'What to buy, maintain, and optimize.' },
]


function SalesPredictionSubNav({ activeId, onNavigate, onBack, stats }) {
  const activePage = SALES_PREDICTION_PAGES.find((page) => page.id === activeId)
  return (
    <aside
      id="sales-prediction-subnav"
      data-focus-item="true"
      tabIndex={-1}
      style={{
        width: 248,
        flexShrink: 0,
        background: '#fff',
        borderRight: '1px solid #e6e6e6',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
      }}
    >
      <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid #ececec' }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'none',
            border: '1px solid #e5e5e5',
            borderRadius: 7,
            padding: '5px 10px',
            cursor: 'pointer',
            color: '#777',
            fontSize: 12,
            marginBottom: 14,
          }}
        >
          ← AI Reports
        </button>
        <div style={{ fontSize: 10.5, color: '#b45309', textTransform: 'uppercase', letterSpacing: '.08em', fontWeight: 600 }}>Forecasting</div>
        <div style={{ marginTop: 4, fontSize: 16, fontWeight: 600, color: '#222' }}>Sales Prediction</div>
        <div style={{ marginTop: 4, fontSize: 12, color: '#888', lineHeight: 1.45 }}>Plan demand, stock and revenue without leaving this module.</div>
      </div>

      {stats && (
        <div style={{ padding: '12px 16px', display: 'grid', gap: 6, borderBottom: '1px solid #ececec', background: '#fafafa' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ color: '#888' }}>Forecast accuracy</span>
            <strong style={{ color: '#9a4f09' }}>{stats.confidence}%</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ color: '#888' }}>Products tracked</span>
            <strong style={{ color: '#333' }}>{stats.products}</strong>
          </div>
          {stats.needsAction > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: '#888' }}>Need attention</span>
              <strong style={{ color: '#b42318' }}>{stats.needsAction}</strong>
            </div>
          )}
        </div>
      )}

      <nav style={{ padding: '10px 10px 16px', flex: 1, display: 'grid', gap: 4 }}>
        {SALES_PREDICTION_PAGES.map((page) => {
          const active = page.id === activeId
          return (
            <button
              key={page.id}
              type="button"
              onClick={() => onNavigate(page.id)}
              style={{
                textAlign: 'left',
                border: active ? '1px solid #eadfd5' : '1px solid transparent',
                borderRadius: 8,
                background: active ? '#fff7ed' : 'transparent',
                padding: '11px 12px',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {active && <span style={{ width: 3, height: 16, borderRadius: 99, background: '#d97706', flexShrink: 0 }} />}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: active ? 600 : 500, color: active ? '#9a4f09' : '#333' }}>{page.title}</div>
                  <div style={{ marginTop: 2, fontSize: 11.5, color: '#999', lineHeight: 1.4 }}>{page.desc}</div>
                </div>
              </div>
            </button>
          )
        })}
      </nav>

      {activePage && (
        <div style={{ padding: '12px 16px', borderTop: '1px solid #ececec', fontSize: 11.5, color: '#888', lineHeight: 1.45 }}>
          Viewing <strong style={{ color: '#555' }}>{activePage.title}</strong>
        </div>
      )}
    </aside>
  )
}

function SalesForecastPage({ model, weather, stockLedger, reports }) {
  const [period, setPeriod] = useState('Weekly')
  const [range, setRange] = useState('Week')
  const demandRows = useMemo(() => buildForecastDemandRows({ stockLedger, sales: reports.filteredSales }), [reports.filteredSales, stockLedger])
  const forecastRows = useMemo(() => buildForecastChartRows({ sales: reports.filteredSales, model, range }), [model, range, reports.filteredSales])

  useEffect(() => {
    setRange(period === 'Weekly' ? 'Week' : 'Month')
  }, [period])

  const periodKey = period === 'Weekly' ? 'weekly' : 'monthly'
  const reorderCount = demandRows.filter((row) => row[`${periodKey}Status`] === 'Increase Stock').length
  const totalDemand = demandRows.reduce((sum, row) => sum + (row[`${periodKey}Forecast`] || 0), 0)
  const totalRevenue = demandRows.reduce((sum, row) => sum + (row[`${periodKey}Revenue`] || 0), 0)
  const actionUnits = demandRows.reduce((sum, row) => sum + Math.max((row[`${periodKey}RecommendedStock`] || 0) - row.currentStock, 0), 0)
  const avgConfidence = demandRows.length
    ? Math.round(demandRows.reduce((sum, row) => sum + (row.confidence || 0), 0) / demandRows.length)
    : model.confidence
  const trendPct = period === 'Weekly' ? model.weeklyTrendPct : model.monthlyTrendPct
  const executiveNote = reorderCount > 0
    ? `${reorderCount} products need stock before next ${period === 'Weekly' ? 'week' : 'month'}. Order about ${actionUnits} units.`
    : `Expected ${period === 'Weekly' ? 'weekly' : 'monthly'} revenue opportunity: ${formatCurrencyCompact(totalRevenue)}.`

  return (
    <div style={{ display: 'grid', gap: 18, maxWidth: 1320, margin: '0 auto', width: '100%' }}>
      <section style={{
        border: '1px solid #e6e6e6',
        borderRadius: 10,
        background: 'var(--surface)',
        boxShadow: '0 1px 2px rgba(17,17,17,.03)',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '26px 28px 20px', borderBottom: '1px solid #ececec', display: 'grid', gap: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ minWidth: 280, flex: '1 1 520px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#b45309', fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.08em' }}>
                <span style={{ width: 5, height: 5, borderRadius: 99, background: '#d97706' }} />
                Sales Forecast
              </div>
              <h2 style={{ marginTop: 9, fontSize: 22, lineHeight: 1.2, fontWeight: 600, letterSpacing: 0, color: '#222' }}>
                {period === 'Weekly' ? 'Plan for next week' : 'Plan for next month'}
              </h2>
              <p style={{ marginTop: 8, maxWidth: 720, color: '#6f6f6f', fontSize: 13.5, lineHeight: 1.65, fontWeight: 400 }}>
                {period === 'Weekly'
                  ? 'See how much will sell next week, expected revenue, and which products need reordering.'
                  : 'See monthly demand, revenue opportunity, and recommended stock levels for every product.'}
              </p>
            </div>
            <div style={{ display: 'grid', gap: 12, justifyItems: 'end' }}>
              <ForecastPeriodTabs value={period} onChange={setPeriod} options={['Weekly', 'Monthly']} />
              <div style={{ flex: '0 1 360px', padding: '14px 15px', border: '1px solid #eadfd5', borderRadius: 9, background: '#fffdfb', maxWidth: 360 }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: '#b45309', textTransform: 'uppercase', letterSpacing: '.07em' }}>Summary</div>
                <div style={{ marginTop: 7, fontSize: 13.5, color: '#333', fontWeight: 400, lineHeight: 1.55 }}>{executiveNote}</div>
              </div>
            </div>
          </div>

          <div className="kpi-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 1, border: '1px solid #e7e7e7', borderRadius: 9, overflow: 'hidden', background: '#e7e7e7' }}>
            <ForecastKpiCard title={`Expected Demand (${period === 'Weekly' ? 'Week' : 'Month'})`} value={`${totalDemand.toLocaleString('en-IN')} units`} delta={`Across ${demandRows.length} products`} tone="neutral" />
            <ForecastKpiCard title="Revenue Forecast" value={formatCurrencyCompact(totalRevenue)} delta={`${period === 'Weekly' ? 'Next 7 days' : 'Next 30 days'}`} tone="orange" />
            <ForecastKpiCard title="Demand Trend" value={`${trendPct >= 0 ? '+' : ''}${trendPct}%`} delta={`vs. previous ${period === 'Weekly' ? 'week' : 'month'}`} tone={trendPct >= 0 ? 'green' : 'red'} />
            <ForecastKpiCard title="Stock to Order" value={actionUnits > 0 ? `${actionUnits} units` : 'Stock OK'} delta={`${avgConfidence}% forecast accuracy`} tone={actionUnits > 0 ? 'orange' : 'neutral'} />
          </div>
        </div>

        {weather.loading && <ForecastSkeleton />}
        {weather.error && <ForecastStateCard type="error" title="Live factor unavailable" message="Seasonal patterns from your sales history are still being used for predictions." />}

        <div style={{ padding: '22px 28px 8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 12 }}>
            <div>
              <h3 style={{ fontSize: 14.5, fontWeight: 600, color: '#2a2a2a' }}>{period === 'Weekly' ? 'Weekly sales trend' : 'Monthly sales trend'}</h3>
              <p style={{ fontSize: 12.5, color: '#777', marginTop: 3, lineHeight: 1.5 }}>Actual sales history and predicted {period.toLowerCase()} sales from your invoice data.</p>
            </div>
          </div>

          {forecastRows.length === 0 ? (
            <ForecastStateCard title="No sales history yet" message="Create sales invoices to unlock forecasts. Accuracy improves as you add more sales records." />
          ) : (
            <div style={{ width: '100%', height: 286 }}>
              <ResponsiveContainer>
                <LineChart data={forecastRows} margin={{ top: 14, right: 18, bottom: 4, left: 0 }}>
                  <CartesianGrid stroke="#ededed" strokeDasharray="3 6" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: '#8a8a8a', fontSize: 11, fontWeight: 400 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={formatAxisCurrency} tick={{ fill: '#8a8a8a', fontSize: 11, fontWeight: 400 }} axisLine={false} tickLine={false} width={62} />
                  <Tooltip content={<ForecastTooltip />} />
                  <Legend iconType="plainline" wrapperStyle={{ fontSize: 12, color: '#6f6f6f' }} />
                  <Line type="monotone" dataKey="actual" name="Actual Sales" stroke="#4b5563" strokeWidth={1.7} dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: '#4b5563' }} connectNulls animationDuration={650} />
                  <Line type="monotone" dataKey="predicted" name={`Predicted ${period} Sales`} stroke="#d97706" strokeWidth={1.8} strokeDasharray="5 5" dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: '#d97706' }} connectNulls animationDuration={750} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <ForecastDemandTable rows={demandRows} period={period} />
      </section>
    </div>
  )
}

function ForecastKpiCard({ title, value, delta, tone }) {
  const toneMap = {
    neutral: { color: '#777', value: '#222' },
    orange: { color: '#b45309', value: '#b45309' },
    green: { color: '#287047', value: '#287047' },
    red: { color: '#b42318', value: '#b42318' },
  }
  const currentTone = toneMap[tone] || toneMap.neutral
  return (
    <div style={{ background: '#fff', padding: '15px 17px', minHeight: 92 }}>
      <div style={{ fontSize: 11, fontWeight: 500, color: '#858585', textTransform: 'uppercase', letterSpacing: '.07em' }}>{title}</div>
      <div style={{ marginTop: 9, fontSize: 21, fontWeight: 600, color: currentTone.value, letterSpacing: 0, lineHeight: 1.05 }}>{value}</div>
      <div style={{ marginTop: 8, fontSize: 12.5, color: currentTone.color, fontWeight: 400, whiteSpace: 'normal', lineHeight: 1.4 }}>{delta}</div>
    </div>
  )
}

function ForecastTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#fff', border: '1px solid #e7e7e7', borderRadius: 8, boxShadow: '0 8px 20px rgba(17,17,17,.06)', padding: 12, minWidth: 180 }}>
      <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 8, color: '#333' }}>{label}</div>
      {payload.map((entry) => (
        <div key={entry.dataKey} style={{ display: 'flex', justifyContent: 'space-between', gap: 18, fontSize: 12, color: entry.color, marginTop: 4 }}>
          <span style={{ fontWeight: 400 }}>{entry.name}</span>
          <strong style={{ fontWeight: 500 }}>{formatCurrency(entry.value || 0)}</strong>
        </div>
      ))}
    </div>
  )
}

function ForecastDemandTable({ rows, period }) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [expandedId, setExpandedId] = useState(null)
  const periodKey = period === 'Weekly' ? 'weekly' : 'monthly'
  const forecastKey = `${periodKey}Forecast`
  const revenueKey = `${periodKey}Revenue`
  const recommendedKey = `${periodKey}RecommendedStock`
  const statusKey = `${periodKey}Status`
  const recommendationsKey = `${periodKey}Recommendations`
  const chartKey = `${periodKey}ChartData`
  const [sort, setSort] = useState({ key: forecastKey, dir: 'desc' })
  const criticalCount = rows.filter((row) => row[statusKey] === 'Increase Stock').length
  const monitorCount = rows.filter((row) => row[statusKey] === 'Monitor Stock').length
  const totalRevenue = rows.reduce((sum, row) => sum + (row[revenueKey] || 0), 0)

  useEffect(() => {
    setSort({ key: forecastKey, dir: 'desc' })
    setExpandedId(null)
  }, [forecastKey, period])

  const filteredRows = useMemo(() => {
    const search = query.trim().toLowerCase()
    const searched = rows.filter((row) => {
      const matchesSearch = !search || row.productName.toLowerCase().includes(search) || row[statusKey]?.toLowerCase().includes(search)
      const matchesStatus = statusFilter === 'All' || row[statusKey] === statusFilter
      return matchesSearch && matchesStatus
    })
    return searched.sort((a, b) => {
      const first = a[sort.key]
      const second = b[sort.key]
      const direction = sort.dir === 'asc' ? 1 : -1
      if (typeof first === 'number') return (first - second) * direction
      return String(first ?? '').localeCompare(String(second ?? '')) * direction
    })
  }, [forecastKey, query, rows, sort, statusFilter, statusKey])

  const setSortKey = (key) => {
    setSort((current) => current.key === key ? { key, dir: current.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' })
  }

  const periodLabel = period === 'Weekly' ? 'Weekly' : 'Monthly'

  return (
    <div style={{ marginTop: 12, borderTop: '1px solid #ececec' }}>
      <div style={{ padding: '22px 28px 16px', display: 'grid', gap: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#252525', letterSpacing: 0 }}>Product demand forecast</h3>
            <p style={{ marginTop: 5, fontSize: 13, color: '#777', lineHeight: 1.55 }}>
              {period === 'Weekly'
                ? 'How much will sell next week, expected revenue, and recommended stock for each product.'
                : 'How much will sell next month, expected revenue, and recommended stock for each product.'}
            </p>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 12 }}>
              <ForecastMiniStat label="need more stock" value={criticalCount} tone={criticalCount > 0 ? 'red' : 'neutral'} />
              <ForecastMiniStat label="to monitor" value={monitorCount} tone={monitorCount > 0 ? 'orange' : 'neutral'} />
              <ForecastMiniStat label={`${periodLabel.toLowerCase()} revenue`} value={formatCurrencyCompact(totalRevenue)} tone="orange" />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {['All', 'Stock OK', 'Monitor Stock', 'Increase Stock'].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                style={{
                  minHeight: 34,
                  border: statusFilter === status ? '1px solid #d9c9b7' : '1px solid #e5e5e5',
                  borderRadius: 999,
                  background: statusFilter === status ? '#fff7ed' : '#fff',
                  color: statusFilter === status ? '#9a4f09' : '#777',
                  padding: '0 14px',
                  fontSize: 12.5,
                  fontWeight: 400,
                }}
              >
                {status === 'Increase Stock' ? 'Increase' : status === 'Monitor Stock' ? 'Monitor' : status === 'Stock OK' ? 'OK' : status}
              </button>
            ))}
          </div>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#a1a1a1', fontSize: 14 }}>⌕</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search product..."
              style={{ minHeight: 38, width: 240, border: '1px solid #e2e2e2', borderRadius: 7, background: '#fff', color: '#333', padding: '0 12px 0 34px', fontSize: 13, fontWeight: 400, boxShadow: 'none' }}
            />
          </div>
        </div>
      </div>

      <div style={{ maxHeight: 620, overflow: 'auto', borderTop: '1px solid #ececec' }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: 760 }}>
          <thead>
            <tr>
              <th style={{ position: 'sticky', top: 0, zIndex: 2, padding: '12px 14px 12px 18px', background: '#fafafa', color: '#888', borderBottom: '1px solid #e5e5e5', textAlign: 'left', fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.07em', whiteSpace: 'nowrap', width: 32 }} />
              {[
                ['productName', 'Product'],
                ['currentStock', 'Current Stock'],
                [forecastKey, `${periodLabel} Forecast`],
                [recommendedKey, 'Recommended Stock'],
                [revenueKey, 'Expected Revenue'],
                [statusKey, 'Status'],
              ].map(([key, label]) => (
                <th
                  key={key}
                  onClick={() => setSortKey(key)}
                  style={{
                    position: 'sticky', top: 0, zIndex: 2, padding: '12px 18px',
                    background: key === forecastKey ? '#fff7ed' : '#fafafa',
                    color: key === forecastKey ? '#9a4f09' : '#888',
                    borderBottom: key === forecastKey ? '2px solid #d97706' : '1px solid #e5e5e5',
                    textAlign: key === 'productName' || key === statusKey ? 'left' : 'right',
                    fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.07em',
                    whiteSpace: 'nowrap', cursor: 'pointer', boxShadow: '0 1px 0 rgba(17,17,17,.02)',
                  }}
                >
                  {label} {sort.key === key ? <span style={{ color: '#c2410c' }}>{sort.dir === 'asc' ? '↑' : '↓'}</span> : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: 42, textAlign: 'center', color: 'var(--ink-40)', fontSize: 13 }}>No products match this search.</td>
              </tr>
            ) : filteredRows.map((row) => (
              <ForecastDemandRow
                key={row.id}
                row={row}
                period={period}
                recommendationsKey={recommendationsKey}
                chartKey={chartKey}
                forecastKey={forecastKey}
                revenueKey={revenueKey}
                recommendedKey={recommendedKey}
                statusKey={statusKey}
                expanded={expandedId === row.id}
                onToggle={() => setExpandedId(expandedId === row.id ? null : row.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ padding: '13px 28px 18px', borderTop: '1px solid #ececec', display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', fontSize: 12, color: '#888', background: '#fff' }}>
        <span>Showing {filteredRows.length} products · {periodLabel} view only</span>
        <span>Click a row to see sales trend chart</span>
      </div>
    </div>
  )
}

function ForecastPeriodTabs({ value, onChange, options = ['Weekly', 'Monthly'] }) {
  return (
    <div style={{ display: 'inline-flex', border: '1px solid #e5e5e5', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          style={{
            border: 'none',
            padding: '8px 18px',
            background: value === option ? '#fff7ed' : '#fff',
            color: value === option ? '#9a4f09' : '#777',
            fontSize: 13,
            fontWeight: value === option ? 600 : 400,
            borderBottom: value === option ? '2px solid #d97706' : '2px solid transparent',
          }}
        >
          {option}
        </button>
      ))}
    </div>
  )
}

function ForecastMiniStat({ label, value, tone }) {
  const toneColor = tone === 'red' ? '#b42318' : tone === 'orange' ? '#b45309' : '#333'
  return (
    <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 7, fontSize: 12.5, color: '#777', fontWeight: 400 }}>
      <strong style={{ color: toneColor, fontSize: 13.5, fontWeight: 500 }}>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

function ForecastDemandRow({ row, period, recommendationsKey, chartKey, forecastKey, revenueKey, recommendedKey, statusKey, expanded, onToggle }) {
  const [hovered, setHovered] = useState(false)
  const rowBackground = expanded ? '#fffaf5' : hovered ? '#faf8f4' : '#fff'
  const forecast = row[forecastKey]
  const recommendations = row[recommendationsKey] || []
  const suffix = period === 'Weekly' ? '/week' : '/month'

  return (
    <>
      <tr
        onClick={onToggle}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ transition: 'background .14s ease', cursor: 'pointer' }}
      >
        <td style={{ ...forecastTdStyle(true, rowBackground), padding: '15px 14px 15px 18px', width: 32 }}>
          <span style={{ display: 'inline-block', fontSize: 11, color: '#aaa', transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}>▶</span>
        </td>
        <td style={forecastTdStyle(true, rowBackground)}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 500, color: '#222' }}>{row.productName}</span>
                <ForecastTrendIndicator trend={row.trend} />
                {row.confidence >= 70 && (
                  <span style={{ fontSize: 10.5, color: '#888' }}>{row.confidence}% accurate</span>
                )}
              </div>
              {!expanded && recommendations[0] && (
                <div style={{ marginTop: 5, fontSize: 12, lineHeight: 1.4, color: recommendations[0].type === 'warn' ? '#9a5a05' : '#287047' }}>
                  {recommendations[0].type === 'ok' ? '✓' : '⚠'} {recommendations[0].text}
                </div>
              )}
            </div>
          </div>
        </td>
        <td style={forecastTdStyle(false, rowBackground)}>{row.currentStock}</td>
        <td style={{ ...forecastTdStyle(false, rowBackground), fontWeight: 600, color: '#9a4f09' }}>{forecast}{suffix}</td>
        <td style={forecastTdStyle(false, rowBackground)}>{row[recommendedKey]}</td>
        <td style={forecastTdStyle(false, rowBackground)}>{formatCurrency(row[revenueKey])}</td>
        <td style={forecastTdStyle(true, rowBackground)}><ForecastStatusBadge status={row[statusKey]} /></td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={7} style={{ padding: 0, borderBottom: '1px solid #ececec', background: '#fffaf5' }}>
            <div style={{ padding: '18px 28px 22px 50px', display: 'grid', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                {recommendations.map((rec, index) => (
                  <div key={index} style={{ padding: '10px 14px', borderRadius: 8, border: `1px solid ${rec.type === 'warn' ? '#efd8a3' : '#cde8d4'}`, background: rec.type === 'warn' ? '#fffaf0' : '#f6fbf7', fontSize: 13, color: rec.type === 'warn' ? '#7a4a00' : '#287047', lineHeight: 1.5 }}>
                    {rec.type === 'ok' ? '✓' : '⚠'} {rec.text}
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 500, color: '#555', marginBottom: 10 }}>
                  Sales trend — past history vs predicted {period.toLowerCase()} demand
                </div>
                <ForecastProductChart data={row[chartKey]} period={period} />
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function ForecastTrendIndicator({ trend }) {
  const config = {
    increasing: { symbol: '↑', label: 'Increasing', color: '#b45309', bg: '#fff7ed' },
    stable: { symbol: '→', label: 'Stable', color: '#6b7280', bg: '#f3f4f6' },
    decreasing: { symbol: '↓', label: 'Decreasing', color: '#287047', bg: '#f0fdf4' },
  }
  const current = config[trend] || config.stable
  return (
    <span title={current.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 500, color: current.color, background: current.bg, borderRadius: 999, padding: '2px 8px', whiteSpace: 'nowrap' }}>
      {current.symbol} {current.label}
    </span>
  )
}

function ForecastProductChart({ data, period }) {
  if (!data?.length) {
    return <div style={{ padding: 24, textAlign: 'center', color: '#999', fontSize: 13, border: '1px solid #ececec', borderRadius: 8, background: '#fff' }}>Add more sales invoices to see trend charts for this product.</div>
  }
  const predictedKey = period === 'Weekly' ? 'predictedDemand' : 'predictedDemand'
  const predictedName = period === 'Weekly' ? 'Predicted Weekly Demand' : 'Predicted Monthly Demand'
  return (
    <div style={{ width: '100%', height: 220, background: '#fff', border: '1px solid #ececec', borderRadius: 8, padding: '8px 4px 0' }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 10, right: 20, bottom: 4, left: 0 }}>
          <CartesianGrid stroke="#ededed" strokeDasharray="3 6" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: '#8a8a8a', fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#8a8a8a', fontSize: 10 }} axisLine={false} tickLine={false} width={36} />
          <Tooltip content={<ForecastProductTooltip />} />
          <Legend iconType="plainline" wrapperStyle={{ fontSize: 11, color: '#6f6f6f', paddingTop: 4 }} />
          <Line type="monotone" dataKey="pastSales" name="Past Sales" stroke="#4b5563" strokeWidth={1.6} dot={{ r: 2, fill: '#4b5563' }} connectNulls animationDuration={500} />
          <Line type="monotone" dataKey={predictedKey} name={predictedName} stroke="#d97706" strokeWidth={1.8} strokeDasharray="4 4" dot={{ r: 3, fill: '#d97706' }} connectNulls animationDuration={600} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function ForecastProductTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#fff', border: '1px solid #e7e7e7', borderRadius: 8, boxShadow: '0 8px 20px rgba(17,17,17,.06)', padding: 12, minWidth: 160 }}>
      <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 8, color: '#333' }}>{label}</div>
      {payload.filter((entry) => entry.value != null).map((entry) => (
        <div key={entry.dataKey} style={{ display: 'flex', justifyContent: 'space-between', gap: 18, fontSize: 12, color: entry.color, marginTop: 4 }}>
          <span>{entry.name}</span>
          <strong>{entry.value} units</strong>
        </div>
      ))}
    </div>
  )
}

function forecastTdStyle(left, background = 'var(--surface)') {
  return {
    padding: '15px 18px',
    borderBottom: '1px solid #eeeeee',
    textAlign: left ? 'left' : 'right',
    color: '#333',
    fontSize: 13,
    fontWeight: left ? 400 : 500,
    whiteSpace: 'nowrap',
    verticalAlign: 'middle',
    background,
    transition: 'background .14s ease',
  }
}

function ForecastStatusBadge({ status }) {
  const tone = status === 'Increase Stock'
    ? { color: '#b42318', bg: '#fff8f8', border: '#f2c8c8' }
    : status === 'Monitor Stock'
      ? { color: '#9a5a05', bg: '#fffaf0', border: '#efd8a3' }
      : { color: '#287047', bg: '#f6fbf7', border: '#cde8d4' }
  return <span style={{ display: 'inline-flex', alignItems: 'center', borderRadius: 999, padding: '4px 10px', fontSize: 12, fontWeight: 400, color: tone.color, background: tone.bg, border: `1px solid ${tone.border}`, whiteSpace: 'nowrap' }}>{status}</span>
}

function ForecastSkeleton() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, padding: '14px 28px 0' }}>
      {[1, 2, 3].map((item) => <div key={item} style={{ height: 8, borderRadius: 999, background: 'linear-gradient(90deg, var(--surface-3), var(--surface-2), var(--surface-3))' }} />)}
    </div>
  )
}

function ForecastStateCard({ type = 'empty', title, message }) {
  const isError = type === 'error'
  return (
    <div style={{ margin: isError ? '14px 28px 0' : 0, border: `1px solid ${isError ? '#efd8a3' : '#e7e7e7'}`, background: isError ? '#fffaf0' : '#fafafa', borderRadius: 8, padding: 14 }}>
      <div style={{ fontWeight: 500, color: isError ? '#9a5a05' : '#333' }}>{title}</div>
      <div style={{ marginTop: 5, fontSize: 12.5, color: '#777', lineHeight: 1.45 }}>{message}</div>
    </div>
  )
}

function SeasonalIntelligencePage({ stockLedger, reports }) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState({ key: 'revenueOpportunity', dir: 'desc' })
  const model = useMemo(() => buildSeasonalIntelligenceModel({ stockLedger, reports }), [reports, stockLedger])
  const filteredRows = useMemo(() => {
    const search = query.trim().toLowerCase()
    return model.products
      .filter((row) => !search || row.product.toLowerCase().includes(search) || row.action.toLowerCase().includes(search))
      .sort((first, second) => {
        const dir = sort.dir === 'asc' ? 1 : -1
        const firstValue = first[sort.key]
        const secondValue = second[sort.key]
        if (typeof firstValue === 'number') return (firstValue - secondValue) * dir
        return String(firstValue ?? '').localeCompare(String(secondValue ?? '')) * dir
      })
  }, [model.products, query, sort])

  const setSortKey = (key) => {
    setSort((current) => current.key === key ? { key, dir: current.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' })
  }

  return (
    <div style={{ display: 'grid', gap: 18, maxWidth: 1320, margin: '0 auto', width: '100%' }}>
      <section style={{ border: '1px solid #e6e6e6', borderRadius: 10, background: '#fff', boxShadow: '0 1px 2px rgba(17,17,17,.03)', overflow: 'hidden' }}>
        <div style={{ padding: '26px 28px 20px', borderBottom: '1px solid #ececec', display: 'grid', gap: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div style={{ flex: '1 1 560px', minWidth: 280 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#b45309', fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.08em' }}>
                <span style={{ width: 5, height: 5, borderRadius: 99, background: '#d97706' }} />
                Seasonal Intelligence
              </div>
              <h2 style={{ marginTop: 9, fontSize: 22, lineHeight: 1.2, fontWeight: 600, letterSpacing: 0, color: '#222' }}>Prepare stock before seasonal demand arrives</h2>
              <p style={{ marginTop: 8, maxWidth: 760, color: '#6f6f6f', fontSize: 13.5, lineHeight: 1.65, fontWeight: 400 }}>Plan inventory for {model.summary.upcomingSeason} using historical movement, stock position, and seasonal product demand patterns.</p>
            </div>
            <div style={{ flex: '0 1 360px', padding: '14px 15px', border: '1px solid #eadfd5', borderRadius: 9, background: '#fffdfb' }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: '#b45309', textTransform: 'uppercase', letterSpacing: '.07em' }}>Today</div>
              <div style={{ marginTop: 7, fontSize: 13.5, color: '#333', fontWeight: 400, lineHeight: 1.55 }}>{model.summary.primaryRecommendation}</div>
            </div>
          </div>

          <div className="kpi-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 1, border: '1px solid #e7e7e7', borderRadius: 9, overflow: 'hidden', background: '#e7e7e7' }}>
            <ForecastKpiCard title="Upcoming Season" value={model.summary.upcomingSeason} delta={`${model.summary.daysUntilSeason} days to prepare`} tone="neutral" />
            <ForecastKpiCard title="Sales Growth" value={`+${model.summary.expectedGrowth}%`} delta="Expected seasonal lift" tone="green" />
            <ForecastKpiCard title="Readiness Score" value={`${model.summary.readinessScore}%`} delta={`${model.summary.riskProducts} risk products`} tone="orange" />
            <ForecastKpiCard title="Revenue Opportunity" value={formatCurrencyCompact(model.summary.revenueOpportunity)} delta={`${model.summary.opportunityProducts} opportunity products`} tone="neutral" />
          </div>
        </div>

        <SeasonalProductForecastTable rows={filteredRows} query={query} setQuery={setQuery} sort={sort} setSortKey={setSortKey} totalRows={model.products.length} />

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(320px, .9fr)', gap: 0, borderTop: '1px solid #ececec' }}>
          <SeasonalDemandHeatmap rows={model.heatmap} />
          <SeasonalInsightsPanel insights={model.insights} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, .9fr) minmax(0, 1.1fr)', gap: 0, borderTop: '1px solid #ececec' }}>
          <SeasonalBusinessImpact impact={model.impact} />
          <SeasonalTimeline timeline={model.timeline} />
        </div>
      </section>
    </div>
  )
}

function SeasonalProductForecastTable({ rows, query, setQuery, sort, setSortKey, totalRows }) {
  const columns = [
    ['product', 'Product'],
    ['lastSeasonSales', 'Last Season Sales'],
    ['predictedSales', 'Predicted Sales'],
    ['currentStock', 'Current Stock'],
    ['recommendedStock', 'Recommended Stock'],
    ['revenueOpportunity', 'Revenue Opportunity'],
    ['action', 'Action Required'],
  ]

  return (
    <div style={{ borderTop: '1px solid #ececec' }}>
      <div style={{ padding: '22px 28px 16px', display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) auto', gap: 20, alignItems: 'end' }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#252525' }}>Product forecast</h3>
          <p style={{ marginTop: 5, fontSize: 13, color: '#777', lineHeight: 1.55 }}>Seasonal action plan for products likely to move, slow down, or create revenue opportunity.</p>
        </div>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#a1a1a1', fontSize: 14 }}>⌕</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search product or action..."
            style={{ minHeight: 38, width: 300, border: '1px solid #e2e2e2', borderRadius: 7, background: '#fff', color: '#333', padding: '0 12px 0 34px', fontSize: 13, fontWeight: 400 }}
          />
        </div>
      </div>

      <div style={{ maxHeight: 520, overflow: 'auto', borderTop: '1px solid #ececec' }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: 980 }}>
          <thead>
            <tr>
              {columns.map(([key, label]) => (
                <th key={key} onClick={() => setSortKey(key)} style={{ position: 'sticky', top: 0, zIndex: 2, padding: '12px 18px', background: '#fafafa', color: '#888', borderBottom: '1px solid #e5e5e5', textAlign: key === 'product' || key === 'action' ? 'left' : 'right', fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.07em', whiteSpace: 'nowrap', cursor: 'pointer' }}>
                  {label} {sort.key === key ? <span style={{ color: '#c2410c' }}>{sort.dir === 'asc' ? 'Asc' : 'Desc'}</span> : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={columns.length} style={{ padding: 42, textAlign: 'center', color: '#777', fontSize: 13 }}>No seasonal products match this search.</td></tr>
            ) : rows.map((row, index) => <SeasonalProductRow key={row.product} row={row} featured={index === 0} />)}
          </tbody>
        </table>
      </div>
      <div style={{ padding: '13px 28px 18px', borderTop: '1px solid #ececec', display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', fontSize: 12, color: '#888', background: '#fff' }}>
        <span>Showing {rows.length} of {totalRows} products.</span>
        <span>Sorted by {sort.key.replace(/([A-Z])/g, ' $1').toLowerCase()}.</span>
      </div>
    </div>
  )
}

function SeasonalProductRow({ row, featured }) {
  const [hovered, setHovered] = useState(false)
  const background = hovered || featured ? '#faf8f4' : '#fff'
  return (
    <tr onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <td style={seasonalTdStyle(true, background)}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span style={{ width: featured ? 3 : 2, minHeight: 38, borderRadius: 99, background: row.action === 'Increase Stock' ? '#d97706' : row.action === 'Reduce Stock' ? '#b42318' : '#d1d5db', marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 500, color: '#222' }}>{row.product}</div>
            <div style={{ marginTop: 6, fontSize: 12.5, color: '#777', lineHeight: 1.45 }}>{row.note}</div>
          </div>
        </div>
      </td>
      <td style={seasonalTdStyle(false, background)}>{row.lastSeasonSales}</td>
      <td style={seasonalTdStyle(false, background)}>{row.predictedSales}</td>
      <td style={seasonalTdStyle(false, background)}>{row.currentStock}</td>
      <td style={seasonalTdStyle(false, background)}>{row.recommendedStock}</td>
      <td style={seasonalTdStyle(false, background)}>{formatCurrency(row.revenueOpportunity)}</td>
      <td style={seasonalTdStyle(true, background)}><SeasonalActionBadge action={row.action} /></td>
    </tr>
  )
}

function seasonalTdStyle(left, background) {
  return {
    padding: '15px 18px',
    borderBottom: '1px solid #eeeeee',
    textAlign: left ? 'left' : 'right',
    color: '#333',
    fontSize: 13,
    fontWeight: left ? 400 : 500,
    whiteSpace: 'nowrap',
    verticalAlign: 'middle',
    background,
    transition: 'background .14s ease',
  }
}

function SeasonalActionBadge({ action }) {
  const tone = action === 'Increase Stock'
    ? { color: '#9a5a05', bg: '#fffaf0', border: '#efd8a3' }
    : action === 'Reduce Stock'
      ? { color: '#b42318', bg: '#fff8f8', border: '#f2c8c8' }
      : { color: '#287047', bg: '#f6fbf7', border: '#cde8d4' }
  return <span style={{ display: 'inline-flex', borderRadius: 999, padding: '4px 10px', fontSize: 12, fontWeight: 400, color: tone.color, background: tone.bg, border: `1px solid ${tone.border}` }}>{action}</span>
}

function SeasonalDemandHeatmap({ rows }) {
  return (
    <div style={{ padding: '22px 28px', borderRight: '1px solid #ececec' }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, color: '#252525' }}>Seasonal demand heatmap</h3>
      <p style={{ marginTop: 5, fontSize: 13, color: '#777', lineHeight: 1.55 }}>Demand intensity by product across Summer, Monsoon, Winter and Festival seasons.</p>
      <div style={{ marginTop: 16, display: 'grid', gap: 8 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(170px, 1fr) repeat(4, 88px)', gap: 8, fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '.06em' }}>
          <span>Product</span><span>Summer</span><span>Monsoon</span><span>Winter</span><span>Festival</span>
        </div>
        {rows.map((row) => (
          <div key={row.product} style={{ display: 'grid', gridTemplateColumns: 'minmax(170px, 1fr) repeat(4, 88px)', gap: 8, alignItems: 'center' }}>
            <div style={{ fontSize: 13, color: '#333', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.product}</div>
            {['Summer', 'Monsoon', 'Winter', 'Festival'].map((season) => <HeatCell key={season} value={row[season]} />)}
          </div>
        ))}
      </div>
    </div>
  )
}

function HeatCell({ value }) {
  const opacity = Math.max(0.08, Math.min(0.42, value / 220))
  return (
    <div style={{ height: 28, borderRadius: 6, background: `rgba(217, 119, 6, ${opacity})`, border: '1px solid rgba(217,119,6,.14)', display: 'grid', placeItems: 'center', color: '#333', fontSize: 12, fontWeight: 500 }}>
      {value}
    </div>
  )
}

function SeasonalInsightsPanel({ insights }) {
  return (
    <div style={{ padding: '22px 28px' }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, color: '#252525' }}>Insights and alerts</h3>
      <p style={{ marginTop: 5, fontSize: 13, color: '#777', lineHeight: 1.55 }}>Recommended decisions based on seasonal movement and current stock.</p>
      <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
        {insights.map((insight) => (
          <div key={insight.title} style={{ border: '1px solid #ececec', borderRadius: 8, padding: 12, background: insight.tone === 'critical' ? '#fff8f8' : '#fff' }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: insight.tone === 'critical' ? '#b42318' : '#333' }}>{insight.title}</div>
            <div style={{ marginTop: 5, fontSize: 12.5, lineHeight: 1.5, color: '#777' }}>{insight.message}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SeasonalBusinessImpact({ impact }) {
  return (
    <div style={{ padding: '22px 28px', borderRight: '1px solid #ececec' }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, color: '#252525' }}>Business impact</h3>
      <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
        {impact.map((item) => (
          <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 18, borderBottom: '1px solid #f0f0f0', paddingBottom: 10 }}>
            <div>
              <div style={{ fontSize: 13, color: '#333', fontWeight: 500 }}>{item.label}</div>
              <div style={{ marginTop: 3, fontSize: 12.5, color: '#777' }}>{item.note}</div>
            </div>
            <div style={{ fontSize: 14, color: item.tone === 'orange' ? '#b45309' : '#333', fontWeight: 500, whiteSpace: 'nowrap' }}>{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SeasonalTimeline({ timeline }) {
  return (
    <div style={{ padding: '22px 28px' }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, color: '#252525' }}>Seasonal timeline</h3>
      <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        {timeline.map((season) => (
          <div key={season.season} style={{ border: '1px solid #ececec', borderRadius: 8, padding: 13, background: '#fff' }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#333' }}>{season.season}</div>
            <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
              {season.products.map((product) => <div key={product} style={{ fontSize: 12.5, color: '#777', lineHeight: 1.4 }}>{product}</div>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function DoctorPatternPage({ period, onPeriodChange, topProducts }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
      <Card>
        <CardHead title="Items & Current Stock" right={<SegmentControl value={period} onChange={onPeriodChange} options={['Day', 'Week', 'Month']} />} />
        <Table
          cols={[
            { key: 'item', label: 'Item Name', bold: true },
            { key: 'currentStock', label: 'Current Stock', right: true },
            { key: 'risk', label: 'Risk Alert' },
          ]}
          rows={topProducts}
        />
      </Card>
      <Card>
        <CardHead title="Purchase Prediction AI" />
        <CardBody style={{ display: 'grid', gap: 10 }}>
          {topProducts.slice(0, 7).map((row) => <PurchasePredictionRow key={row.item} row={row} />)}
        </CardBody>
      </Card>
    </div>
  )
}

function DiseaseTrendPage({ activeTab, onTabChange, rows, period, onPeriodChange }) {
  return (
    <Card>
      <CardHead
        title="Disease Trend Mapping"
        right={
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <SegmentControl value={activeTab} onChange={onTabChange} options={DISEASE_TABS.map((tab) => tab.id)} labels={Object.fromEntries(DISEASE_TABS.map((tab) => [tab.id, tab.label]))} />
            <SegmentControl value={period} onChange={onPeriodChange} options={['Day', 'Week', 'Month']} />
          </div>
        }
      />
      <CardBody>
        <DiseaseImpactPanel activeTab={activeTab} rows={rows} />
      </CardBody>
    </Card>
  )
}

function StockSuggestionPage({ recommendations }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
      <RecommendationColumn title="Items to Purchase" rows={recommendations.mustBuy} color="var(--ink)" />
      <RecommendationColumn title="Items to Maintain Stock" rows={recommendations.maintain} color="var(--ink)" />
      <RecommendationColumn title="Inventory Optimization Suggestions" rows={recommendations.emerging} color="var(--ink)" />
    </div>
  )
}

function SimpleBarChart({ title, rows }) {
  const maxValue = Math.max(...rows.map((row) => Number(row.value) || 0), 1)
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>{title}</div>
      <div style={{ display: 'grid', gap: 8 }}>
        {rows.map((row) => (
          <div key={row.label} style={{ display: 'grid', gridTemplateColumns: 'minmax(90px, 160px) 1fr 90px', gap: 10, alignItems: 'center' }}>
            <div style={{ fontSize: 12, color: 'var(--ink-40)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.label}</div>
            <div style={{ height: 8, background: 'var(--surface-3)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ width: `${Math.max((Number(row.value) || 0) / maxValue * 100, 4)}%`, height: '100%', background: 'var(--ink)' }} />
            </div>
            <div style={{ textAlign: 'right', fontSize: 12, fontWeight: 700 }}>{fmtShort(row.value)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AiSalesPredictionPage({ report, reports, stockLedger, itemMaster, salesView, onBack }) {
  const [weather, setWeather] = useState({ loading: true, data: null, error: '' })
  const [demandPeriod, setDemandPeriod] = useState('Month')
  const [diseaseTab, setDiseaseTab] = useState('disease')
  const navigate = useNavigate()
  const activePageId = salesView || 'forecast'

  useEffect(() => {
    if (!salesView) navigate('/ai-reports/sales-prediction/forecast', { replace: true })
  }, [navigate, salesView])

  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams({
      latitude: String(OPEN_METEO_PRAYAGRAJ.latitude),
      longitude: String(OPEN_METEO_PRAYAGRAJ.longitude),
      current: 'temperature_2m,weather_code,wind_speed_10m',
      hourly: 'precipitation_probability',
      timezone: 'auto',
      forecast_days: '1',
    })

    fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Weather service unavailable')
        return response.json()
      })
      .then((payload) => {
        const rainProbability = Number(payload?.hourly?.precipitation_probability?.[0] ?? 0)
        setWeather({
          loading: false,
          error: '',
          data: {
            temperature: Number(payload?.current?.temperature_2m ?? 0),
            weatherCode: Number(payload?.current?.weather_code ?? 0),
            rainProbability,
            windSpeed: Number(payload?.current?.wind_speed_10m ?? 0),
            fetchedAt: payload?.current?.time ?? '',
          },
        })
      })
      .catch((error) => {
        if (error.name === 'AbortError') return
        setWeather({ loading: false, data: null, error: 'Live weather unavailable' })
      })

    return () => controller.abort()
  }, [])

  const model = useMemo(
    () => buildAiSalesPredictionModel({ reports, stockLedger, itemMaster, weather: weather.data }),
    [itemMaster, reports, stockLedger, weather.data],
  )

  const demandRows = useMemo(
    () => buildForecastDemandRows({ stockLedger, sales: reports.filteredSales }),
    [reports.filteredSales, stockLedger],
  )

  const topProducts = useMemo(() => buildDemandProducts({ stockLedger, itemMaster, period: demandPeriod }), [demandPeriod, itemMaster, stockLedger])
  const diseaseRows = useMemo(() => buildDiseaseRows({ stockLedger, weather: weather.data, period: demandPeriod }), [demandPeriod, stockLedger, weather.data])
  const recommendations = useMemo(() => buildSmartRecommendations(stockLedger, model.weatherImpactScore), [model.weatherImpactScore, stockLedger])
  const goToPage = (pageId) => navigate(`/ai-reports/sales-prediction/${pageId}`)
  const needsAction = demandRows.filter((row) => row.weeklyStatus === 'Increase Stock' || row.monthlyStatus === 'Increase Stock').length

  return (
    <div
      className="animate-slide"
      style={{
        display: 'flex',
        margin: '-18px -20px',
        minHeight: 'calc(100vh - var(--topbar-h))',
        width: 'calc(100% + 40px)',
      }}
    >
      <SalesPredictionSubNav
        activeId={activePageId}
        onNavigate={goToPage}
        onBack={onBack}
        stats={{
          confidence: model.confidence,
          products: stockLedger.length,
          needsAction,
        }}
      />

      <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '18px 22px', background: 'var(--bg)' }}>
        {activePageId === 'forecast' && <SalesForecastPage model={model} weather={weather} stockLedger={stockLedger} reports={reports} />}
        {activePageId === 'seasonal' && <SeasonalIntelligencePage stockLedger={stockLedger} reports={reports} />}
        {activePageId === 'doctor-pattern' && (
          <DoctorPatternPage
            period={demandPeriod}
            onPeriodChange={setDemandPeriod}
            topProducts={topProducts}
          />
        )}
        {activePageId === 'disease-trend' && (
          <DiseaseTrendPage
            activeTab={diseaseTab}
            onTabChange={setDiseaseTab}
            rows={diseaseRows}
            period={demandPeriod}
            onPeriodChange={setDemandPeriod}
          />
        )}
        {activePageId === 'stock-suggestion' && <StockSuggestionPage recommendations={recommendations} />}

        {!SALES_PREDICTION_PAGES.some((page) => page.id === activePageId) && (
          <Card>
            <CardBody>No Sales Prediction page found.</CardBody>
          </Card>
        )}
      </div>
    </div>
  )
}

function buildForecastChartRows({ sales, model, range }) {
  const history = buildDailySalesHistory(sales)
  const windowSize = range === 'Week' ? 14 : 30
  const visibleHistory = history.slice(-Math.min(windowSize, Math.max(history.length, 6)))
  const lastActual = visibleHistory.at(-1)?.actual || model.previousWeek || model.nextWeek
  const baseDate = parseBusinessDate(visibleHistory.at(-1)?.date) || new Date()
  const projectedDays = range === 'Week' ? 7 : 12
  const futureRows = Array.from({ length: projectedDays }, (_, index) => {
    const date = new Date(baseDate)
    date.setDate(date.getDate() + index + 1)
    const seasonLift = 1 + (model.seasonalScore / 100)
    const trendPct = range === 'Week' ? model.weeklyTrendPct : model.monthlyTrendPct
    const momentumLift = 1 + ((trendPct / 100) * ((index + 1) / projectedDays))
    const baseValue = range === 'Week' ? (lastActual || model.nextWeek) / 7 : (lastActual || model.nextMonth) / 30
    const predicted = Math.max(0, Math.round(baseValue * seasonLift * momentumLift * (range === 'Week' ? 7 : 30)))
    return {
      id: `future-${index}`,
      date: date.toISOString(),
      label: formatForecastDate(date, range),
      actual: null,
      predicted,
    }
  })

  return [
    ...visibleHistory.map((row, index) => ({
      ...row,
      id: `history-${index}`,
      label: formatForecastDate(parseBusinessDate(row.date) || new Date(), range),
      predicted: index === visibleHistory.length - 1 ? row.actual : null,
    })),
    ...futureRows,
  ]
}

function buildDailySalesHistory(sales = []) {
  const byDate = new Map()
  sales.forEach((sale) => {
    const parsed = parseBusinessDate(sale.date)
    if (!parsed) return
    const key = parsed.toISOString().slice(0, 10)
    byDate.set(key, (byDate.get(key) || 0) + (Number(sale.total) || 0))
  })
  return Array.from(byDate.entries())
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([date, actual]) => ({ date, actual }))
}

function buildProductSalesAnalytics(sales, productKey) {
  const dailyHistory = new Map()
  let invoiceLines = 0
  let totalRevenue = 0
  const now = new Date()
  now.setHours(0, 0, 0, 0)

  sales.forEach((invoice) => {
    const parsed = parseBusinessDate(invoice.date)
    if (!parsed) return
    parsed.setHours(0, 0, 0, 0)
    invoice.items?.forEach((item) => {
      const key = String(item.desc || '').trim()
      if (key !== productKey) return
      const qty = Number(item.qty) || 0
      const revenue = Number(item.amount) || qty * (Number(item.rate) || 0)
      invoiceLines += 1
      totalRevenue += revenue
      const dateKey = parsed.toISOString().slice(0, 10)
      dailyHistory.set(dateKey, (dailyHistory.get(dateKey) || 0) + qty)
    })
  })

  const sumRange = (startDaysAgo, endDaysAgo) => {
    let sum = 0
    for (let offset = startDaysAgo; offset < endDaysAgo; offset += 1) {
      const date = new Date(now)
      date.setDate(date.getDate() - offset)
      sum += dailyHistory.get(date.toISOString().slice(0, 10)) || 0
    }
    return sum
  }

  const last7 = sumRange(0, 7)
  const prev7 = sumRange(7, 14)
  const last28 = sumRange(0, 28)
  const prev28 = sumRange(28, 56)
  const last90 = sumRange(0, 90)
  const dataPoints = dailyHistory.size
  const totalQty = Array.from(dailyHistory.values()).reduce((sum, qty) => sum + qty, 0)

  return {
    dailyHistory,
    invoiceLines,
    totalRevenue,
    totalQty,
    dataPoints,
    last7,
    prev7,
    last28,
    prev28,
    last90,
  }
}

function computeTrendPct(recent, older) {
  if (older <= 0) return recent > 0 ? 10 : 0
  return Math.round(((recent - older) / older) * 100)
}

function resolveForecastStatus(currentStock, forecastDemand, recommendedStock) {
  if (currentStock < forecastDemand) return 'Increase Stock'
  if (currentStock < recommendedStock) return 'Monitor Stock'
  return 'Stock OK'
}

function buildForecastDemandRows({ stockLedger, sales }) {
  const season = getUpcomingSeason()
  const stockRows = stockLedger.length
    ? stockLedger
    : buildProductSalesSummary(sales).map((row) => ({
      item: row.product,
      soldQty: row.qty,
      closingQty: 0,
      valuationRate: row.revenue / Math.max(row.qty, 1),
    }))

  return stockRows
    .map((row, index) => {
      const analytics = buildProductSalesAnalytics(sales, row.item)
      const unitRate = Math.max(
        Number(row.valuationRate) || analytics.totalRevenue / Math.max(analytics.totalQty, 1) || 0,
        1,
      )
      const currentStock = Math.max(0, Math.round(Number(row.closingQty) || 0))
      const soldQty = row.soldQty || analytics.totalQty || 0
      const seasonalLift = seasonalProductLift(row.item, season.name)
      const weeklyTrendPct = computeTrendPct(analytics.last7, analytics.prev7)
      const monthlyTrendPct = computeTrendPct(analytics.last28, analytics.prev28)
      const trendFactorWeek = 1 + Math.max(-0.18, Math.min(0.28, weeklyTrendPct / 100))
      const trendFactorMonth = 1 + Math.max(-0.15, Math.min(0.24, monthlyTrendPct / 100))
      const stockMovementFactor = soldQty > 0 && currentStock <= 5 ? 1.08 : 1

      const baseWeekly = analytics.last28 > 0
        ? analytics.last28 / 4
        : Math.max(soldQty / 4, 1)
      const baseMonthly = analytics.last90 > 0
        ? analytics.last90 / 3
        : Math.max(baseWeekly * 4.33, 1)

      const weeklyForecast = Math.max(1, Math.ceil(baseWeekly * trendFactorWeek * seasonalLift * stockMovementFactor))
      const monthlyForecast = Math.max(weeklyForecast, Math.ceil(baseMonthly * trendFactorMonth * seasonalLift * stockMovementFactor))
      const weeklyRecommendedStock = Math.max(Math.ceil(weeklyForecast * 1.25), weeklyForecast + 12)
      const monthlyRecommendedStock = Math.max(Math.ceil(monthlyForecast * 1.12), monthlyForecast + 50)
      const weeklyRevenue = Math.round(weeklyForecast * unitRate)
      const monthlyRevenue = Math.round(monthlyForecast * unitRate)
      const trend = weeklyTrendPct >= 8 ? 'increasing' : weeklyTrendPct <= -8 ? 'decreasing' : 'stable'
      const confidence = Math.min(
        94,
        Math.round(50 + analytics.dataPoints * 2.2 + analytics.invoiceLines * 1.5 + Math.min(sales.length, 40) * 0.35),
      )

      const weeklyStockGap = Math.max(weeklyRecommendedStock - currentStock, 0)
      const monthlyStockGap = Math.max(monthlyRecommendedStock - currentStock, 0)
      const weeklyStatus = resolveForecastStatus(currentStock, weeklyForecast, weeklyRecommendedStock)
      const monthlyStatus = resolveForecastStatus(currentStock, monthlyForecast, monthlyRecommendedStock)

      return {
        id: `${row.item}-${index}`,
        productName: row.item,
        currentStock,
        weeklyForecast,
        monthlyForecast,
        weeklyRecommendedStock,
        monthlyRecommendedStock,
        weeklyRevenue,
        monthlyRevenue,
        weeklyStatus,
        monthlyStatus,
        trend,
        confidence,
        weeklyRecommendations: buildProductRecommendations({
          period: 'Weekly',
          currentStock,
          forecast: weeklyForecast,
          recommendedStock: weeklyRecommendedStock,
          stockGap: weeklyStockGap,
          status: weeklyStatus,
          trend,
          seasonalLift,
          trendPct: weeklyTrendPct,
        }),
        monthlyRecommendations: buildProductRecommendations({
          period: 'Monthly',
          currentStock,
          forecast: monthlyForecast,
          recommendedStock: monthlyRecommendedStock,
          stockGap: monthlyStockGap,
          status: monthlyStatus,
          trend,
          seasonalLift,
          trendPct: monthlyTrendPct,
        }),
        weeklyChartData: buildProductForecastChartData({
          history: analytics.dailyHistory,
          forecast: weeklyForecast,
          period: 'Weekly',
        }),
        monthlyChartData: buildProductForecastChartData({
          history: analytics.dailyHistory,
          forecast: monthlyForecast,
          period: 'Monthly',
        }),
      }
    })
    .sort((a, b) => b.weeklyRevenue - a.weeklyRevenue)
}

function computeDemandTrend(velocity = {}) {
  const recent = velocity.recentQty || 0
  const older = velocity.olderQty || 0
  if (older <= 0 && recent <= 0) return 'stable'
  if (older <= 0) return 'increasing'
  const change = ((recent - older) / older) * 100
  if (change >= 8) return 'increasing'
  if (change <= -8) return 'decreasing'
  return 'stable'
}

function buildProductRecommendations({ period, currentStock, forecast, recommendedStock, stockGap, status, trend, seasonalLift, trendPct }) {
  const messages = []
  const seasonalChangePct = Math.round((seasonalLift - 1) * 100)
  const periodLabel = period === 'Weekly' ? 'week' : 'month'

  if (status === 'Stock OK') {
    const coverage = period === 'Weekly'
      ? Math.min(Math.floor(currentStock / Math.max(forecast / 7, 1)), 7)
      : Math.min(Math.floor(currentStock / Math.max(forecast / 30, 1)), 30)
    messages.push({ type: 'ok', text: `Stock is sufficient for the next ${coverage} days.` })
  } else if (status === 'Increase Stock') {
    const unitsNeeded = Math.max(forecast - currentStock, stockGap)
    messages.push({
      type: 'warn',
      text: period === 'Weekly'
        ? `Increase inventory by ${unitsNeeded} units before next week.`
        : `Increase inventory by ${unitsNeeded} units for next month.`,
    })
  } else {
    messages.push({ type: 'warn', text: `Add ${stockGap} units to reach recommended stock of ${recommendedStock}.` })
  }

  if (trend === 'increasing' && trendPct > 0) {
    messages.push({
      type: 'warn',
      text: period === 'Weekly'
        ? `Demand rising ${Math.abs(trendPct)}% vs last week — plan ahead.`
        : `Demand expected to rise by ${Math.max(seasonalChangePct, Math.abs(trendPct))}% next month.`,
    })
  } else if (trend === 'decreasing') {
    messages.push({ type: 'ok', text: `Demand is slowing this ${periodLabel} — avoid over-ordering.` })
  }

  if (status !== 'Stock OK' && currentStock < forecast * 0.5) {
    messages.push({
      type: 'warn',
      text: `Expected ${periodLabel} sales: ${forecast} units. You have only ${currentStock} in stock.`,
    })
  }

  return messages.slice(0, 3)
}

function buildProductForecastChartData({ history, forecast, period }) {
  const historyMap = history instanceof Map ? history : new Map()
  const historyEntries = Array.from(historyMap.entries()).sort(([a], [b]) => a.localeCompare(b))

  if (period === 'Weekly') {
    const weeklyBuckets = new Map()
    historyEntries.forEach(([date, qty]) => {
      const parsed = new Date(date)
      const weekStart = new Date(parsed)
      weekStart.setDate(parsed.getDate() - parsed.getDay())
      const key = weekStart.toISOString().slice(0, 10)
      weeklyBuckets.set(key, (weeklyBuckets.get(key) || 0) + qty)
    })
    const historyRows = Array.from(weeklyBuckets.entries()).slice(-8).map(([date, qty], index) => ({
      id: `hist-${index}`,
      label: new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      pastSales: qty,
      predictedDemand: null,
    }))
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 7)
    return [
      ...historyRows,
      {
        id: 'future-0',
        label: `Next ${period}`,
        pastSales: null,
        predictedDemand: forecast,
      },
    ]
  }

  const monthlyBuckets = new Map()
  historyEntries.forEach(([date, qty]) => {
    const parsed = new Date(date)
    const key = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`
    monthlyBuckets.set(key, (monthlyBuckets.get(key) || 0) + qty)
  })
  const historyRows = Array.from(monthlyBuckets.entries()).slice(-6).map(([month, qty], index) => ({
    id: `hist-${index}`,
    label: month,
    pastSales: qty,
    predictedDemand: null,
  }))
  return [
    ...historyRows,
    {
      id: 'future-0',
      label: 'Next Month',
      pastSales: null,
      predictedDemand: forecast,
    },
  ]
}

function buildSeasonalIntelligenceModel({ stockLedger, reports }) {
  const season = getUpcomingSeason()
  const sales = reports?.filteredSales || []
  const productSales = buildProductSalesSummary(sales)
  const stockRows = stockLedger.length
    ? stockLedger
    : productSales.map((row) => ({ item: row.product, soldQty: row.qty, closingQty: 0, valuationRate: row.revenue / Math.max(row.qty, 1) }))

  const products = stockRows.map((row, index) => {
    const soldSummary = productSales.find((item) => item.product === row.item)
    const lastSeasonSales = Math.max(Math.round((soldSummary?.qty || row.soldQty || 1) * seasonalLastSalesFactor(row.item, season.name)), 1)
    const lift = seasonalProductLift(row.item, season.name)
    const predictedSales = Math.max(1, Math.ceil(lastSeasonSales * lift))
    const currentStock = Math.max(0, Math.round(Number(row.closingQty) || 0))
    const recommendedStock = Math.max(Math.ceil(predictedSales * 1.18), predictedSales + 8)
    const unitRate = Math.max(Number(row.valuationRate) || (soldSummary?.revenue || 0) / Math.max(soldSummary?.qty || 1, 1), 1)
    const revenueOpportunity = Math.round(Math.max(predictedSales - lastSeasonSales, 0) * unitRate)
    const action = currentStock < predictedSales
      ? 'Increase Stock'
      : currentStock > recommendedStock * 1.8
        ? 'Reduce Stock'
        : 'Maintain Stock'
    const note = action === 'Increase Stock'
      ? `Prepare ${Math.max(recommendedStock - currentStock, 1)} more units before ${season.name}.`
      : action === 'Reduce Stock'
        ? 'Seasonal velocity is lower than available stock; avoid excess purchase.'
        : 'Stock position is aligned with seasonal forecast.'

    return {
      id: `${row.item}-${index}`,
      product: row.item,
      lastSeasonSales,
      predictedSales,
      currentStock,
      recommendedStock,
      revenueOpportunity,
      action,
      note,
      unitRate,
    }
  }).sort((a, b) => b.revenueOpportunity - a.revenueOpportunity)

  const riskProducts = products.filter((row) => row.action !== 'Maintain Stock').length
  const opportunityProducts = products.filter((row) => row.revenueOpportunity > 0).length
  const revenueOpportunity = products.reduce((sum, row) => sum + row.revenueOpportunity, 0)
  const additionalInventory = products.reduce((sum, row) => sum + Math.max(row.recommendedStock - row.currentStock, 0), 0)
  const potentialLost = products.reduce((sum, row) => sum + Math.max(row.predictedSales - row.currentStock, 0) * row.unitRate, 0)
  const readinessScore = Math.max(42, Math.min(96, Math.round(100 - (riskProducts / Math.max(products.length, 1)) * 38 - (additionalInventory > 0 ? 8 : 0))))
  const expectedGrowth = Math.max(6, Math.min(34, Math.round((products.reduce((sum, row) => sum + row.predictedSales, 0) / Math.max(products.reduce((sum, row) => sum + row.lastSeasonSales, 0), 1) - 1) * 100)))

  return {
    summary: {
      upcomingSeason: season.name,
      daysUntilSeason: season.daysUntil,
      expectedGrowth,
      readinessScore,
      revenueOpportunity,
      riskProducts,
      opportunityProducts,
      primaryRecommendation: riskProducts > 0
        ? `Review ${riskProducts} seasonal stock actions and prepare ${additionalInventory} additional units.`
        : `Inventory is mostly ready; focus on top revenue products for ${season.name}.`,
    },
    products,
    heatmap: buildSeasonalHeatmapRows(products),
    insights: buildSeasonalInsights(products, season),
    impact: [
      { label: 'Potential revenue lost last season', value: formatCurrency(Math.round(potentialLost * 0.42)), note: 'Estimated from stock gaps and high demand products.', tone: 'neutral' },
      { label: 'Causes of lost sales', value: `${riskProducts} items`, note: 'Low stock, late purchase planning and slow reorder response.', tone: 'neutral' },
      { label: 'Additional inventory required', value: `${additionalInventory} units`, note: 'Units needed to reach recommended seasonal stock.', tone: 'orange' },
      { label: 'Expected revenue gain', value: formatCurrency(revenueOpportunity), note: 'If recommended seasonal actions are followed.', tone: 'orange' },
    ],
    timeline: buildSeasonalTimeline(products),
  }
}

function buildProductSalesSummary(sales = []) {
  const map = new Map()
  sales.forEach((invoice) => {
    invoice.items?.forEach((item) => {
      const product = String(item.desc || '').trim()
      if (!product) return
      const current = map.get(product) || { product, qty: 0, revenue: 0 }
      current.qty += Number(item.qty) || 0
      current.revenue += Number(item.amount) || (Number(item.qty) || 0) * (Number(item.rate) || 0)
      map.set(product, current)
    })
  })
  return Array.from(map.values())
}

function getUpcomingSeason() {
  const today = new Date()
  const year = today.getFullYear()
  const seasonStarts = [
    { name: 'Summer', date: new Date(year, 2, 1) },
    { name: 'Monsoon', date: new Date(year, 5, 15) },
    { name: 'Festival', date: new Date(year, 8, 15) },
    { name: 'Winter', date: new Date(year, 10, 1) },
  ]
  const next = seasonStarts.find((entry) => entry.date >= today) || { ...seasonStarts[0], date: new Date(year + 1, 2, 1) }
  const daysUntil = Math.max(0, Math.ceil((next.date - today) / 86400000))
  return { name: next.name, daysUntil }
}

function seasonalProductLift(product = '', season = '') {
  const value = product.toLowerCase()
  if (season === 'Summer' && /ors|glucose|hydration|cold beverage|sunscreen|electrolyte/i.test(value)) return 1.46
  if (season === 'Monsoon' && /fever|paracetamol|antifungal|mosquito|digestive|ors/i.test(value)) return 1.38
  if (season === 'Winter' && /cough|cold|vapor|balm|vitamin|immunity/i.test(value)) return 1.42
  if (season === 'Festival' && /gift|premium|fabric|assorted|wholesale|retail|vitamin/i.test(value)) return 1.32
  return 1.14
}

function seasonalLastSalesFactor(product = '', season = '') {
  return seasonalProductLift(product, season) > 1.3 ? 0.82 : 0.94
}

function buildSeasonalHeatmapRows(products) {
  return products.slice(0, 7).map((row) => ({
    product: row.product,
    Summer: Math.round(row.predictedSales * seasonalProductLift(row.product, 'Summer')),
    Monsoon: Math.round(row.predictedSales * seasonalProductLift(row.product, 'Monsoon')),
    Winter: Math.round(row.predictedSales * seasonalProductLift(row.product, 'Winter')),
    Festival: Math.round(row.predictedSales * seasonalProductLift(row.product, 'Festival')),
  }))
}

function buildSeasonalInsights(products, season) {
  const increase = products.find((row) => row.action === 'Increase Stock')
  const reduce = products.find((row) => row.action === 'Reduce Stock')
  const top = products[0]
  return [
    top && { title: `${top.product} can add ${formatCurrency(top.revenueOpportunity)} revenue`, message: `Expected demand increases from ${top.lastSeasonSales} to ${top.predictedSales} units in ${season.name}.`, tone: 'opportunity' },
    increase && { title: `${increase.product} has stockout risk`, message: `Current stock is ${increase.currentStock}; recommended stock is ${increase.recommendedStock}.`, tone: 'critical' },
    reduce && { title: `${reduce.product} may become overstocked`, message: 'Reduce purchase quantity or bundle with fast-moving products.', tone: 'warning' },
    { title: `Prepare seasonal inventory within ${season.daysUntil} days`, message: 'Prioritize high revenue opportunity products before ordering slow-moving stock.', tone: 'opportunity' },
  ].filter(Boolean)
}

function buildSeasonalTimeline(products) {
  const fallback = {
    Summer: ['ORS / hydration items', 'Glucose products', 'Sunscreen and heat care'],
    Monsoon: ['Fever care', 'Antifungal products', 'Mosquito protection'],
    Winter: ['Cough syrup', 'Cold care', 'Vitamin and immunity items'],
    Festival: ['Premium packs', 'Retail assortments', 'High margin fast movers'],
  }
  return ['Summer', 'Monsoon', 'Winter', 'Festival'].map((season) => ({
    season,
    products: products
      .slice()
      .sort((a, b) => seasonalProductLift(b.product, season) - seasonalProductLift(a.product, season))
      .slice(0, 3)
      .map((row) => row.product)
      .filter(Boolean)
      .concat(fallback[season])
      .slice(0, 3),
  }))
}

function demandLiftForProduct(name = '') {
  const value = name.toLowerCase()
  if (value.includes('ors') || value.includes('glucose') || value.includes('hydration')) return 1.22
  if (value.includes('paracetamol') || value.includes('fever')) return 1.18
  if (value.includes('cough') || value.includes('cold')) return 1.14
  if (value.includes('vitamin')) return 1.12
  return 1.08
}

function formatForecastDate(date, range) {
  if (range === 'Month') return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
  return date.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit' })
}

function formatCurrency(value) {
  return `\u20b9${Number(value || 0).toLocaleString('en-IN')}`
}

function formatCurrencyCompact(value) {
  const number = Number(value || 0)
  if (number >= 10000000) return `\u20b9${(number / 10000000).toFixed(1)}Cr`
  if (number >= 100000) return `\u20b9${(number / 100000).toFixed(1)}L`
  if (number >= 1000) return `\u20b9${Math.round(number / 1000)}K`
  return `\u20b9${number}`
}

function formatAxisCurrency(value) {
  return formatCurrencyCompact(value).replace('.0', '')
}

function buildDemandProducts({ stockLedger, itemMaster, period }) {
  const multiplier = period === 'Day' ? 1 : period === 'Week' ? 7 : 30
  return stockLedger
    .map((row) => {
      const currentItem = itemMaster.find((item) => item.name === row.item)
      const baseline = Math.max(row.soldQty || 1, 1)
      const forecastDemand = Math.max(1, Math.ceil((baseline / 7) * multiplier))
      const currentStock = currentItem?.stockQty ?? row.closingQty
      const risk = currentStock < forecastDemand ? 'Understock' : currentStock > forecastDemand * 4 ? 'Overstock' : 'Balanced'
      return {
        ...row,
        currentStock,
        forecastDemand,
        risk,
        spike: forecastDemand > baseline * 1.25,
      }
    })
    .sort((a, b) => (b.soldQty * b.valuationRate) - (a.soldQty * a.valuationRate))
    .slice(0, 8)
}

function buildAiSalesPredictionModel({ reports, stockLedger, itemMaster, weather }) {
  const monthlyHistory = buildMonthlySalesHistory(reports.filteredSales)
  const weeklyHistory = buildWeeklySalesHistory(reports.filteredSales)
  const previousMonth = monthlyHistory.at(-1)?.total || reports.totals.totalSales || 0
  const priorMonth = monthlyHistory.at(-2)?.total || previousMonth * 0.92
  const previousWeek = weeklyHistory.at(-1)?.total || previousMonth / 4
  const priorWeek = weeklyHistory.at(-2)?.total || previousWeek * 0.94
  const monthlyTrendPct = Math.round(((previousMonth - priorMonth) / Math.max(priorMonth, 1)) * 100)
  const weeklyTrendPct = Math.round(((previousWeek - priorWeek) / Math.max(priorWeek, 1)) * 100)
  const monthIndex = new Date().getMonth()
  const seasonalScore = monthIndex >= 2 && monthIndex <= 5 ? 9 : monthIndex >= 6 && monthIndex <= 8 ? 6 : 8
  const marketSentiment = Math.round(((stockLedger.filter((row) => row.soldQty > 0).length / Math.max(stockLedger.length, 1)) * 12) - (stockLedger.filter((row) => row.closingQty <= 5).length * 2))
  const weatherImpactScore = calculateWeatherImpact(weather)
  const finalFactor = 1 + ((monthlyTrendPct + seasonalScore + weatherImpactScore + marketSentiment) / 100)
  const nextMonth = Math.max(0, Math.round(previousMonth * finalFactor))
  const nextWeek = Math.max(0, Math.round(previousWeek * (1 + ((weeklyTrendPct + seasonalScore) / 100))))
  const previousDay = Math.round(previousMonth / 30)
  const predictedVsPrevious = nextMonth - previousMonth
  const salesRecordCount = reports.filteredSales.length
  const confidence = Math.max(
    58,
    Math.min(
      94,
      Math.round(62 + Math.min(monthlyHistory.length, 8) * 2.5 + Math.min(weeklyHistory.length, 12) + Math.min(salesRecordCount, 80) * 0.25 + (weather ? 3 : 0)),
    ),
  )
  const direction = predictedVsPrevious > previousMonth * 0.03 ? 'upward' : predictedVsPrevious < previousMonth * -0.03 ? 'downward' : 'stable'

  return {
    nextWeek,
    nextMonth,
    previousWeek,
    previousMonth,
    monthlyTrendPct,
    weeklyTrendPct,
    seasonalScore,
    marketSentiment,
    weatherImpactScore,
    predictedVsPrevious,
    confidence,
    direction,
    trendLabel: direction === 'upward' ? 'Upward' : direction === 'downward' ? 'Downward' : 'Stable',
    trendColor: direction === 'upward' ? '#16a34a' : direction === 'downward' ? '#dc2626' : '#1f6feb',
    showWeek: confidence >= 72,
    inventoryScore: Math.round((itemMaster.length + stockLedger.filter((row) => row.closingQty > 5).length) / Math.max(stockLedger.length + itemMaster.length, 1) * 100),
    salesRecordCount,
  }
}

function buildWeeklySalesHistory(sales = []) {
  const byWeek = new Map()
  sales.forEach((sale) => {
    const parsed = parseBusinessDate(sale.date)
    if (!parsed) return
    const weekStart = new Date(parsed)
    weekStart.setDate(parsed.getDate() - parsed.getDay())
    const key = weekStart.toISOString().slice(0, 10)
    byWeek.set(key, (byWeek.get(key) || 0) + (Number(sale.total) || 0))
  })
  return Array.from(byWeek.entries())
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([week, total]) => ({ week, total }))
}

function buildMonthlySalesHistory(sales = []) {
  const byMonth = new Map()
  sales.forEach((sale) => {
    const parsed = parseBusinessDate(sale.date)
    const key = parsed ? `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}` : 'unknown'
    const current = byMonth.get(key) ?? { month: key, total: 0 }
    current.total += Number(sale.total) || 0
    byMonth.set(key, current)
  })
  return Array.from(byMonth.values()).sort((a, b) => a.month.localeCompare(b.month))
}

function parseBusinessDate(value) {
  const parsed = new Date(value)
  if (!Number.isNaN(parsed.getTime())) return parsed
  const match = String(value || '').match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/)
  if (!match) return null
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
  return new Date(Number(match[3]), months.indexOf(match[2].toLowerCase()), Number(match[1]))
}

function calculateWeatherImpact(weather) {
  if (!weather) return 0
  let score = 0
  if (weather.temperature >= 34) score += 8
  if (weather.temperature <= 14) score += 6
  if (weather.rainProbability >= 60) score -= 7
  else if (weather.rainProbability >= 35) score -= 3
  if (weather.windSpeed >= 28) score -= 4
  if ([65, 82, 95].includes(weather.weatherCode)) score -= 5
  return Math.max(-16, Math.min(16, score))
}

function buildDiseaseRows({ stockLedger, weather, period }) {
  const rainBoost = weather?.rainProbability >= 45
  const heatBoost = weather?.temperature >= 34
  const coldBoost = weather?.temperature <= 16
  const base = [
    { disease: 'Fever / Viral', item: 'Paracetamol / fever care', probability: rainBoost ? 86 : 68, focus: period, trigger: rainBoost ? 'Rain-linked viral spike' : 'Baseline seasonal fever' },
    { disease: 'Digestive Infection', item: 'ORS / probiotics / digestive care', probability: heatBoost || rainBoost ? 82 : 61, focus: period, trigger: heatBoost ? 'High temperature hydration demand' : 'Humidity and food safety signal' },
    { disease: 'Respiratory Cold', item: 'Cough syrup / vapor rub / antihistamine', probability: coldBoost ? 88 : 58, focus: period, trigger: coldBoost ? 'Cold weather respiratory lift' : 'Stable demand' },
    { disease: 'Skin / Fungal', item: 'Antifungal cream / dusting powder', probability: rainBoost ? 79 : 55, focus: period, trigger: rainBoost ? 'Monsoon humidity signal' : 'Low seasonal pressure' },
  ]
  return base.map((row, index) => ({
    ...row,
    stock: stockLedger[index]?.closingQty ?? 0,
    recommendedQty: Math.max(6, Math.round(row.probability / 8)),
  }))
}

function buildSmartRecommendations(stockLedger, weatherImpactScore) {
  const scored = stockLedger.map((row) => {
    const demandProbability = Math.max(48, Math.min(96, Math.round(55 + (row.soldQty * 7) - (row.closingQty <= 5 ? -8 : 0) + weatherImpactScore)))
    const profitImpact = Math.max(40, Math.min(98, Math.round((row.valuationRate || 1) / 50 + row.soldQty * 9)))
    const optimization = Math.max(45, Math.min(96, Math.round(88 - Math.abs((row.closingQty || 0) - Math.max(row.soldQty * 2, 6)) * 3)))
    return { ...row, demandProbability, profitImpact, optimization }
  })
  return {
    mustBuy: scored.filter((row) => row.closingQty <= 8).sort((a, b) => b.demandProbability - a.demandProbability).slice(0, 4),
    maintain: scored.filter((row) => row.closingQty > 8 && row.closingQty <= 35).sort((a, b) => b.optimization - a.optimization).slice(0, 4),
    emerging: scored.sort((a, b) => (b.demandProbability + b.profitImpact) - (a.demandProbability + a.profitImpact)).slice(0, 4),
  }
}

function SeasonTile({ season }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ position: 'relative', border: '1px solid var(--border)', borderRadius: 8, padding: 14, background: 'var(--surface)' }}
    >
      <div style={{ fontSize: 15, fontWeight: 800 }}>{season.season}</div>
      <div style={{ marginTop: 12, height: 8, borderRadius: 999, background: '#eef2f7', overflow: 'hidden' }}>
        <div style={{ width: `${season.profit}%`, height: '100%', background: 'var(--ink)' }} />
      </div>
      <div style={{ marginTop: 8, fontSize: 12, color: 'var(--ink-40)' }}>Profit score {season.profit}%</div>
      {hovered && (
        <div style={{ position: 'absolute', left: 12, right: 12, top: 'calc(100% + 8px)', zIndex: 10, border: '1px solid var(--border)', borderRadius: 8, background: '#fff', boxShadow: 'var(--shadow-lg)', padding: 12, display: 'grid', gap: 8 }}>
          <TooltipLine label="High demand" value={season.high} />
          <TooltipLine label="Low demand" value={season.low} />
          <TooltipLine label="Stock recommendation" value={season.stock} />
        </div>
      )}
    </div>
  )
}

function TooltipLine({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--ink-40)', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 12, color: 'var(--ink)' }}>{value}</div>
    </div>
  )
}

function SegmentControl({ value, onChange, options, labels = {} }) {
  return (
    <div style={{ display: 'inline-flex', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          style={{ border: 'none', padding: '7px 10px', background: value === option ? '#111' : '#fff', color: value === option ? '#fff' : 'var(--ink-60)', fontSize: 12, fontWeight: 700 }}
        >
          {labels[option] || option}
        </button>
      ))}
    </div>
  )
}

function DemandProductRow({ row }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 80px 110px', gap: 12, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <div>
        <div style={{ fontWeight: 700 }}>{row.item}</div>
        <div style={{ fontSize: 12, color: 'var(--ink-40)' }}>{row.spike ? 'Demand spike detected' : 'Stable velocity'}</div>
      </div>
      <div style={{ textAlign: 'right', fontWeight: 800 }}>{row.currentStock}</div>
      <div style={{ fontWeight: 800, textAlign: 'right' }}>{row.risk}</div>
    </div>
  )
}

function PurchasePredictionRow({ row }) {
  const qty = Math.max(row.forecastDemand - row.currentStock, row.risk === 'Understock' ? 6 : 0)
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12, background: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
        <strong>{row.item}</strong>
        <span style={{ fontWeight: 800 }}>{qty > 0 ? `Buy ${qty}` : 'Hold'}</span>
      </div>
      <div style={{ marginTop: 8, fontSize: 12, color: 'var(--ink-40)' }}>Forecast demand {row.forecastDemand} units | stock {row.currentStock}</div>
    </div>
  )
}

function DiseaseImpactPanel({ activeTab, rows }) {
  const displayRows = activeTab === 'purchase'
    ? rows.filter((row) => row.probability >= 70)
    : rows
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
      {displayRows.map((row) => (
        <div key={`${activeTab}-${row.disease}`} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12, background: '#fff' }}>
          <div style={{ fontWeight: 800 }}>{activeTab === 'time' ? row.focus : row.disease}</div>
          <div style={{ marginTop: 6, fontWeight: 700 }}>{row.item}</div>
          <div style={{ marginTop: 6, fontSize: 12, color: 'var(--ink-40)' }}>{row.trigger}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 12 }}>
            <strong>{row.probability}% demand probability</strong>
            <span>Buy {row.recommendedQty}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function RecommendationColumn({ title, rows, color }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12, background: '#fff', display: 'grid', gap: 10, alignContent: 'start' }}>
      <div style={{ fontSize: 13, fontWeight: 800, color }}>{title}</div>
      {rows.map((row) => (
        <div key={`${title}-${row.item}`} style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
          <div style={{ fontWeight: 700 }}>{row.item}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 8 }}>
            <MiniScore label="Profit" value={row.profitImpact} color="var(--ink)" />
            <MiniScore label="Optimize" value={row.optimization} color="var(--ink)" />
            <MiniScore label="Demand" value={row.demandProbability} color="var(--ink)" />
          </div>
        </div>
      ))}
    </div>
  )
}

function MiniScore({ label, value, color }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--ink-40)', fontWeight: 700 }}>{label}</div>
      <div style={{ color, fontWeight: 800 }}>{value}%</div>
    </div>
  )
}

export function BankingModulePage() {
  const { moduleId } = useParams()
  const navigate = useNavigate()
  const { loans, checks, bankAccounts, cashTransactions, upsertLoan, deleteLoan, upsertBankAccount, deleteBankAccount } = useApp()
  const module = BANKING_DEFINITIONS.find((entry) => entry.id === moduleId)
  const [editor, setEditor] = useState(null)
  if (!module) return null

  if (moduleId === 'loan-accounts') {
    return (
      <div className="animate-slide">
        <PageHeader title="Loan Accounts" sub="Loan master, EMI due dates, payment history and repayment summary." right={<Button variant="primary" onClick={() => setEditor({ id: '', name: '', institution: '', interestRate: 0, emiAmount: 0, dueDate: todayISO(), remainingBalance: 0, totalPaid: 0, pendingAmount: 0, status: 'Active', reminder: '' })}>+ Add Loan</Button>} />
        <SummaryStrip values={[
          ['Outstanding', fmtShort(loans.reduce((sum, loan) => sum + loan.remainingBalance, 0))],
          ['EMI Total', fmtShort(loans.reduce((sum, loan) => sum + loan.emiAmount, 0))],
          ['Active Loans', loans.length],
          ['Paid Amount', fmtShort(loans.reduce((sum, loan) => sum + loan.totalPaid, 0))],
        ]}
        />
        <Card>
          <CardHead title="Loan Register" />
          <Table
            focusId="loan-accounts-table"
            cols={[
              { key: 'name', label: 'Loan Account', bold: true },
              { key: 'institution', label: 'Bank / Company' },
              { key: 'interestRate', label: 'Interest', right: true, render: (value) => `${value}%` },
              { key: 'emiAmount', label: 'EMI', right: true, render: (value) => fmt(value) },
              { key: 'dueDate', label: 'Due Date', dim: true },
              { key: 'remainingBalance', label: 'Balance', right: true, render: (value) => fmt(value) },
              { key: 'status', label: 'Status', render: (value) => <StatusChip status={value} /> },
              { key: '_act', label: '', sortable: false, render: (_, row) => <ActionCell onEdit={() => setEditor(row)} onDelete={() => deleteLoan(row.id)} /> },
            ]}
            rows={loans}
          />
        </Card>
        <LoanEditorModal value={editor} onClose={() => setEditor(null)} onSave={(payload) => { upsertLoan(payload); setEditor(null) }} />
      </div>
    )
  }

  if (moduleId === 'checks') {
    return (
      <AnalyticsDetailPage
        title="Checks"
        sub="Search, filters, status indicators and detailed check tracking."
        onBack={() => navigate('/banking')}
        focusId="checks-table"
        kpis={[
          { label: 'Pending', value: checks.filter((row) => row.status === 'Pending').length },
          { label: 'Cleared', value: checks.filter((row) => row.status === 'Cleared').length },
          { label: 'Bounced', value: checks.filter((row) => row.status === 'Bounced').length },
          { label: 'Total Amount', value: fmtShort(checks.reduce((sum, row) => sum + row.amount, 0)) },
        ]}
        rows={checks.map((row) => ({ item: row.company, qty: row.checkNumber, value: row.amount, note: row.status }))}
      />
    )
  }

  if (moduleId === 'bank-accounts') {
    return (
      <div className="animate-slide">
        <PageHeader title="Bank Accounts" sub="Balances, IFSC, branch, transactions and transfer records." right={<Button variant="primary" onClick={() => setEditor({ id: '', bankName: '', accountHolder: '', accountNo: '', ifsc: '', branch: '', balance: 0, incomingPayments: 0, outgoingPayments: 0, pendingTransfers: 0, recentTransactions: [], transfers: [] })}>+ Add Bank Account</Button>} />
        <SummaryStrip values={[
          ['Total Bank Balance', fmtShort(bankAccounts.reduce((sum, row) => sum + row.balance, 0))],
          ['Incoming Payments', fmtShort(bankAccounts.reduce((sum, row) => sum + row.incomingPayments, 0))],
          ['Outgoing Payments', fmtShort(bankAccounts.reduce((sum, row) => sum + row.outgoingPayments, 0))],
          ['Pending Transfers', bankAccounts.reduce((sum, row) => sum + row.pendingTransfers, 0)],
        ]}
        />
        <Card>
          <CardHead title="Accounts Register" />
          <Table
            focusId="bank-accounts-table"
            cols={[
              { key: 'bankName', label: 'Bank', bold: true },
              { key: 'accountHolder', label: 'Account Holder' },
              { key: 'accountNo', label: 'Account', mono: true },
              { key: 'ifsc', label: 'IFSC', mono: true },
              { key: 'branch', label: 'Branch', dim: true },
              { key: 'balance', label: 'Current Balance', right: true, render: (value) => fmt(value) },
              { key: '_act', label: '', sortable: false, render: (_, row) => <ActionCell onEdit={() => setEditor(row)} onDelete={() => deleteBankAccount(row.id)} /> },
            ]}
            rows={bankAccounts}
          />
        </Card>
        <BankEditorModal value={editor} onClose={() => setEditor(null)} onSave={(payload) => { upsertBankAccount(payload); setEditor(null) }} />
      </div>
    )
  }

  return (
    <AnalyticsDetailPage
      title="Cash In Hand"
      sub="Daily transactions, opening balance, closing balance and cash summary."
      onBack={() => navigate('/banking')}
      focusId="cash-transactions-table"
      kpis={[
        { label: 'Opening', value: fmtShort(cashTransactions[0]?.amount || 0) },
        { label: 'Income', value: fmtShort(cashTransactions.filter((row) => row.flow === 'In').reduce((sum, row) => sum + row.amount, 0)) },
        { label: 'Expense', value: fmtShort(cashTransactions.filter((row) => row.flow === 'Out').reduce((sum, row) => sum + row.amount, 0)) },
        { label: 'Closing', value: fmtShort(cashTransactions.filter((row) => row.flow === 'In').reduce((sum, row) => sum + row.amount, 0) - cashTransactions.filter((row) => row.flow === 'Out').reduce((sum, row) => sum + row.amount, 0)) },
      ]}
      rows={cashTransactions.map((row) => ({ item: row.narration, qty: row.date, value: row.amount, note: row.flow }))}
    />
  )
}

export function UtilityModulePage() {
  const { moduleId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { companies, sharedCompanies, backupSettings, saveBackupSettings, addCompany, deletedItems, itemMaster, stockLedger, reports, importFromParsedPayload } = useApp()
  const [tab, setTab] = useState('my-companies')
  const [companyForm, setCompanyForm] = useState({ companyName: '', ownerName: '', gstNumber: '', mobile: '', email: '', address: '', state: '', pincode: '', financialYear: '2026-27', businessType: '' })
  const [importAppliedAt, setImportAppliedAt] = useState(null)

  const handleImportComplete = useCallback((importResult) => {
    if (!importResult?.success) return
    const outcome = importFromParsedPayload(importResult)
    if (!outcome.ok) {
      toast(outcome.errors?.[0]?.message || 'Import validation passed but ERP sync failed.', 'error')
      return
    }
    const stats = outcome.stats || {}
    setImportAppliedAt(new Date().toISOString())
    toast(
      `ERP updated: ${stats.records ?? 0} rows → ${stats.items ?? 0} items, ${stats.invoices ?? 0} sales, ${stats.purchases ?? 0} purchases`,
      'success',
    )
  }, [importFromParsedPayload, toast])
  const module = UTILITY_DEFINITIONS.find((entry) => entry.id === moduleId)
  if (!module) return null

  if (moduleId === 'manage-companies') {
    return (
      <div className="animate-slide">
        <PageHeader title="Manage Companies" sub="My Companies and Shared With Me in a single ERP-style management workspace." />
        <Card>
          <CardBody style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => setTab('my-companies')} style={{ ...tabStyle, background: tab === 'my-companies' ? '#111' : 'var(--surface-2)', color: tab === 'my-companies' ? '#fff' : 'var(--ink)' }}>My Companies</button>
              <button type="button" onClick={() => setTab('shared-with-me')} style={{ ...tabStyle, background: tab === 'shared-with-me' ? '#111' : 'var(--surface-2)', color: tab === 'shared-with-me' ? '#fff' : 'var(--ink)' }}>Shared With Me</button>
            </div>
            {tab === 'my-companies' ? (
              <div style={{ display: 'grid', gap: 14 }}>
                <Card>
                  <CardHead title="Restore Backup" sub="PDF-based backup upload with drag-and-drop zone." />
                  <CardBody>
                    <div style={dropzoneStyle}><strong>Drop backup PDF here</strong><div style={{ fontSize: 12, color: 'var(--ink-40)' }}>Restore company data from backup file.</div></div>
                    <Table focusId="company-list" cols={[{ key: 'name', label: 'Company', bold: true }, { key: 'owner', label: 'Owner' }, { key: 'financialYear', label: 'FY' }, { key: 'businessType', label: 'Business Type' }]} rows={companies.map((company) => ({ ...company, financialYear: company.financialYear || '2024-25', businessType: company.businessType || 'Trading' }))} />
                  </CardBody>
                </Card>
                <Card>
                  <CardHead title="Add Company" sub="Clean ERP-style company form." />
                  <CardBody style={{ display: 'grid', gap: 10 }}>
                    <FormGrid cols={2}>
                      <Input label="Company Name" value={companyForm.companyName} onChange={(event) => setCompanyForm((current) => ({ ...current, companyName: event.target.value }))} />
                      <Input label="Owner Name" value={companyForm.ownerName} onChange={(event) => setCompanyForm((current) => ({ ...current, ownerName: event.target.value }))} />
                      <Input label="GST Number" value={companyForm.gstNumber} onChange={(event) => setCompanyForm((current) => ({ ...current, gstNumber: event.target.value }))} />
                      <Input label="Mobile Number" value={companyForm.mobile} onChange={(event) => setCompanyForm((current) => ({ ...current, mobile: event.target.value }))} />
                      <Input label="Email" value={companyForm.email} onChange={(event) => setCompanyForm((current) => ({ ...current, email: event.target.value }))} />
                      <Input label="State" value={companyForm.state} onChange={(event) => setCompanyForm((current) => ({ ...current, state: event.target.value }))} />
                      <Input label="Pincode" value={companyForm.pincode} onChange={(event) => setCompanyForm((current) => ({ ...current, pincode: event.target.value }))} />
                      <Input label="Financial Year" value={companyForm.financialYear} onChange={(event) => setCompanyForm((current) => ({ ...current, financialYear: event.target.value }))} />
                      <Input label="Business Type" value={companyForm.businessType} onChange={(event) => setCompanyForm((current) => ({ ...current, businessType: event.target.value }))} />
                    </FormGrid>
                    <Textarea label="Address" rows={3} value={companyForm.address} onChange={(event) => setCompanyForm((current) => ({ ...current, address: event.target.value }))} />
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Button variant="primary" onClick={() => { addCompany(companyForm); setCompanyForm({ companyName: '', ownerName: '', gstNumber: '', mobile: '', email: '', address: '', state: '', pincode: '', financialYear: '2026-27', businessType: '' }) }}>Add Company</Button>
                    </div>
                  </CardBody>
                </Card>
              </div>
            ) : (
              <Table focusId="shared-companies-table" cols={[{ key: 'name', label: 'Company', bold: true }, { key: 'owner', label: 'Owner Details' }, { key: 'sharedDate', label: 'Shared Date' }, { key: 'accessType', label: 'Access Type' }, { key: '_open', label: '', sortable: false, render: () => <Button size="sm" variant="ghost">Open Company</Button> }]} rows={sharedCompanies} />
            )}
          </CardBody>
        </Card>
      </div>
    )
  }

  if (moduleId === 'backup-restore') {
    return (
      <div className="animate-slide">
        <PageHeader title="Backup & Restore" sub="Auto backup, device backup, email backup and restore controls." />
        <Card>
          <CardBody>
            <FormGrid cols={2}>
              <Select label="Enable Auto Backup" value={backupSettings.autoBackupEnabled ? 'Enabled' : 'Disabled'} options={['Enabled', 'Disabled']} onChange={(event) => saveBackupSettings({ autoBackupEnabled: event.target.value === 'Enabled' })} />
              <Input label="Backup Destination" value={backupSettings.destination} onChange={(event) => saveBackupSettings({ destination: event.target.value })} />
              <Input label="Backup Schedule" value={backupSettings.schedule} onChange={(event) => saveBackupSettings({ schedule: event.target.value })} />
              <Input label="Reminder" value={backupSettings.reminder} onChange={(event) => saveBackupSettings({ reminder: event.target.value })} />
            </FormGrid>
          </CardBody>
        </Card>
      </div>
    )
  }

  if (moduleId === 'data-verification') {
    return (
      <AnalyticsDetailPage
        title="Data Verification"
        sub="Missing invoice detection, duplicate items, GST checks and stock mismatch alerts."
        onBack={() => navigate('/utilities')}
        focusId="verification-matrix"
        kpis={[
          { label: 'Invoices', value: reports.filteredSales.length },
          { label: 'Items', value: itemMaster.length },
          { label: 'Stock Alerts', value: stockLedger.filter((row) => row.closingQty <= 5).length },
          { label: 'Corrections', value: 6 },
        ]}
        rows={[
          { item: 'Missing invoice detection', qty: 'Ready', value: reports.filteredSales.length, note: 'Sequence verified' },
          { item: 'Duplicate item detection', qty: 'Ready', value: itemMaster.length, note: 'Review duplicates' },
          { item: 'Wrong GST entries', qty: 'Review', value: reports.filteredSales.reduce((sum, row) => sum + (row.tax || 0), 0), note: 'GST validation' },
          { item: 'Stock mismatch alerts', qty: 'Alert', value: stockLedger.filter((row) => row.closingQty <= 5).length, note: 'Low stock risk' },
        ]}
      />
    )
  }

  if (moduleId === 'item-libraries') {
    return (
      <AnalyticsDetailPage
        title="Item Libraries"
        sub="Recycle-bin style deleted-item recovery and restore history."
        onBack={() => navigate('/utilities')}
        focusId="item-library-table"
        kpis={[
          { label: 'Deleted Items', value: deletedItems.length },
          { label: 'Recoverable', value: deletedItems.length },
          { label: 'Restore Versions', value: deletedItems.reduce((sum, row) => sum + (row.version || 1), 0) },
          { label: 'Active Library', value: itemMaster.length },
        ]}
        rows={deletedItems.map((item) => ({ item: item.name, qty: item.version || 1, value: item.stockQty, note: 'Recoverable' }))}
      />
    )
  }

  if (moduleId === 'bulk-update-tax-slab') {
    return (
      <AnalyticsDetailPage
        title="Bulk Tax Update"
        sub="Filter items, preview GST changes and confirm backup before apply."
        onBack={() => navigate('/utilities')}
        focusId="bulk-tax-preview"
        kpis={[
          { label: 'Items Selected', value: itemMaster.length },
          { label: 'Categories', value: PRODUCT_TYPE_OPTIONS.length },
          { label: 'Backup Required', value: 'Yes' },
          { label: 'Preview Rows', value: Math.min(itemMaster.length, 10) },
        ]}
        rows={itemMaster.slice(0, 10).map((item) => ({ item: item.name, qty: `${item.gstSlab}%`, value: item.stockQty, note: 'Preview' }))}
      />
    )
  }

  if (moduleId === 'import-items') {
    return (
      <div className="animate-slide">
        <PageHeader
          title="Import Items"
          sub="Upload Excel or CSV exports from Marg ERP, Tally, or custom formats. Parsed data is applied to Sales, Purchase, Parties, Items, Stock, and Reports automatically."
          right={<Button variant="ghost" onClick={() => navigate('/utilities')}>Back</Button>}
        />
        {importAppliedAt && (
          <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 8, background: 'var(--green-bg)', border: '1px solid var(--green-br)', color: 'var(--green)', fontSize: 13 }}>
            Last ERP sync: {new Date(importAppliedAt).toLocaleString('en-IN')} — open Sales, Purchase, Parties, Items, or Dashboard to review imported data.
          </div>
        )}
        <FileImportConverter
          title="Excel / CSV to JSON Converter"
          subtitle="Supports Marg ERP fields: Item Name, Batch, Expiry, MRP, Sale Rate, Purchase Rate, HSN, GST, Stock."
          useBackend={false}
          onImportComplete={handleImportComplete}
        />
      </div>
    )
  }

  if (moduleId === 'export-items') {
    return (
      <AnalyticsDetailPage
        title="Export Items"
        sub="Excel/CSV export from central item master."
        onBack={() => navigate('/utilities')}
        focusId="export-items-table"
        kpis={[
          { label: 'Master Items', value: itemMaster.length },
          { label: 'CSV Ready', value: 'Yes' },
          { label: 'Excel Ready', value: 'Yes' },
          { label: 'Sample Format', value: 'Ready' },
        ]}
        rows={itemMaster.slice(0, 10).map((item) => ({ item: item.name, qty: item.stockQty, value: item.salesPrice, note: 'Ready' }))}
      />
    )
  }

  return (
    <AnalyticsDetailPage
      title="Sync & Share"
      sub="Share company data and monitor sync queues."
      onBack={() => navigate('/utilities')}
      focusId="sync-share-table"
      kpis={[
        { label: 'Shared Companies', value: sharedCompanies.length },
        { label: 'Sync Jobs', value: 4 },
        { label: 'Pending', value: 1 },
        { label: 'Exports', value: 3 },
      ]}
      rows={[
        { item: 'Ram Kishore & Sons', qty: 'Cloud Sync', value: '15 May 2026', note: 'Active' },
        { item: 'Shree Agencies', qty: 'Shared Access', value: '15 May 2026', note: 'Pending' },
        { item: 'Northline Distributors', qty: 'Device Sync', value: '14 May 2026', note: 'Active' },
      ]}
    />
  )
}

function DashboardCardPage({ title, sub, cards, focusId }) {
  const navigate = useNavigate()
  return (
    <div className="animate-slide">
      <PageHeader title={title} sub={sub} />
      <div id={focusId} className="reports-card-grid">
        {cards.map((card, index) => {
          const isSalesPrediction = card.id === 'sales-prediction'
          const targetPath = isSalesPrediction ? '/ai-reports/sales-prediction/forecast' : card.path
          return (
            <div key={card.id} style={{ position: 'relative' }}>
              <Card
                className="focusable-card"
                data-focus-item="true"
                tabIndex={index === 0 ? 0 : -1}
                role="button"
                onClick={() => navigate(targetPath)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    navigate(targetPath)
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                <CardBody style={{ display: 'grid', gap: 8 }}>
                  <strong style={{ fontSize: 13.5 }}>{card.name}</strong>
                  <div style={{ fontSize: 12, color: 'var(--ink-40)' }}>{card.desc}</div>
                </CardBody>
              </Card>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AnalyticsDetailPage({ title, sub, kpis, rows, onBack, focusId }) {
  return (
    <div className="animate-slide">
      <PageHeader title={title} sub={sub} right={<Button variant="ghost" onClick={onBack}>Back</Button>} />
      <div className="kpi-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 14 }}>
        {kpis.map((kpi) => <KpiCard key={kpi.label} {...kpi} />)}
      </div>
      <Card>
        <CardHead title="Analysis Detail" />
        <Table
          focusId={focusId}
          cols={[
            { key: 'item', label: 'Name', bold: true },
            { key: 'qty', label: 'Metric', dim: true },
            { key: 'value', label: 'Value', right: true, render: (value) => typeof value === 'number' ? fmt(value) : value },
            { key: 'note', label: 'Note', dim: true },
          ]}
          rows={rows}
        />
      </Card>
    </div>
  )
}

function ItemEditorModal({ value, onClose, onSave }) {
  if (!value) return null
  return (
    <Modal open={Boolean(value)} onClose={onClose} title={value.id ? 'Edit Item' : 'Add Item'} width={1120}>
      <ItemEditorForm initialValue={value} onClose={onClose} onSave={onSave} />
    </Modal>
  )
}

function ItemEditorForm({ initialValue, onClose, onSave }) {
  const [form, setForm] = useState(() => normalizeItemForm(initialValue))
  const [errors, setErrors] = useState({})
  const fieldRefs = useRef([])
  const saveButtonRef = useRef(null)

  useEffect(() => {
    setForm(normalizeItemForm(initialValue))
    setErrors({})
  }, [initialValue])

  const setFieldRef = useCallback((index) => (node) => {
    fieldRefs.current[index] = node
  }, [])

  const setField = useCallback((key, value) => {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined, form: undefined }))
  }, [])

  const validate = useCallback((current) => {
    const nextErrors = {}
    if (!String(current.name || '').trim()) nextErrors.name = 'Item name is required'
    if (!String(current.batchNo || '').trim()) nextErrors.batchNo = 'Batch number is required'
    if (current.mfgDate && current.expiryDate && current.expiryDate < current.mfgDate) {
      nextErrors.expiryDate = 'Expiry date cannot be before manufacturing date'
    }
    if (Number(current.stockQty) < 0) nextErrors.stockQty = 'Negative stock is not allowed'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }, [])

  const commitSave = useCallback((mode = 'close') => {
    const payload = sanitizeItemForm(form)
    if (!validate(payload)) return

    lastSelectedProductType = payload.category
    lastSelectedGstSlab = payload.gstSlab
    onSave(payload, mode)
  }, [form, onSave, validate])

  const handleFieldKeyDown = useCallback((event, index) => {
    consumeSequentialEnter(event, index, fieldRefs.current, {
      onTrailForward: () => saveButtonRef.current?.focus?.({ preventScroll: true }),
      onTrailBackward: () => fieldRefs.current[0]?.focus?.({ preventScroll: true }),
    })
  }, [])

  const keepContainerFocus = useCallback((event, index) => {
    event.preventDefault()
    fieldRefs.current[index]?.focus?.({ preventScroll: true })
  }, [])

  const handleArrowSelection = useCallback((event, values, activeValue, onChangeValue) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const currentIndex = Math.max(values.indexOf(activeValue), 0)
    const direction = event.key === 'ArrowRight' ? 1 : -1
    const nextIndex = Math.min(Math.max(currentIndex + direction, 0), values.length - 1)
    onChangeValue(values[nextIndex])
  }, [])

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div style={itemFormHeroStyle}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-.04em', marginBottom: 4 }}>{form.id ? 'Edit Inventory Item' : 'Add Inventory Item'}</div>
          <div style={{ color: 'rgba(255,255,255,.76)', fontSize: 13.5 }}>Keyboard-first pharmacy item entry with quick batch, expiry and pricing controls.</div>
        </div>
        <div style={{ display: 'grid', gap: 10, justifyItems: 'end' }}>
          <div style={{ ...heroMetaChipStyle, background: 'rgba(255,255,255,.12)', color: '#fff' }}>Batch {form.batchNo || 'Pending'}</div>
          <div style={{ ...heroMetaChipStyle, background: 'rgba(255,255,255,.08)', color: 'rgba(255,255,255,.86)' }}>ESC closes and returns focus to Add Item</div>
        </div>
      </div>

      <FormSection title="General" subtitle="Use product-type pills for fast medicine classification.">
        <div style={{ display: 'grid', gap: 14 }}>
          <FormGrid cols={2}>
            <Input
              ref={setFieldRef(0)}
              label="Item Name"
              value={form.name}
              error={errors.name}
              data-autofocus="true"
              onKeyDown={(event) => handleFieldKeyDown(event, 0)}
              onChange={(event) => setField('name', event.target.value)}
              placeholder="Enter medicine or product name"
              style={itemFieldStyle}
            />
            <Input
              ref={setFieldRef(1)}
              label="Batch Number"
              value={form.batchNo}
              error={errors.batchNo}
              onKeyDown={(event) => handleFieldKeyDown(event, 1)}
              onChange={(event) => setField('batchNo', event.target.value.toUpperCase())}
              placeholder="e.g. BATCH-2405"
              style={itemFieldStyle}
            />
          </FormGrid>

          <div>
            <div style={sectionLabelStyle}>Product Type</div>
            <div
              ref={setFieldRef(2)}
              tabIndex={0}
              onKeyDown={(event) => {
                handleFieldKeyDown(event, 2)
                handleArrowSelection(event, PRODUCT_TYPE_OPTIONS, form.category, (next) => setField('category', next))
              }}
              style={selectorFrameStyle}
            >
              <div style={productTypeSelectorStyle}>
                <button type="button" tabIndex={-1} onMouseDown={(event) => keepContainerFocus(event, 2)} onClick={() => setField('category', previousOption(PRODUCT_TYPE_OPTIONS, form.category))} style={gstArrowButtonStyle} aria-label="Previous product type">‹</button>
                <div style={productTypeValueStyle}>{form.category}</div>
                <button type="button" tabIndex={-1} onMouseDown={(event) => keepContainerFocus(event, 2)} onClick={() => setField('category', nextOption(PRODUCT_TYPE_OPTIONS, form.category))} style={gstArrowButtonStyle} aria-label="Next product type">›</button>
              </div>
              <div style={productTypeHintStyle}>Left / Right arrow to switch type</div>
            </div>
          </div>
        </div>
      </FormSection>

      <FormSection title="Batch & Expiry" subtitle="Track manufacturing and expiry with alert support.">
        <div style={{ display: 'grid', gap: 14 }}>
          <FormGrid cols={3}>
            <Input
              ref={setFieldRef(3)}
              label="Manufacturing Date"
              type="date"
              value={form.mfgDate}
              onKeyDown={(event) => handleFieldKeyDown(event, 3)}
              onChange={(event) => setField('mfgDate', event.target.value)}
              style={itemFieldStyle}
            />
            <Input
              ref={setFieldRef(4)}
              label="Expiry Date"
              type="date"
              value={form.expiryDate}
              error={errors.expiryDate}
              onKeyDown={(event) => handleFieldKeyDown(event, 4)}
              onChange={(event) => setField('expiryDate', event.target.value)}
              style={itemFieldStyle}
            />
            <Input
              ref={setFieldRef(5)}
              label="Barcode"
              value={form.barcode}
              onKeyDown={(event) => handleFieldKeyDown(event, 5)}
              onChange={(event) => setField('barcode', event.target.value)}
              placeholder="Optional barcode / SKU"
              style={itemFieldStyle}
            />
          </FormGrid>

          <div style={alertCardStyle}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
              <input
                ref={setFieldRef(6)}
                type="checkbox"
                checked={form.expiryAlert}
                onKeyDown={(event) => handleFieldKeyDown(event, 6)}
                onChange={(event) => setField('expiryAlert', event.target.checked)}
                style={{ width: 18, height: 18 }}
              />
              <span>
                <span style={{ display: 'block', fontWeight: 700, color: 'var(--ink)' }}>Expiry alert enabled</span>
                <span style={{ display: 'block', color: 'var(--ink-60)', fontSize: 13 }}>Warn when this item is within {EXPIRY_ALERT_DAYS} days of expiry.</span>
              </span>
            </label>
            <ExpiryPreview item={form} />
          </div>
        </div>
      </FormSection>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr .7fr', gap: 16 }}>
        <FormSection title="Pricing & Stock" subtitle="Large inputs for fast rate and stock entry.">
          <div style={{ display: 'grid', gap: 14 }}>
            <FormGrid cols={3}>
              <NumericEntryInput ref={setFieldRef(7)} label="Purchase Price" value={form.purchasePrice} error={errors.purchasePrice} onKeyDown={(event) => handleFieldKeyDown(event, 7)} onValueChange={(value) => setField('purchasePrice', value)} />
              <NumericEntryInput ref={setFieldRef(8)} label="Sale Price" value={form.salesPrice} error={errors.salesPrice} onKeyDown={(event) => handleFieldKeyDown(event, 8)} onValueChange={(value) => setField('salesPrice', value)} />
              <NumericEntryInput ref={setFieldRef(9)} label="MRP" value={form.mrp} error={errors.mrp} onKeyDown={(event) => handleFieldKeyDown(event, 9)} onValueChange={(value) => setField('mrp', value)} />
              <NumericEntryInput ref={setFieldRef(10)} label="Stock Quantity" value={form.stockQty} error={errors.stockQty} onKeyDown={(event) => handleFieldKeyDown(event, 10)} onValueChange={(value) => setField('stockQty', value)} />
              <NumericEntryInput ref={setFieldRef(11)} label="Discount" value={form.discount} error={errors.discount} onKeyDown={(event) => handleFieldKeyDown(event, 11)} onValueChange={(value) => setField('discount', value)} />
              <Input
                ref={setFieldRef(12)}
                label="Storage Notes Tag"
                value={form.notesTag}
                onKeyDown={(event) => handleFieldKeyDown(event, 12)}
                onChange={(event) => setField('notesTag', event.target.value.toUpperCase())}
                placeholder="Optional quick tag"
                style={itemFieldStyle}
              />
            </FormGrid>
          </div>
        </FormSection>

        <FormSection title="GST Slab" subtitle="Use left and right arrows to change the active slab.">
          <div
            ref={setFieldRef(13)}
            tabIndex={0}
            onKeyDown={(event) => {
              handleFieldKeyDown(event, 13)
              handleArrowSelection(event, GST_OPTIONS, Number(form.gstSlab), (next) => setField('gstSlab', next))
            }}
            style={{ ...selectorFrameStyle, minHeight: 136, alignContent: 'center', justifyItems: 'stretch' }}
          >
            <div style={gstSelectorStyle}>
              <button type="button" tabIndex={-1} onMouseDown={(event) => keepContainerFocus(event, 13)} onClick={() => setField('gstSlab', previousOption(GST_OPTIONS, Number(form.gstSlab)))} style={gstArrowButtonStyle} aria-label="Previous GST slab">‹</button>
              <div style={gstValueStyle}>{form.gstSlab}%</div>
              <button type="button" tabIndex={-1} onMouseDown={(event) => keepContainerFocus(event, 13)} onClick={() => setField('gstSlab', nextOption(GST_OPTIONS, Number(form.gstSlab)))} style={gstArrowButtonStyle} aria-label="Next GST slab">›</button>
            </div>
          </div>
        </FormSection>
      </div>

      <FormSection title="Notes" subtitle="Optional instructions for storage, dosage or purchase remarks.">
        <Textarea
          ref={setFieldRef(14)}
          label="Notes / Description"
          value={form.notes}
          onKeyDown={(event) => handleFieldKeyDown(event, 14)}
          onChange={(event) => setField('notes', event.target.value)}
          rows={4}
          style={{ ...itemFieldStyle, minHeight: 112, borderRadius: 16 }}
        />
      </FormSection>

      {errors.form && <div style={{ color: 'var(--red)', fontSize: 12 }}>{errors.form}</div>}

      <div style={stickyFooterStyle}>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button
          variant="secondary"
          onKeyDown={(event) => {
            if (event.key === 'Enter' && event.shiftKey) {
              event.preventDefault()
              saveButtonRef.current?.focus?.({ preventScroll: true })
            }
          }}
          onClick={() => commitSave('new')}
        >
          Save & New
        </Button>
        <Button
          ref={saveButtonRef}
          variant="primary"
          onKeyDown={(event) => {
            if (event.key === 'Enter' && event.shiftKey) {
              event.preventDefault()
              fieldRefs.current[14]?.focus?.({ preventScroll: true })
            } else if (event.key === 'Enter') {
              event.preventDefault()
              commitSave('close')
            }
          }}
          onClick={() => commitSave('close')}
        >
          Save Item
        </Button>
      </div>
    </div>
  )
}

function LoanEditorModal({ value, onClose, onSave }) {
  if (!value) return null
  return (
    <Modal open={Boolean(value)} onClose={onClose} title={value.id ? 'Edit Loan' : 'Add Loan'}>
      <LoanEditorForm initialValue={value} onClose={onClose} onSave={onSave} />
    </Modal>
  )
}

function LoanEditorForm({ initialValue, onClose, onSave }) {
  const [form, setForm] = useState(initialValue)
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <FormGrid cols={2}>
        <Input label="Loan Account Name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
        <Input label="Bank / Company" value={form.institution} onChange={(event) => setForm((current) => ({ ...current, institution: event.target.value }))} />
        <Input label="Interest Rate" type="number" value={form.interestRate} onChange={(event) => setForm((current) => ({ ...current, interestRate: Number(event.target.value) }))} />
        <Input label="EMI Amount" type="number" value={form.emiAmount} onChange={(event) => setForm((current) => ({ ...current, emiAmount: Number(event.target.value) }))} />
        <Input label="Due Date" type="date" value={form.dueDate} onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))} />
        <Input label="Remaining Balance" type="number" value={form.remainingBalance} onChange={(event) => setForm((current) => ({ ...current, remainingBalance: Number(event.target.value) }))} />
      </FormGrid>
      <Textarea label="Reminder" value={form.reminder} onChange={(event) => setForm((current) => ({ ...current, reminder: event.target.value }))} />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={() => onSave(form)}>Save Loan</Button>
      </div>
    </div>
  )
}

function BankEditorModal({ value, onClose, onSave }) {
  if (!value) return null
  return (
    <Modal open={Boolean(value)} onClose={onClose} title={value.id ? 'Edit Bank Account' : 'Add Bank Account'}>
      <BankEditorForm initialValue={value} onClose={onClose} onSave={onSave} />
    </Modal>
  )
}

function BankEditorForm({ initialValue, onClose, onSave }) {
  const [form, setForm] = useState(initialValue)
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <FormGrid cols={2}>
        <Input label="Bank Name" value={form.bankName} onChange={(event) => setForm((current) => ({ ...current, bankName: event.target.value }))} />
        <Input label="Account Holder" value={form.accountHolder} onChange={(event) => setForm((current) => ({ ...current, accountHolder: event.target.value }))} />
        <Input label="Account Number" value={form.accountNo} onChange={(event) => setForm((current) => ({ ...current, accountNo: event.target.value }))} />
        <Input label="IFSC" value={form.ifsc} onChange={(event) => setForm((current) => ({ ...current, ifsc: event.target.value }))} />
        <Input label="Branch" value={form.branch} onChange={(event) => setForm((current) => ({ ...current, branch: event.target.value }))} />
        <Input label="Current Balance" type="number" value={form.balance} onChange={(event) => setForm((current) => ({ ...current, balance: Number(event.target.value) }))} />
      </FormGrid>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={() => onSave(form)}>Save Bank Account</Button>
      </div>
    </div>
  )
}

function SummaryStrip({ values }) {
  return (
    <div className="kpi-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 14 }}>
      {values.map(([label, value]) => <KpiCard key={label} label={label} value={value} />)}
    </div>
  )
}

function StatusChip({ status }) {
  const background = status === 'Active'
    ? 'var(--green-bg)'
    : status === 'Deleted' || status === 'Discontinued'
      ? 'var(--red-bg)'
      : 'var(--surface-2)'

  return <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 8px', borderRadius: 999, border: '1px solid var(--border)', background, fontSize: 11.5, fontWeight: 600 }}>{status}</span>
}

function ActionCell({ onEdit, onDelete }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
      <Button size="sm" variant="ghost" tabIndex={-1} onClick={(event) => { event.stopPropagation(); onEdit() }}>Edit</Button>
      <Button size="sm" variant="ghost" tabIndex={-1} onClick={(event) => { event.stopPropagation(); onDelete() }}>Delete</Button>
    </div>
  )
}

function createEmptyItem() {
  return {
    name: '',
    category: lastSelectedProductType,
    batchNo: '',
    mfgDate: todayISO(),
    expiryDate: '',
    expiryAlert: true,
    gstSlab: lastSelectedGstSlab,
    gst: lastSelectedGstSlab,
    purchasePrice: '0',
    salesPrice: '0',
    mrp: '0',
    stockQty: '0',
    discount: '0',
    unitType: 'Nos',
    barcode: '',
    hsn: '',
    notesTag: '',
    notes: '',
    status: 'Active',
  }
}

function normalizeItemForm(value = {}) {
  const next = {
    ...createEmptyItem(),
    ...value,
  }

  return {
    ...next,
    category: PRODUCT_TYPE_OPTIONS.includes(next.category) ? next.category : (lastSelectedProductType || 'Other Goods'),
    batchNo: next.batchNo || '',
    mfgDate: next.mfgDate || todayISO(),
    expiryDate: next.expiryDate || '',
    expiryAlert: next.expiryAlert !== false,
    gstSlab: Number(next.gstSlab ?? lastSelectedGstSlab),
    gst: String(next.gst ?? next.gstSlab ?? lastSelectedGstSlab),
    purchasePrice: String(next.purchasePrice ?? 0),
    salesPrice: String(next.salesPrice ?? 0),
    mrp: String(next.mrp ?? next.salesPrice ?? 0),
    stockQty: String(next.stockQty ?? 0),
    discount: String(next.discount ?? 0),
    barcode: next.barcode || '',
    notesTag: next.notesTag || '',
    notes: next.notes || '',
  }
}

function sanitizeItemForm(form) {
  return {
    ...form,
    name: String(form.name || '').trim(),
    category: PRODUCT_TYPE_OPTIONS.includes(form.category) ? form.category : 'Other Goods',
    batchNo: String(form.batchNo || '').trim().toUpperCase(),
    mfgDate: form.mfgDate || '',
    expiryDate: form.expiryDate || '',
    expiryAlert: Boolean(form.expiryAlert),
    gstSlab: parseDecimalValue(form.gstSlab),
    gst: parseDecimalValue(form.gstSlab),
    purchasePrice: parseDecimalValue(form.purchasePrice),
    salesPrice: parseDecimalValue(form.salesPrice),
    mrp: parseDecimalValue(form.mrp),
    stockQty: parseDecimalValue(form.stockQty),
    discount: parseDecimalValue(form.discount),
    barcode: String(form.barcode || '').trim(),
    notesTag: String(form.notesTag || '').trim().toUpperCase(),
    notes: String(form.notes || '').trim(),
    status: form.status || 'Active',
  }
}

const NumericEntryInput = React.forwardRef(function NumericEntryInput({
  label,
  value,
  onValueChange,
  onKeyDown,
  error,
}, ref) {
  const displayValue = value === '' || value === null || value === undefined ? '0' : String(value)

  return (
    <Input
      ref={ref}
      label={label}
      value={displayValue}
      error={error}
      inputMode="decimal"
      onFocus={selectZeroLikeValue}
      onClick={selectZeroLikeValue}
      onKeyDown={(event) => {
        clearZeroOnType(event)
        onKeyDown?.(event)
      }}
      onChange={(event) => onValueChange(event.target.value)}
      style={itemFieldStyle}
    />
  )
})

function FormSection({ title, subtitle, children }) {
  return (
    <section style={formSectionStyle}>
      <div style={{ display: 'grid', gap: 3 }}>
        <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-.02em' }}>{title}</div>
        <div style={{ fontSize: 12.5, color: 'var(--ink-60)' }}>{subtitle}</div>
      </div>
      {children}
    </section>
  )
}

function ExpiryCell({ item }) {
  const status = getExpiryStatus(item.expiryDate, item.expiryAlert)
  return (
    <div style={{ display: 'grid', gap: 4 }}>
      <span>{item.expiryDate ? formatDateLabel(item.expiryDate) : '—'}</span>
      {status && <span style={expiryBadgeStyle(status.variant)}>{status.label}</span>}
    </div>
  )
}

function ExpiryPreview({ item }) {
  const status = getExpiryStatus(item.expiryDate, item.expiryAlert)
  if (!status) {
    return <div style={{ color: 'var(--ink-60)', fontSize: 12.5 }}>No expiry warning for this item yet.</div>
  }

  return (
    <div style={{ display: 'grid', gap: 5, justifyItems: 'end' }}>
      <span style={expiryBadgeStyle(status.variant)}>{status.label}</span>
      <span style={{ color: 'var(--ink-60)', fontSize: 12.5 }}>{status.detail}</span>
    </div>
  )
}

function getExpiryStatus(expiryDate, alertsEnabled = true) {
  if (!alertsEnabled || !expiryDate) return null
  const today = new Date(todayISO())
  const expiry = new Date(expiryDate)
  const diffDays = Math.ceil((expiry - today) / 86400000)

  if (Number.isNaN(diffDays)) return null
  if (diffDays < 0) return { label: 'Expired', detail: `${Math.abs(diffDays)} days overdue`, variant: 'danger' }
  if (diffDays <= EXPIRY_ALERT_DAYS) return { label: 'Near Expiry', detail: `${diffDays} days left`, variant: 'warning' }
  return { label: 'Healthy', detail: `${diffDays} days left`, variant: 'safe' }
}

function parseDecimalValue(value) {
  const parsed = Number.parseFloat(String(value ?? '').trim())
  return Number.isFinite(parsed) ? parsed : 0
}

function selectZeroLikeValue(event) {
  const target = event.currentTarget
  if (!(target instanceof HTMLInputElement)) return
  if (!isZeroLikeValue(target.value)) return
  requestAnimationFrame(() => target.setSelectionRange?.(0, target.value.length))
}

function clearZeroOnType(event) {
  const target = event.currentTarget
  if (!(target instanceof HTMLInputElement)) return
  if (event.ctrlKey || event.metaKey || event.altKey) return
  if (!/^[0-9.]$/.test(event.key)) return
  if (!isZeroLikeValue(target.value)) return
  event.preventDefault()
  target.value = event.key === '.' ? '0.' : event.key
  target.setSelectionRange?.(target.value.length, target.value.length)
  target.dispatchEvent(new Event('input', { bubbles: true }))
}

function isZeroLikeValue(value) {
  return value === '0' || value === '0.0' || value === '0.00'
}

function previousOption(options, current) {
  const index = Math.max(options.indexOf(current), 0)
  return options[Math.max(index - 1, 0)]
}

function nextOption(options, current) {
  const index = Math.max(options.indexOf(current), 0)
  return options[Math.min(index + 1, options.length - 1)]
}

function formatDateLabel(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const itemFormHeroStyle = {
  background: 'linear-gradient(135deg, #16324f 0%, #244e73 55%, #3d7ba7 100%)',
  borderRadius: 24,
  padding: '22px 24px',
  display: 'flex',
  justifyContent: 'space-between',
  gap: 18,
  alignItems: 'center',
  color: '#fff',
  boxShadow: '0 18px 34px rgba(22,50,79,.18)',
}

const heroMetaChipStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 999,
  padding: '7px 12px',
  fontSize: 12,
  fontWeight: 700,
}

const formSectionStyle = {
  display: 'grid',
  gap: 14,
  padding: '18px 18px 16px',
  border: '1px solid #dce4ea',
  borderRadius: 22,
  background: 'linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)',
  boxShadow: '0 8px 20px rgba(15, 23, 42, .04)',
}

const itemFieldStyle = {
  minHeight: 48,
  padding: '12px 14px',
  borderRadius: 14,
  fontSize: 14,
  borderColor: '#ccd8e4',
  background: '#fcfdff',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,.8)',
}

const selectorFrameStyle = {
  display: 'grid',
  gap: 12,
  padding: 12,
  borderRadius: 18,
  border: '1px solid #d5e2eb',
  background: 'linear-gradient(180deg, #f8fbfd 0%, #f3f8fb 100%)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,.9)',
}

const pillButtonStyle = {
  border: '1px solid #c7d8e5',
  background: '#fff',
  color: '#20425b',
  borderRadius: 999,
  padding: '10px 14px',
  fontSize: 13,
  fontWeight: 700,
  transition: 'all .16s ease',
}

const activePillButtonStyle = {
  background: '#20425b',
  color: '#fff',
  borderColor: '#20425b',
  boxShadow: '0 8px 18px rgba(32,66,91,.22)',
}

const alertCardStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 14,
  padding: '14px 16px',
  borderRadius: 18,
  border: '1px solid #e5ecf1',
  background: '#f8fbfe',
}

const stickyFooterStyle = {
  position: 'sticky',
  bottom: -20,
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 10,
  padding: '14px 0 2px',
  background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,.96) 24%, rgba(255,255,255,1) 100%)',
}

const sectionLabelStyle = {
  fontSize: '11px',
  fontWeight: 600,
  color: 'var(--ink-40)',
  textTransform: 'uppercase',
  letterSpacing: '.07em',
  display: 'block',
  marginBottom: 8,
}

const gstSelectorStyle = {
  display: 'grid',
  gridTemplateColumns: '56px 1fr 56px',
  alignItems: 'center',
  gap: 12,
}

const productTypeSelectorStyle = {
  display: 'grid',
  gridTemplateColumns: '56px 1fr 56px',
  alignItems: 'center',
  gap: 12,
}

const productTypeValueStyle = {
  display: 'grid',
  placeItems: 'center',
  minHeight: 62,
  borderRadius: 18,
  background: 'linear-gradient(135deg, #eef7ff 0%, #f9fcff 100%)',
  border: '1px solid #c9dcef',
  color: '#16324f',
  fontSize: 22,
  fontWeight: 800,
  letterSpacing: '-.03em',
  textAlign: 'center',
  padding: '0 12px',
}

const productTypeHintStyle = {
  textAlign: 'center',
  fontSize: 12,
  color: 'var(--ink-60)',
  fontWeight: 600,
}

const gstArrowButtonStyle = {
  border: '1px solid #c7d8e5',
  background: '#fff',
  color: '#17344d',
  borderRadius: 16,
  minHeight: 52,
  fontSize: 28,
  lineHeight: 1,
  boxShadow: '0 6px 16px rgba(23,52,77,.08)',
}

const gstValueStyle = {
  display: 'grid',
  placeItems: 'center',
  minHeight: 62,
  borderRadius: 18,
  background: 'linear-gradient(135deg, #fef7e8 0%, #fffdfa 100%)',
  border: '1px solid #f0dcb3',
  color: '#8a4d00',
  fontSize: 28,
  fontWeight: 800,
  letterSpacing: '-.04em',
  transition: 'transform .18s ease',
}

function expiryBadgeStyle(variant) {
  const palette = variant === 'danger'
    ? { color: '#b91c1c', bg: '#fff1f2', border: '#fecdd3' }
    : variant === 'warning'
      ? { color: '#9a5b00', bg: '#fff7e6', border: '#f7d58b' }
      : { color: '#166534', bg: '#effcf3', border: '#bbf7d0' }

  return {
    display: 'inline-flex',
    alignItems: 'center',
    width: 'fit-content',
    borderRadius: 999,
    padding: '3px 8px',
    fontSize: 11,
    fontWeight: 700,
    border: `1px solid ${palette.border}`,
    background: palette.bg,
    color: palette.color,
  }
}

const miniCardButtonStyle = {
  width: '100%',
  border: '1px solid var(--border)',
  background: 'var(--surface-2)',
  borderRadius: 'var(--r-md)',
  padding: '10px 12px',
  textAlign: 'left',
}

const tabStyle = {
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '8px 12px',
  fontSize: 12.5,
  fontWeight: 700,
}

const dropzoneStyle = {
  border: '1px dashed var(--border-3)',
  borderRadius: 'var(--r-md)',
  background: 'var(--surface-2)',
  padding: '18px 16px',
  display: 'grid',
  gap: 6,
  textAlign: 'center',
  marginBottom: 14,
}
