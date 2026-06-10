// ============================================================
// BizLedger Pro — Invoice Form Hook
// Manages line items, totals, validation
// ============================================================
import { useState, useCallback } from 'react'
import { todayISO, addDays } from '../utils/helpers.js'

const EMPTY_ITEM = { desc: '', qty: 1, rate: 0, amount: 0 }

const INITIAL_FORM = {
  party:    '',
  phone:    '',
  city:     '',
  gstin:    '',
  date:     todayISO(),
  dueDate:  addDays(todayISO(), 30),
  notes:    '',
  taxPct:   0,
}

export default function useInvoiceForm() {
  const [form,  setForm]  = useState(INITIAL_FORM)
  const [items, setItems] = useState([{ ...EMPTY_ITEM }])
  const [errors, setErrors] = useState({})

  /* ── Form field setters ───────────────────────────────── */
  const setField = useCallback((key, value) => {
    setForm(f => ({ ...f, [key]: value }))
    setErrors(e => ({ ...e, [key]: undefined }))
  }, [])

  /* ── Item setters ─────────────────────────────────────── */
  const setItemField = useCallback((index, key, value) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== index) return item
      const updated = { ...item, [key]: value }
      if (key === 'qty' || key === 'rate') {
        updated.amount = Number(updated.qty) * Number(updated.rate)
      }
      return updated
    }))
  }, [])

  const addItem = useCallback(() => {
    setItems(prev => [...prev, { ...EMPTY_ITEM }])
  }, [])

  const removeItem = useCallback((index) => {
    setItems(prev => prev.filter((_, i) => i !== index))
  }, [])

  /* ── Computed totals ──────────────────────────────────── */
  const subtotal = items.reduce((acc, it) => acc + (Number(it.amount) || 0), 0)
  const tax      = Math.round(subtotal * (Number(form.taxPct) || 0) / 100)
  const total    = subtotal + tax

  /* ── Validation ───────────────────────────────────────── */
  const validate = useCallback(() => {
    const errs = {}
    if (!form.party.trim()) errs.party = 'Party is required'
    if (items.every(it => !it.desc.trim())) errs.items = 'Add at least one item'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }, [form, items])

  /* ── Reset ────────────────────────────────────────────── */
  const reset = useCallback(() => {
    setForm(INITIAL_FORM)
    setItems([{ ...EMPTY_ITEM }])
    setErrors({})
  }, [])

  /* ── Auto-fill party data ─────────────────────────────── */
  const fillParty = useCallback((party) => {
    setForm(f => ({
      ...f,
      party:  party.name  || '',
      phone:  party.phone || '',
      city:   party.city  || '',
      gstin:  party.gstin || '',
    }))
  }, [])

  return {
    form, items, errors,
    subtotal, tax, total,
    setField, setItemField,
    addItem, removeItem,
    validate, reset, fillParty,
  }
}
