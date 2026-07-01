import React, { useMemo, useRef, useState } from 'react'
import { Bar, BarChart, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useApp } from '../context/AppContext.jsx'
import { buildReportState } from '../data/reportUtils.js'
import { Button, Card, CardBody, CardHead, FormGrid, Input, KpiCard, Modal, PageHeader, Select, Table, Textarea } from '../components/ui/index.js'
import { downloadCsv, fmt, fmtShort, printTextReport, todayISO } from '../utils/helpers.js'
import { useToast } from '../context/ToastContext.jsx'
import ErpImportModal from '../components/import/ErpImportModal.jsx'

const EXPENSE_CATEGORIES = [
  'Electricity',
  'Salary',
  'Rent',
  'Transport',
  'Internet',
  'Maintenance',
  'Miscellaneous',
]

const PAYMENT_MODES = ['Cash', 'UPI', 'Bank', 'Cheque']
const COLORS = ['#10375c', '#127681', '#5bb318', '#f3c623', '#f48c06', '#d62828']

function exportExpenseWorkbook(rows, summaryLabel) {
  downloadCsv('expense-management-report.csv', [
    { label: 'Date', key: 'date' },
    { label: 'Expense Title', value: (row) => row.title || row.desc || '' },
    { label: 'Category', key: 'category' },
    { label: 'Amount', key: 'amount' },
    { label: 'Payment Mode', value: (row) => row.paymentMode || row.mode || '' },
    { label: 'Notes', value: (row) => row.notes || '' },
  ], rows)

  printTextReport({
    title: 'Expense Management Report',
    subtitle: summaryLabel,
    sections: [
      {
        title: 'Expense Entries',
        columns: [
          { label: 'Date', value: (row) => row.date },
          { label: 'Title', value: (row) => row.title || row.desc || '' },
          { label: 'Category', value: (row) => row.category },
          { label: 'Mode', value: (row) => row.paymentMode || row.mode || '' },
          { label: 'Amount', value: (row) => fmt(row.amount || 0), align: 'right' },
        ],
        rows,
      },
    ],
  })
}

export default function ExpenseManagementPage() {
  const { expenses, addExpense, invoices, purchases, parties, itemMaster } = useApp()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [form, setForm] = useState({
    title: '',
    category: 'Electricity',
    amount: '',
    paymentMode: 'Cash',
    notes: '',
    date: todayISO(),
  })

  const titleRef = useRef(null)
  const categoryRef = useRef(null)
  const amountRef = useRef(null)
  const modeRef = useRef(null)
  const notesRef = useRef(null)
  const filterEndDateRef = useRef(null)
  const filterSearchRef = useRef(null)

  const reportState = useMemo(() => buildReportState({
    sales: invoices,
    purchases,
    parties,
    expenses,
    itemMaster,
    fromDate,
    toDate,
  }), [expenses, fromDate, invoices, itemMaster, parties, purchases, toDate])

  const filteredExpenses = useMemo(() => (
    categoryFilter === 'All'
      ? reportState.filteredExpenses
      : reportState.filteredExpenses.filter((expense) => expense.category === categoryFilter)
  ), [categoryFilter, reportState.filteredExpenses])

  const totalExpenses = filteredExpenses.reduce((sum, row) => sum + (Number(row.amount) || 0), 0)
  const highestCategory = reportState.highestExpenseCategory?.category || 'N/A'

  const chartRows = useMemo(() => {
    const grouped = new Map()
    filteredExpenses.forEach((row) => {
      const current = grouped.get(row.category) ?? { category: row.category, amount: 0 }
      current.amount += Number(row.amount) || 0
      grouped.set(row.category, current)
    })
    return Array.from(grouped.values()).sort((a, b) => b.amount - a.amount)
  }, [filteredExpenses])

  const handleSave = () => {
    if (!form.title.trim() || !form.amount) {
      toast('Expense title and amount are required', 'error')
      return
    }

    addExpense({
      title: form.title,
      desc: form.title,
      category: form.category,
      amount: Number(form.amount) || 0,
      paymentMode: form.paymentMode,
      mode: form.paymentMode,
      notes: form.notes,
      date: form.date,
    })

    toast('Expense added to daily register', 'success')
    setOpen(false)
    setForm({
      title: '',
      category: 'Electricity',
      amount: '',
      paymentMode: 'Cash',
      notes: '',
      date: todayISO(),
    })
  }

  return (
    <div className="animate-slide">
      <ErpImportModal open={importOpen} onClose={() => setImportOpen(false)} defaultKind="expenses" />
      <PageHeader
        title="Expense Management"
        sub="Daily business and worker-related expenses with export-ready analytics and keyboard-first entry."
        right={
          <>
            <Button
              variant="ghost"
              onClick={() => setImportOpen(true)}
            >
              Import
            </Button>
            <Button
              variant="ghost"
              onClick={() => exportExpenseWorkbook(filteredExpenses, `Range ${fromDate || 'start'} to ${toDate || 'today'} | Total ${fmt(totalExpenses)}`)}
            >
              Excel Export
            </Button>
            <Button
              variant="ghost"
              onClick={() => exportExpenseWorkbook(filteredExpenses, `Range ${fromDate || 'start'} to ${toDate || 'today'} | Total ${fmt(totalExpenses)}`)}
            >
              PDF Export
            </Button>
            <Button variant="primary" onClick={() => { setOpen(true); requestAnimationFrame(() => titleRef.current?.focus()) }}>
              Quick Add Expense
            </Button>
          </>
        }
      />

      <Card style={{ marginBottom: 18 }}>
        <CardHead title="Filters" sub="Date-wise filtering with category analysis and instant recalculation." />
        <CardBody style={{ display: 'grid', gap: 14 }}>
          <FormGrid cols={4}>
            <Input
              label="Start Date"
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  filterEndDateRef.current?.focus({ preventScroll: true })
                }
              }}
            />
            <Input
              ref={filterEndDateRef}
              label="End Date"
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  filterSearchRef.current?.click()
                }
              }}
            />
            <Select label="Category" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} options={['All', ...EXPENSE_CATEGORIES]} />
            <div style={{ display: 'flex', alignItems: 'end' }}>
              <Button ref={filterSearchRef} variant="primary" style={{ width: '100%', justifyContent: 'center' }}>
                Search
              </Button>
            </div>
          </FormGrid>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 12, color: 'var(--ink-40)' }}>Enter key flow inside quick add form, ESC closes popup, analytics refresh automatically.</div>
            <Button variant="ghost" onClick={() => { setFromDate(''); setToDate(''); setCategoryFilter('All') }}>Clear Filters</Button>
          </div>
        </CardBody>
      </Card>

      <div className="kpi-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 18 }}>
        <KpiCard label="Total Expenses" value={fmtShort(totalExpenses)} sub={`${filteredExpenses.length} entries`} />
        <KpiCard label="Highest Expense Category" value={highestCategory} sub={reportState.highestExpenseCategory ? fmtShort(reportState.highestExpenseCategory.amount) : 'No category total'} />
        <KpiCard label="Average Daily Expense" value={fmtShort(reportState.totals.averageDailyExpense)} sub="Across active expense dates" />
        <KpiCard label="Monthly Expense Trend" value={reportState.expenseTrend.length} sub="Month buckets tracked" />
      </div>

      <div className="two-col-grid" style={{ display: 'grid', gridTemplateColumns: '1.05fr .95fr', gap: 18, marginBottom: 18 }}>
        <Card>
          <CardHead title="Category-wise Breakdown" sub="Where money is being spent." />
          <CardBody style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartRows}>
                <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value) => fmt(value)} />
                <Bar dataKey="amount" radius={[10, 10, 0, 0]}>
                  {chartRows.map((row, index) => (
                    <Cell key={row.category} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        <Card>
          <CardHead title="Monthly Trend" sub="Track expense movement over time." />
          <CardBody style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={reportState.expenseTrend}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value) => fmt(value)} />
                <Line type="monotone" dataKey="amount" stroke="#10375c" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      </div>

      <div className="two-col-grid" style={{ display: 'grid', gridTemplateColumns: '.9fr 1.1fr', gap: 18, marginBottom: 18 }}>
        <Card>
          <CardHead title="Expense Share" sub="Snapshot of current category mix." />
          <CardBody style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartRows} dataKey="amount" nameKey="category" outerRadius={110} innerRadius={54} paddingAngle={4}>
                  {chartRows.map((row, index) => (
                    <Cell key={row.category} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => fmt(value)} />
              </PieChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        <Card>
          <CardHead title="Expense Cards" sub="Fast-glance business spending heads." />
          <CardBody style={{ display: 'grid', gap: 12 }}>
            {chartRows.map((row) => (
              <div key={row.category} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', background: 'linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{row.category}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-40)' }}>Operational expense head</div>
                </div>
                <strong>{fmt(row.amount)}</strong>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHead title="Expense Register" sub="Responsive ERP-style table with worker and business expense tracking." />
        <Table
          focusId="expense-statement"
          cols={[
            { key: 'date', label: 'Date', dim: true },
            { key: 'title', label: 'Expense Title', render: (_, row) => row.title || row.desc || '-' },
            { key: 'category', label: 'Category' },
            { key: 'amount', label: 'Amount', right: true, render: (value) => <strong>{fmt(value || 0)}</strong> },
            { key: 'paymentMode', label: 'Payment Mode', render: (_, row) => row.paymentMode || row.mode || '-' },
            { key: 'notes', label: 'Notes', wrap: true, render: (value) => value || '-' },
          ]}
          rows={filteredExpenses}
          emptyMsg="No expenses found for the current filter."
        />
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Quick Add Expense">
        <Input
          ref={titleRef}
          label="Expense Title *"
          value={form.title}
          onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              categoryRef.current?.focus({ preventScroll: true })
            }
          }}
        />
        <FormGrid cols={2}>
          <Select
            ref={categoryRef}
            label="Category"
            value={form.category}
            onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
            options={EXPENSE_CATEGORIES}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                amountRef.current?.focus({ preventScroll: true })
              }
            }}
          />
          <Input
            ref={amountRef}
            label="Amount *"
            type="number"
            value={form.amount}
            onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                modeRef.current?.focus({ preventScroll: true })
              }
            }}
          />
        </FormGrid>
        <FormGrid cols={2}>
          <Select
            ref={modeRef}
            label="Payment Mode"
            value={form.paymentMode}
            onChange={(event) => setForm((current) => ({ ...current, paymentMode: event.target.value }))}
            options={PAYMENT_MODES}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                notesRef.current?.focus({ preventScroll: true })
              }
            }}
          />
          <Input label="Date" type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} />
        </FormGrid>
        <Textarea
          ref={notesRef}
          label="Notes"
          value={form.notes}
          onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              handleSave()
            }
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleSave}>Save Expense</Button>
        </div>
      </Modal>
    </div>
  )
}
