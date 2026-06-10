import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { fmt, fmtShort, todayISO } from '../utils/helpers.js'
import {
  Card,
  CardBody,
  CardHead,
  FormGrid,
  Input,
  KpiCard,
  PageHeader,
  SearchInput,
  Select,
  Table,
  Textarea,
  FilterPills,
} from '../components/ui/index.js'
import { Avatar, Badge } from '../components/ui/index.js'
import Button from '../components/ui/Button.jsx'
import Modal from '../components/ui/Modal.jsx'
import PurchaseInvoiceView from '../components/layout/PurchaseInvoiceView.jsx'
import { CASH_ENTRIES, BANK_ENTRIES, BACKUPS as INIT_BACKUPS } from '../data/store.js'
import { useEscapeAction } from '../context/EscapeContext.jsx'
import useAutocomplete from '../hooks/useAutocomplete.js'
import useKeyboard from '../hooks/useKeyboard.js'
import useKeyboardListNavigation from '../hooks/useKeyboardListNavigation.js'
import { REPORT_DEFINITIONS } from '../components/reports/reportDefinitions.js'

const CELL_INPUT = {
  width: '100%',
  border: '1px solid var(--border)',
  borderRadius: 4,
  padding: '6px 8px',
  outline: 'none',
  background: 'var(--surface)',
}

export function PurchasePage() {
  const { purchases, addPurchase, parties } = useApp()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [viewPO, setViewPO] = useState(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [form, setForm] = useState({ supplier: '', billNo: '', date: todayISO(), dueDate: todayISO(), mode: 'Credit', taxPct: 0, notes: '' })
  const [items, setItems] = useState([{ desc: '', qty: '1', rate: '0', amount: 0 }])
  const dateRef = useRef(null)
  const supplierRef = useRef(null)
  const rowRefs = useRef([])
  const supplierParties = parties.filter((party) => party.type === 'Supplier' || party.type === 'Both')
  const { isOpen, setOpen: setSuggestionOpen, suggestions, highlightedIndex, setHighlightedIndex, handleKeyDown } = useAutocomplete({
    items: supplierParties,
    value: form.supplier,
    getLabel: (party) => party.name,
  })

  const subtotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
  const tax = Math.round(subtotal * (Number(form.taxPct) || 0) / 100)
  const totalAmount = subtotal + tax

  useKeyboard({
    enabled: open,
    bindings: [{ id: 'saveRecord', allowInEditable: true, handler: () => handleSave() }],
  })

  const filtered = purchases.filter((purchase) => {
    const query = search.toLowerCase()
    const matchesQuery = purchase.supplier.toLowerCase().includes(query) || purchase.id.toLowerCase().includes(query)
    const matchesFilter = filter === 'All' || purchase.status === filter
    return matchesQuery && matchesFilter
  })

  const handleSave = () => {
    if (!form.supplier || !items.some((item) => item.desc.trim())) {
      toast('Supplier and items are required', 'error')
      return
    }

    addPurchase({
      id: form.billNo || `PO-${Date.now()}`,
      supplier: form.supplier,
      date: form.date,
      dueDate: form.dueDate,
      amount: totalAmount,
      subtotal,
      tax,
      paid: 0,
      mode: form.mode,
      status: 'Unpaid',
      items: items.filter((item) => item.desc.trim()).map((item) => ({
        ...item,
        qty: Number(item.qty) || 0,
        rate: Number(item.rate) || 0,
        amount: Number(item.amount) || 0,
      })),
      notes: form.notes,
    })
    toast('Purchase order saved', 'success')
    setOpen(false)
    setForm({ supplier: '', billNo: '', date: todayISO(), dueDate: todayISO(), mode: 'Credit', taxPct: 0, notes: '' })
    setItems([{ desc: '', qty: '1', rate: '0', amount: 0 }])
  }

  const updateItem = (index, key, value) => {
    setItems((current) => current.map((item, itemIndex) => {
      if (itemIndex !== index) return item
      const next = { ...item, [key]: value }
      next.amount = (Number(next.qty) || 0) * (Number(next.rate) || 0)
      return next
    }))
  }

  const focusCell = (index, field) => requestAnimationFrame(() => rowRefs.current[index]?.[field]?.focus({ preventScroll: true }))
  const appendRow = () => {
    setItems((current) => [...current, { desc: '', qty: '1', rate: '0', amount: 0 }])
    requestAnimationFrame(() => focusCell(items.length, 'desc'))
  }

  const totalAll = purchases.reduce((sum, purchase) => sum + purchase.amount, 0)
  const totalUnpaid = purchases.filter((purchase) => purchase.status !== 'Paid').reduce((sum, purchase) => sum + purchase.amount, 0)
  const totalPaid = purchases.filter((purchase) => purchase.status === 'Paid').reduce((sum, purchase) => sum + purchase.amount, 0)

  const cols = [
    { key: 'id', label: 'Bill No', mono: true },
    {
      key: 'supplier',
      label: 'Supplier',
      render: (value) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar name={value} size={26} />
          <span style={{ fontWeight: 500 }}>{value}</span>
        </div>
      ),
    },
    { key: 'date', label: 'Date', dim: true },
    { key: 'amount', label: 'Amount', right: true, render: (value) => <span style={{ fontWeight: 600 }}>{fmt(value)}</span> },
    { key: 'status', label: 'Status', render: (value) => <Badge status={value} /> },
    {
      key: '_act',
      label: '',
      sortable: false,
      render: (_, row) => (
        <Button size="sm" variant="ghost" tabIndex={-1} onClick={(event) => { event.stopPropagation(); setViewPO(row) }}>
          View
        </Button>
      ),
    },
  ]

  return (
    <div className="animate-slide">
      {viewPO && <PurchaseInvoiceView purchase={viewPO} onClose={() => setViewPO(null)} />}

      <PageHeader title="Purchase" sub="Keyboard-first purchase entry aligned with the invoice workflow." right={<Button variant="primary" onClick={() => { setOpen(true); requestAnimationFrame(() => dateRef.current?.focus()) }}>+ New Purchase</Button>} />
      <div className="kpi-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 22 }}>
        <KpiCard label="This Month" value={fmtShort(totalAll)} sub={`${purchases.length} orders`} />
        <KpiCard label="Unpaid" value={fmtShort(totalUnpaid)} />
        <KpiCard label="Paid" value={fmtShort(totalPaid)} />
        <KpiCard label="Suppliers" value={supplierParties.length} sub="Active vendors" />
      </div>

      <Card>
        <CardHead title="Purchase Orders" right={<div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}><SearchInput value={search} onChange={setSearch} placeholder="Search supplier or bill…" /><FilterPills options={['All', 'Paid', 'Partial', 'Unpaid']} value={filter} onChange={setFilter} /></div>} />
        <Table focusId="purchase-list" cols={cols} rows={filtered} onRowClick={setViewPO} emptyMsg="No purchase orders found" />
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="New Purchase Order">
        <FormGrid cols={2}>
          <Input
            ref={dateRef}
            label="Date"
            type="date"
            value={form.date}
            onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                supplierRef.current?.focus({ preventScroll: true })
              }
            }}
          />
          <Input label="Due Date" type="date" value={form.dueDate} onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))} />
        </FormGrid>

        <div style={{ position: 'relative' }}>
          <Input
            ref={supplierRef}
            label="Supplier *"
            value={form.supplier}
            onFocus={() => setSuggestionOpen(true)}
            onChange={(event) => { setForm((current) => ({ ...current, supplier: event.target.value })); setSuggestionOpen(true) }}
            onKeyDown={(event) => {
              if (handleKeyDown(event, (party) => {
                setForm((current) => ({ ...current, supplier: party.name }))
                setSuggestionOpen(false)
                focusCell(0, 'desc')
              })) return
              if (event.key === 'Enter') {
                event.preventDefault()
                focusCell(0, 'desc')
              }
            }}
          />
          {isOpen && suggestions.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', marginTop: 4, boxShadow: 'var(--shadow-sm)' }}>
              {suggestions.map((party, index) => (
                <button
                  key={party.id}
                  onMouseDown={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    setForm((current) => ({ ...current, supplier: party.name }))
                    setHighlightedIndex(index)
                    setSuggestionOpen(false)
                    focusCell(0, 'desc')
                  }}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  style={{ width: '100%', border: 'none', background: highlightedIndex === index ? 'var(--surface-2)' : 'transparent', textAlign: 'left', padding: '9px 12px', cursor: 'pointer' }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{party.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-40)' }}>{party.city}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <FormGrid cols={2}>
          <Input label="Bill No" value={form.billNo} onChange={(event) => setForm((current) => ({ ...current, billNo: event.target.value }))} placeholder="Auto if blank" />
          <Select label="Payment Mode" value={form.mode} onChange={(event) => setForm((current) => ({ ...current, mode: event.target.value }))} options={['Credit', 'Cash', 'Bank', 'UPI']} />
        </FormGrid>

        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 120px 120px', padding: '8px 10px', gap: 8, background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 600, color: 'var(--ink-40)' }}>
            <div>Description</div><div>Qty</div><div>Rate</div><div>Amount</div>
          </div>
          {items.map((item, index) => (
            <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 120px 120px', gap: 8, padding: '8px 10px', borderBottom: index < items.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <input ref={(node) => { rowRefs.current[index] = rowRefs.current[index] ?? {}; rowRefs.current[index].desc = node }} value={item.desc} onChange={(event) => updateItem(index, 'desc', event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); focusCell(index, 'qty') } }} style={CELL_INPUT} />
              <input ref={(node) => { rowRefs.current[index] = rowRefs.current[index] ?? {}; rowRefs.current[index].qty = node }} type="number" value={item.qty} onChange={(event) => updateItem(index, 'qty', event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); focusCell(index, 'rate') } }} style={{ ...CELL_INPUT, textAlign: 'right' }} />
              <input ref={(node) => { rowRefs.current[index] = rowRefs.current[index] ?? {}; rowRefs.current[index].rate = node }} type="number" value={item.rate} onChange={(event) => updateItem(index, 'rate', event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); if (index === items.length - 1) appendRow(); else focusCell(index + 1, 'desc') } }} style={{ ...CELL_INPUT, textAlign: 'right' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', fontWeight: 700, fontFamily: 'var(--mono)' }}>{fmt(item.amount)}</div>
            </div>
          ))}
        </div>
        <Button variant="ghost" onClick={appendRow}>+ Add Item</Button>
        <Textarea label="Notes" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
        <FormGrid cols={2}>
          <Input label="Tax %" type="number" value={form.taxPct} onChange={(event) => setForm((current) => ({ ...current, taxPct: event.target.value }))} />
          <Input label="Total" value={fmt(totalAmount)} readOnly />
        </FormGrid>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleSave}>Save Purchase</Button>
        </div>
      </Modal>
    </div>
  )
}

export function ExpensePage() {
  const { expenses, addExpense } = useApp()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ category: 'Rent', desc: '', amount: '', mode: 'Cash', date: todayISO() })
  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0)
  const categories = {}
  expenses.forEach((expense) => { categories[expense.category] = (categories[expense.category] || 0) + expense.amount })

  const handleSave = () => {
    if (!form.desc || !form.amount) {
      toast('Description and amount required', 'error')
      return
    }
    addExpense({ ...form, amount: parseFloat(form.amount) })
    toast('Expense recorded', 'success')
    setOpen(false)
    setForm({ category: 'Rent', desc: '', amount: '', mode: 'Cash', date: todayISO() })
  }

  return (
    <div className="animate-slide">
      <PageHeader title="Expense" sub="Bills, reimbursements and spending." right={<Button variant="primary" onClick={() => setOpen(true)}>+ Add Expense</Button>} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
        <Card>
          <CardHead title="Expense Breakdown" sub={`Total: ${fmt(total)} this month`} />
          <CardBody>
            {Object.entries(categories).map(([category, amount]) => (
              <div key={category} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 12.5 }}>
                  <span style={{ color: 'var(--ink-60)' }}>{category}</span>
                  <span style={{ fontWeight: 600 }}>{fmt(amount)}</span>
                </div>
                <div style={{ background: 'var(--surface-3)', borderRadius: 99, height: 4 }}>
                  <div style={{ width: `${Math.round((amount / total) * 100)}%`, height: '100%', background: 'var(--ink)', borderRadius: 99 }} />
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
        <Card>
          <CardHead title="Recent Expenses" />
          <Table cols={[
            { key: 'category', label: 'Category' },
            { key: 'desc', label: 'Description', wrap: true },
            { key: 'amount', label: 'Amount', right: true, render: (value) => <span style={{ fontWeight: 600, color: 'var(--red)' }}>{fmt(value)}</span> },
            { key: 'mode', label: 'Mode', dim: true },
            { key: 'date', label: 'Date', dim: true },
          ]}
            focusId="expense-statement"
            rows={expenses}
          />
        </Card>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Add Expense">
        <Select label="Category" value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} options={['Rent', 'Electricity', 'Transport', 'Salaries', 'Marketing', 'Misc']} />
        <Input label="Description *" value={form.desc} onChange={(event) => setForm((current) => ({ ...current, desc: event.target.value }))} />
        <FormGrid cols={2}>
          <Input label="Amount (₹) *" type="number" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} />
          <Select label="Payment Mode" value={form.mode} onChange={(event) => setForm((current) => ({ ...current, mode: event.target.value }))} options={['Cash', 'UPI', 'Bank', 'Cheque']} />
        </FormGrid>
        <Input label="Date" type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} />
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleSave}>Save Expense</Button>
        </div>
      </Modal>
    </div>
  )
}

export function CashBankPage() {
  const toast = useToast()
  const [cashOpen, setCashOpen] = useState(false)
  const [bankOpen, setBankOpen] = useState(false)
  const cashIn = CASH_ENTRIES.reduce((sum, row) => sum + row.credit, 0)
  const cashOut = CASH_ENTRIES.reduce((sum, row) => sum + row.debit, 0)
  const balance = cashIn - cashOut

  const amountCell = (value, positive) => value ? <span style={{ color: positive ? 'var(--green)' : 'var(--red)', fontWeight: 600, fontFamily: 'var(--mono)' }}>{fmt(value)}</span> : <span style={{ color: 'var(--ink-20)' }}>—</span>

  return (
    <div className="animate-slide">
      <PageHeader title="Cash & Bank" sub="Ledger balances, transfers and reconciliation." />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 22 }}>
        <KpiCard label="Cash in Hand" value={fmt(balance)} />
        <KpiCard label="Bank Balance" value={fmtShort(324800)} />
        <KpiCard label="Total Liquid" value={fmtShort(393200)} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card>
          <CardHead title="Cash Ledger" right={<Button size="sm" variant="ghost" onClick={() => setCashOpen(true)}>+ Entry</Button>} />
          <Table focusId="cash-ledger" cols={[{ key: 'date', label: 'Date', dim: true }, { key: 'narration', label: 'Narration', wrap: true }, { key: 'credit', label: 'In', right: true, render: (value) => amountCell(value, true) }, { key: 'debit', label: 'Out', right: true, render: (value) => amountCell(value, false) }]} rows={CASH_ENTRIES} />
        </Card>
        <Card>
          <CardHead title="Bank Transactions" right={<Button size="sm" variant="ghost" onClick={() => setBankOpen(true)}>+ Entry</Button>} />
          <Table focusId="bank-ledger" cols={[{ key: 'date', label: 'Date', dim: true }, { key: 'description', label: 'Description', wrap: true }, { key: 'credit', label: 'Credit', right: true, render: (value) => amountCell(value, true) }, { key: 'debit', label: 'Debit', right: true, render: (value) => amountCell(value, false) }]} rows={BANK_ENTRIES} />
        </Card>
      </div>

      <Modal open={cashOpen} onClose={() => setCashOpen(false)} title="Cash Entry">
        <Select label="Type" options={['Cash In', 'Cash Out']} />
        <Input label="Narration" placeholder="Purpose of entry" />
        <Input label="Amount (₹)" type="number" />
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={() => setCashOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={() => { setCashOpen(false); toast('Cash entry saved', 'success') }}>Save</Button>
        </div>
      </Modal>

      <Modal open={bankOpen} onClose={() => setBankOpen(false)} title="Bank Entry">
        <Select label="Type" options={['Credit', 'Debit']} />
        <Input label="Description" />
        <FormGrid cols={2}>
          <Input label="Amount (₹)" type="number" />
          <Input label="Ref / UTR" />
        </FormGrid>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={() => setBankOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={() => { setBankOpen(false); toast('Bank entry saved', 'success') }}>Save</Button>
        </div>
      </Modal>
    </div>
  )
}

export function DuesPage() {
  const { invoices } = useApp()
  const dues = invoices.filter((invoice) => invoice.status !== 'Paid').map((invoice) => ({
    party: invoice.party,
    bill: invoice.id,
    billAmt: invoice.total,
    paid: invoice.paid,
    due: invoice.total - invoice.paid,
  }))
  const totalDue = dues.reduce((sum, row) => sum + row.due, 0)

  return (
    <div className="animate-slide">
      <PageHeader title="Dues & Payments" sub="Bill-wise outstanding receivables and payables." />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 22 }}>
        <KpiCard label="Total Receivable" value={fmtShort(totalDue)} sub={`${dues.length} pending`} />
        <KpiCard label="Total Payable" value={fmtShort(214800)} />
        <KpiCard label="Net Position" value={fmtShort(totalDue - 214800)} />
      </div>
      <Card>
        <CardHead title="Outstanding Bills" />
        <Table cols={[
          { key: 'party', label: 'Party' },
          { key: 'bill', label: 'Bill No', mono: true, dim: true },
          { key: 'billAmt', label: 'Bill Amt', right: true, render: (value) => fmt(value) },
          { key: 'paid', label: 'Paid', right: true, render: (value) => fmt(value) },
          { key: 'due', label: 'Due', right: true, render: (value) => <strong style={{ color: 'var(--red)' }}>{fmt(value)}</strong> },
        ]}
          focusId="dues-list"
          rows={dues}
        />
      </Card>
    </div>
  )
}

export function WorkersPage() {
  const { workers, addWorker, paySalary } = useApp()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', role: '', phone: '', salary: '', join: todayISO() })
  const totalSalary = workers.reduce((sum, worker) => sum + worker.salary, 0)
  const workersGridFocus = useFocusZone({ orientation: 'grid', columns: 3 })

  const handleSave = () => {
    if (!form.name.trim()) {
      toast('Name is required', 'error')
      return
    }
    addWorker({ ...form, salary: parseFloat(form.salary) || 0, attendance: 26, days: 26 })
    toast(`${form.name} added`, 'success')
    setOpen(false)
    setForm({ name: '', role: '', phone: '', salary: '', join: todayISO() })
  }

  return (
    <div className="animate-slide">
      <PageHeader title="Workers" sub={`${workers.length} staff members with salary tracking.`} right={<Button variant="primary" onClick={() => setOpen(true)}>+ Add Worker</Button>} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 22 }}>
        <KpiCard label="Total Staff" value={workers.length} />
        <KpiCard label="Salary Payable" value={fmtShort(totalSalary)} />
        <KpiCard label="Total Advances" value={fmtShort(workers.reduce((sum, worker) => sum + (worker.advance || 0), 0))} />
        <KpiCard label="Salary Pending" value={workers.filter((worker) => !worker.paid).length} sub="workers" />
      </div>
      <div id="workers-grid" ref={workersGridFocus.ref} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {workers.map((worker, index) => (
          <Card
            key={worker.id}
            data-focus-item="true"
            tabIndex={index === 0 ? 0 : -1}
            role="button"
            aria-label={`${worker.name} worker card`}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                if (!worker.paid) {
                  paySalary(worker.id)
                  toast(`Salary paid to ${worker.name}`, 'success')
                }
              }
            }}
            style={{ cursor: worker.paid ? 'default' : 'pointer' }}
          >
            <CardBody>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar name={worker.name} size={38} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13.5 }}>{worker.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-40)' }}>{worker.role}</div>
                  </div>
                </div>
                <Badge status={worker.paid ? 'Paid' : 'Pending'} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button size="sm" variant="primary" tabIndex={-1} style={{ flex: 1, justifyContent: 'center' }} onClick={() => { paySalary(worker.id); toast(`Salary paid to ${worker.name}`, 'success') }} disabled={worker.paid}>
                  {worker.paid ? 'Paid' : 'Pay Salary'}
                </Button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Add Worker">
        <Input label="Full Name *" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
        <FormGrid cols={2}>
          <Input label="Role / Designation" value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))} />
          <Input label="Phone" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
        </FormGrid>
        <FormGrid cols={2}>
          <Input label="Monthly Salary (₹)" type="number" value={form.salary} onChange={(event) => setForm((current) => ({ ...current, salary: event.target.value }))} />
          <Input label="Join Date" type="date" value={form.join} onChange={(event) => setForm((current) => ({ ...current, join: event.target.value }))} />
        </FormGrid>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleSave}>Save Worker</Button>
        </div>
      </Modal>
    </div>
  )
}

export function ReportsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const reportsGridFocus = useKeyboardListNavigation({ orientation: 'grid' })

  useEffect(() => {
    const focusReportId = location.state?.focusReport || sessionStorage.getItem('reports-last-card')
    if (!focusReportId) return

    const index = REPORT_DEFINITIONS.findIndex((report) => report.id === focusReportId)
    requestAnimationFrame(() => {
      if (index >= 0) reportsGridFocus.focusItem(index)
      else reportsGridFocus.focusFirst()
    })

    sessionStorage.removeItem('reports-last-card')
    if (window.history.state?.usr) {
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.pathname, location.state, navigate, reportsGridFocus])

  return (
    <div className="animate-slide">
      <PageHeader title="Reports" sub="Financial reports and analytics powered by the central data layer." />
      <div id="reports-grid" className="reports-card-grid" ref={reportsGridFocus.ref}>
        {REPORT_DEFINITIONS.map((report, index) => (
          <Card
            key={report.id}
            className="focusable-card report-nav-card"
            data-focus-item="true"
            tabIndex={index === 0 ? 0 : -1}
            role="button"
            aria-label={report.name}
            onClick={() => {
              sessionStorage.setItem('reports-last-card', report.id)
              navigate(report.path, { state: { fromReports: true } })
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                sessionStorage.setItem('reports-last-card', report.id)
                navigate(report.path, { state: { fromReports: true } })
              }
            }}
            style={{ cursor: 'pointer' }}
          >
            <CardBody>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>{report.name}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-40)' }}>{report.desc}</div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  )
}

export function BackupPage() {
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [backups, setBackups] = useState(INIT_BACKUPS)

  const createBackup = () => {
    setLoading(true)
    setTimeout(() => {
      const now = new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
      setBackups((current) => [{ date: now, size: '12.5 MB', type: 'Manual', status: 'OK' }, ...current])
      setLoading(false)
      toast('Backup created successfully', 'success')
    }, 1000)
  }

  return (
    <div className="animate-slide">
      <PageHeader title="Backup" sub="Automated data backup and restore." />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <Card>
          <CardHead title="Backup Settings" />
          <CardBody style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Input label="Backup Location" defaultValue="D:\\BizLedger\\Backups\\" />
            <Select label="Auto Backup Schedule" options={['Daily at 11 PM', 'Every 12 hours', 'Manual only']} />
            <Button variant="primary" onClick={createBackup} style={{ justifyContent: 'center' }}>
              {loading ? 'Creating backup…' : 'Create Backup Now'}
            </Button>
          </CardBody>
        </Card>
        <Card>
          <CardHead title="Backup History" />
          <Table cols={[{ key: 'date', label: 'Date & Time' }, { key: 'size', label: 'Size', dim: true }, { key: 'type', label: 'Type', render: (value) => <Badge status={value} /> }, { key: 'status', label: 'Status', render: (value) => <Badge status={value === 'OK' ? 'OK' : 'Pending'}>{value}</Badge> }]} rows={backups} />
        </Card>
      </div>
    </div>
  )
}
