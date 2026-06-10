import React, { useEffect, useMemo, useRef, useState } from 'react'
import Modal from '../ui/Modal.jsx'
import Button from '../ui/Button.jsx'
import { FormGrid, Input, Textarea } from '../ui/Form.jsx'
import { addDays, fmt, todayISO } from '../../utils/helpers.js'
import useAutocomplete from '../../hooks/useAutocomplete.js'
import useKeyboard from '../../hooks/useKeyboard.js'

const emptyItem = () => ({ desc: '', qty: '1', rate: '0', amount: 0 })

export default function NewInvoiceModal({ open, onClose, onSave, parties = [], shortcuts }) {
  const [form, setForm] = useState(initialForm())
  const [items, setItems] = useState([emptyItem()])
  const [errors, setErrors] = useState({})
  const dateRef = useRef(null)
  const partyRef = useRef(null)
  const taxRef = useRef(null)
  const rowRefs = useRef([])

  const customerParties = useMemo(() => parties.filter((party) => party.type !== 'Supplier'), [parties])
  const { isOpen, setOpen, suggestions, highlightedIndex, setHighlightedIndex, handleKeyDown } = useAutocomplete({
    items: customerParties,
    value: form.party,
    getLabel: (party) => party.name,
  })

  const subtotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
  const tax = Math.round(subtotal * (Number(form.taxPct) || 0) / 100)
  const total = subtotal + tax

  useEffect(() => {
    if (!open) return
    setForm(initialForm())
    setItems([emptyItem()])
    setErrors({})
    requestAnimationFrame(() => dateRef.current?.focus({ preventScroll: true }))
  }, [open])

  const setField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  const updateItem = (index, key, value) => {
    setItems((current) => current.map((item, itemIndex) => {
      if (itemIndex !== index) return item
      const next = { ...item, [key]: value }
      next.amount = (Number(next.qty) || 0) * (Number(next.rate) || 0)
      return next
    }))
  }

  const focusCell = (index, field) => {
    requestAnimationFrame(() => rowRefs.current[index]?.[field]?.focus({ preventScroll: true }))
  }

  const appendRow = () => {
    setItems((current) => [...current, emptyItem()])
    requestAnimationFrame(() => focusCell(items.length, 'desc'))
  }

  const applyParty = (party) => {
    setForm((current) => ({
      ...current,
      party: party.name,
      phone: party.phone || '',
      city: party.city || '',
      gstin: party.gstin || '',
    }))
    setOpen(false)
    requestAnimationFrame(() => focusCell(0, 'desc'))
  }

  const saveInvoice = () => {
    const nextErrors = {}
    if (!form.party.trim()) nextErrors.party = 'Party is required'
    if (!items.some((item) => item.desc.trim())) nextErrors.items = 'Add at least one item'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    onSave({
      ...form,
      items: items.filter((item) => item.desc.trim()).map((item) => ({
        ...item,
        qty: Number(item.qty) || 0,
        rate: Number(item.rate) || 0,
        amount: Number(item.amount) || 0,
      })),
      subtotal,
      tax,
      total,
    })
    onClose()
  }

  useKeyboard({
    enabled: open,
    shortcuts,
    bindings: [
      { id: 'saveRecord', allowInEditable: true, handler: saveInvoice },
    ],
  })

  return (
    <Modal open={open} onClose={onClose} title="New Sales Invoice" width={820}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '12px 14px' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>Keyboard-first invoice flow</div>
          <div style={{ fontSize: 12, color: 'var(--ink-40)' }}>Date → Party → Items → Save. Ctrl+S saves without stealing focus.</div>
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--ink-40)', fontFamily: 'var(--mono)' }}>Print mode can use full party details</div>
      </div>

      <FormGrid cols={2}>
        <Input
          ref={dateRef}
          label="Invoice Date"
          type="date"
          value={form.date}
          onChange={(event) => setField('date', event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              partyRef.current?.focus({ preventScroll: true })
            }
          }}
        />
        <Input label="Due Date" type="date" value={form.dueDate} onChange={(event) => setField('dueDate', event.target.value)} />
      </FormGrid>

      <div style={{ position: 'relative' }}>
        <Input
          ref={partyRef}
          label="Party / Customer *"
          value={form.party}
          onFocus={() => setOpen(true)}
          onChange={(event) => { setField('party', event.target.value); setOpen(true) }}
          onKeyDown={(event) => {
            if (handleKeyDown(event, applyParty)) return
            if (event.key === 'Enter') {
              event.preventDefault()
              const exact = customerParties.find((party) => party.name.toLowerCase() === form.party.toLowerCase())
              if (exact) applyParty(exact)
              else focusCell(0, 'desc')
            }
          }}
          error={errors.party}
          placeholder="Type customer name"
        />
        {isOpen && suggestions.length > 0 && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', boxShadow: 'var(--shadow-sm)', marginTop: 4 }}>
            {suggestions.map((party, index) => (
              <button
                key={party.id}
                onMouseDown={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  applyParty(party)
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
                style={{ width: '100%', padding: '9px 12px', border: 'none', background: highlightedIndex === index ? 'var(--surface-2)' : 'transparent', textAlign: 'left', cursor: 'pointer' }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{party.name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-40)' }}>{party.city} · {party.phone}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      <FormGrid cols={3}>
        <Input label="Phone" value={form.phone} onChange={(event) => setField('phone', event.target.value)} />
        <Input label="City" value={form.city} onChange={(event) => setField('city', event.target.value)} />
        <Input label="GSTIN" value={form.gstin} onChange={(event) => setField('gstin', event.target.value)} />
      </FormGrid>

      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-40)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>
          Line Items {errors.items && <span style={{ color: 'var(--red)', marginLeft: 6 }}>{errors.items}</span>}
        </div>
        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 120px 120px 40px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', padding: '7px 10px', gap: 8 }}>
            {['Description', 'Qty', 'Rate', 'Amount', ''].map((label) => (
              <div key={label} style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-40)' }}>{label}</div>
            ))}
          </div>
          {items.map((item, index) => (
            <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 120px 120px 40px', gap: 8, padding: '6px 10px', borderBottom: index < items.length - 1 ? '1px solid var(--border)' : 'none', alignItems: 'center' }}>
              <input
                ref={(node) => {
                  rowRefs.current[index] = rowRefs.current[index] ?? {}
                  rowRefs.current[index].desc = node
                }}
                value={item.desc}
                onChange={(event) => updateItem(index, 'desc', event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    focusCell(index, 'qty')
                  }
                }}
                placeholder="Item description"
                style={CELL_INPUT}
              />
              <input
                ref={(node) => {
                  rowRefs.current[index] = rowRefs.current[index] ?? {}
                  rowRefs.current[index].qty = node
                }}
                type="number"
                min="0"
                value={item.qty}
                onChange={(event) => updateItem(index, 'qty', event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    focusCell(index, 'rate')
                  }
                }}
                style={{ ...CELL_INPUT, textAlign: 'right', fontFamily: 'var(--mono)' }}
              />
              <input
                ref={(node) => {
                  rowRefs.current[index] = rowRefs.current[index] ?? {}
                  rowRefs.current[index].rate = node
                }}
                type="number"
                min="0"
                value={item.rate}
                onChange={(event) => updateItem(index, 'rate', event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    if (index === items.length - 1) appendRow()
                    else focusCell(index + 1, 'desc')
                  }
                }}
                style={{ ...CELL_INPUT, textAlign: 'right', fontFamily: 'var(--mono)' }}
              />
              <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--mono)' }}>
                {fmt(item.amount || 0)}
              </div>
              <button
                onMouseDown={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                }}
                onClick={() => {
                  if (items.length === 1) return
                  setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))
                  requestAnimationFrame(() => focusCell(Math.max(index - 1, 0), 'desc'))
                }}
                disabled={items.length === 1}
                style={{ background: 'none', border: 'none', color: 'var(--ink-20)', cursor: items.length > 1 ? 'pointer' : 'not-allowed', fontSize: 18 }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button
          onMouseDown={(event) => {
            event.preventDefault()
            event.stopPropagation()
          }}
          onClick={appendRow}
          style={{ marginTop: 8, width: '100%', fontSize: 12, color: 'var(--ink-60)', background: 'none', border: '1px dashed var(--border-2)', borderRadius: 'var(--r-sm)', padding: '8px 14px', cursor: 'pointer', fontFamily: 'var(--font)' }}
        >
          + Add Line Item
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: 16 }}>
        <Textarea label="Notes" value={form.notes} onChange={(event) => setField('notes', event.target.value)} rows={3} placeholder="Shown only when printing or reviewing" />
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SummaryRow label="Subtotal" value={fmt(subtotal)} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12.5, color: 'var(--ink-40)' }}>Tax %</span>
            <input
              ref={taxRef}
              type="number"
              min="0"
              max="100"
              value={form.taxPct}
              onChange={(event) => setField('taxPct', event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  saveInvoice()
                }
              }}
              style={{ width: 64, border: '1px solid var(--border-2)', borderRadius: 4, padding: '3px 6px', fontSize: 12, textAlign: 'right', fontFamily: 'var(--mono)', outline: 'none' }}
            />
          </div>
          <SummaryRow label="Tax" value={fmt(tax)} />
          <div style={{ borderTop: '1px solid var(--border-2)', paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>Total</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--mono)' }}>{fmt(total)}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={saveInvoice}>Create Invoice</Button>
      </div>
    </Modal>
  )
}

function initialForm() {
  const date = todayISO()
  return {
    party: '',
    phone: '',
    city: '',
    gstin: '',
    date,
    dueDate: addDays(date, 30),
    notes: '',
    taxPct: 0,
  }
}

const CELL_INPUT = {
  width: '100%',
  border: '1px solid var(--border)',
  borderRadius: 3,
  padding: '5px 8px',
  fontSize: 12.5,
  fontFamily: 'var(--font)',
  outline: 'none',
  color: 'var(--ink)',
  background: 'var(--surface)',
}

function SummaryRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 12.5, color: 'var(--ink-40)' }}>{label}</span>
      <span style={{ fontSize: 12.5, fontFamily: 'var(--mono)', color: 'var(--ink)' }}>{value}</span>
    </div>
  )
}
