import React, { useRef, useState } from 'react'
import { useApp }      from '../context/AppContext.jsx'
import { useToast }    from '../context/ToastContext.jsx'
import { fmt, fmtShort, todayISO } from '../utils/helpers.js'
import {
  KpiCard, PageHeader, Card, CardHead,
} from '../components/ui/index.js'
import { Avatar, Badge }    from '../components/ui/index.js'
import { SearchInput, FilterPills } from '../components/ui/index.js'
import { Input, Select, FormGrid, Textarea } from '../components/ui/index.js'
import Table       from '../components/ui/Table.jsx'
import Modal       from '../components/ui/Modal.jsx'
import Button      from '../components/ui/Button.jsx'
import PurchaseInvoiceView from '../components/layout/PurchaseInvoiceView.jsx'
import useAutocomplete from '../hooks/useAutocomplete.js'
import useKeyboard from '../hooks/useKeyboard.js'
import ErpImportModal from '../components/import/ErpImportModal.jsx'

const FILTERS = ['All', 'Paid', 'Partial', 'Pending']
const CELL_INPUT = {
  width: '100%',
  border: '1px solid var(--border)',
  borderRadius: 4,
  padding: '6px 8px',
  outline: 'none',
  background: 'var(--surface)',
}

export default function PurchasePage({ onNewPurchase }) {
  const { purchases, addPurchase, parties } = useApp()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
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
      <ErpImportModal open={importOpen} onClose={() => setImportOpen(false)} defaultKind="purchases" />

      <PageHeader
        title="Purchase"
        sub="Keyboard-first purchase entry aligned with the invoice workflow."
        right={(
          <>
            <Button variant="ghost" onClick={() => setImportOpen(true)}>Import</Button>
            <Button variant="primary" onClick={onNewPurchase}>+ New Purchase</Button>
          </>
        )}
      />
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
