import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import useKeyboard from '../hooks/useKeyboard.js'
import Button from '../components/ui/Button.jsx'
import { CheckboxField, FieldRow, FormGrid, Input, Select, Textarea } from './PartyFormParts.jsx'
import { scrollElementIntoView } from '../utils/focusScroll.js'

const PARTY_TYPES = ['Customer', 'Supplier', 'Distributor', 'Carrier', 'Agent']
const ACCOUNT_GROUPS = ['Sundry Debtors', 'Sundry Creditors', 'Distributors', 'Transporters', 'Commission Agents']
const PAYMENT_TERMS = ['Net 7', 'Net 15', 'Net 30', 'Net 45', 'COD', 'Advance']
const CURRENCIES = ['INR', 'USD', 'EUR', 'AED']
const SHIPPING_METHODS = ['Road', 'Air', 'Rail', 'Courier', 'Local Delivery', 'Pickup']
const DELIVERY_SLOTS = ['09:00 - 13:00', '13:00 - 17:00', '17:00 - 21:00']
const STATUS_OPTIONS = ['Active', 'Blocked', 'Archived']

export default function PartyFormPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { parties, addParty, updateParty } = useApp()
  const toast = useToast()
  const editingId = location.state?.partyId ?? null
  const editingParty = useMemo(
    () => parties.find((party) => party.id === editingId) ?? null,
    [editingId, parties],
  )
  const [form, setForm] = useState(() => createInitialForm(editingParty))
  const [errors, setErrors] = useState({})
  const crmScrollRef = useRef(null)

  useEffect(() => {
    setForm(createInitialForm(editingParty))
    setErrors({})
  }, [editingParty])

  useEffect(() => {
    document.body.classList.add('workspace-scroll-lock')
    return () => document.body.classList.remove('workspace-scroll-lock')
  }, [])

  const setField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  const setAddress = (kind, key, value) => {
    setForm((current) => ({
      ...current,
      [kind]: {
        ...current[kind],
        [key]: value,
      },
    }))
  }

  const setShippingAddress = (index, key, value) => {
    setForm((current) => ({
      ...current,
      shippingAddresses: current.shippingAddresses.map((address, addressIndex) => (
        addressIndex === index ? { ...address, [key]: value } : address
      )),
    }))
  }

  const addShippingAddress = () => {
    setForm((current) => ({
      ...current,
      shippingAddresses: [...current.shippingAddresses, emptyShippingAddress()],
    }))
  }

  const removeShippingAddress = (index) => {
    setForm((current) => ({
      ...current,
      shippingAddresses: current.shippingAddresses.filter((_, addressIndex) => addressIndex !== index),
    }))
  }

  const toggleListValue = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: current[key].includes(value)
        ? current[key].filter((entry) => entry !== value)
        : [...current[key], value],
    }))
  }

  const submitParty = () => {
    const nextErrors = {}
    if (!form.companyName.trim()) nextErrors.companyName = 'Company or party name is required'
    if (!form.partyCode.trim()) nextErrors.partyCode = 'Party code is required'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return false

    const payload = {
      name: form.companyName.trim(),
      type: form.partyType,
      phone: form.phone,
      city: form.billingAddress.city,
      gstin: form.taxId,
      companyName: form.companyName.trim(),
      partyCode: form.partyCode.trim(),
      accountGroup: form.accountGroup,
      logo: form.logo,
      contactPerson: form.primaryContactName,
      primaryContactName: form.primaryContactName,
      contactRole: form.primaryContactRole,
      email: form.email,
      website: form.website,
      taxId: form.taxId,
      paymentTerms: form.paymentTerms,
      creditLimit: Number(form.creditLimit) || 0,
      discountStructure: form.discountStructure,
      currency: form.currency,
      bankDetails: {
        ifsc: form.ifsc,
        accountNo: form.accountNo,
        bankName: form.bankName,
      },
      billingAddress: form.billingAddress,
      shippingAddresses: form.shippingAddresses.filter((address) => Object.values(address).some(Boolean)),
      location: {
        latitude: form.latitude,
        longitude: form.longitude,
      },
      partnerRoles: form.partnerRoles,
      shippingMethods: form.shippingMethods,
      workingHours: form.workingHours,
      deliverySlots: form.deliverySlots,
      status: form.status,
      carrierInfo: form.carrierInfo,
      supplierDetails: form.supplierDetails,
      relatedParties: form.relatedParties,
      notes: form.notes,
      balance: Number(form.openingBalance) || 0,
    }

    if (editingParty) {
      updateParty(editingParty.id, payload)
      toast(`${payload.name} updated successfully`, 'success')
    } else {
      addParty(payload)
      toast(`${payload.name} added successfully`, 'success')
    }

    navigate('/parties')
    return true
  }

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.ctrlKey && event.key === 'Enter') {
        event.preventDefault()
        event.stopPropagation()
        submitParty()
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  })

  useEffect(() => {
    requestAnimationFrame(() => {
      const el = document.querySelector('[data-page-focus="party-company"]')
      if (el instanceof HTMLElement) el.focus({ preventScroll: true })
    })
  }, [editingParty])

  useKeyboard({
    bindings: [{ id: 'saveRecord', allowInEditable: true, handler: submitParty }],
  })

  useEffect(() => {
    const root = crmScrollRef.current
    if (!root || typeof root.querySelectorAll !== 'function') return undefined

    const selector = '.erp-crm-card input:not([disabled]):not([type="hidden"]), .erp-crm-card select:not([disabled]), .erp-crm-card textarea:not([disabled])'

    const focusField = (el) => {
      if (!(el instanceof HTMLElement)) return
      try {
        el.focus({ preventScroll: true })
        scrollElementIntoView(el, { behavior: 'auto' })
      } catch {
        /* noop */
      }
    }

    const getOrderedFields = () => {
      try {
        return Array.from(root.querySelectorAll(selector)).filter(
          (el) => el instanceof HTMLElement && typeof el.focus === 'function',
        )
      } catch {
        return []
      }
    }

    const shell = () => root.closest('.erp-workspace-shell--crm')
    const getSubmitControl = () => {
      const btn = shell()?.querySelector('button[data-party-submit="true"]')
      return btn instanceof HTMLElement ? btn : null
    }
    const getCancelControl = () => {
      const actions = shell()?.querySelector('.erp-crm-footer-actions')
      const btn = actions?.querySelector('button')
      return btn instanceof HTMLElement ? btn : null
    }

    const onKeyDownCapture = (event) => {
      const target = event.target
      if (!(target instanceof HTMLElement)) return

      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        const fields = getOrderedFields()
        const ix = fields.indexOf(target)
        const last = Math.max(fields.length - 1, 0)

        if (!fields.length || ix === -1) return
        if (target.tagName !== 'INPUT' || target.type === 'number' || target.type === 'date' || target.type === 'range') return
        if ((target.selectionStart ?? 0) !== (target.selectionEnd ?? 0)) return

        let nextIndex = ix
        if (event.key === 'ArrowDown' && ix < last) nextIndex = ix + 1
        if (event.key === 'ArrowUp' && ix > 0) nextIndex = ix - 1
        if (nextIndex !== ix) {
          event.preventDefault()
          focusField(fields[nextIndex])
        }
        return
      }

      if (event.key !== 'Enter' || event.repeat) return
      if (event.ctrlKey || event.metaKey || event.altKey) return

      const fields = getOrderedFields()
      const ix = fields.indexOf(target)
      if (ix === -1) return

      const backward = event.shiftKey
      const submitEl = getSubmitControl()
      const last = Math.max(fields.length - 1, 0)

      event.preventDefault()

      if (backward) {
        if (ix <= 0) {
          focusField(getCancelControl())
          return
        }
        focusField(fields[ix - 1])
        return
      }

      if (ix >= last) {
        focusField(submitEl)
        return
      }

      focusField(fields[ix + 1])
    }

    root.addEventListener('keydown', onKeyDownCapture, true)
    return () => root.removeEventListener('keydown', onKeyDownCapture, true)
  }, [editingParty, form.shippingAddresses.length])

  return (
    <div className="erp-workspace-shell erp-workspace-shell--crm">
      <div className="erp-crm-scroll" ref={crmScrollRef}>
        <header className="erp-crm-hero">
          <h1>{editingParty ? 'Customer / Vendor profile' : 'New customer / business record'}</h1>
          <p>
            A calmer CRM-style workspace for party master data. Billing screens stay dense; here you capture relationships,
            GST, contacts, and sites with clearer grouping. Ctrl + Enter (or Ctrl + S where configured) saves and returns to the directory.
          </p>
          <div className="erp-crm-statusbar">
            <div><span>Relationship type</span><strong>{form.partyType}</strong></div>
            <div><span>Lifecycle status</span><strong>{form.status}</strong></div>
            <div><span>Active ship-to sites</span><strong>{form.shippingAddresses.filter((address) => Object.values(address).some(Boolean)).length}</strong></div>
          </div>
        </header>

        <section className="erp-crm-card" aria-labelledby="crm-basic-title">
          <div className="erp-crm-card-title" id="crm-basic-title">Basic party details</div>
          <FormGrid cols={2}>
            <Select data-page-focus="party-company" label="Party type" value={form.partyType} onChange={(event) => setField('partyType', event.target.value)} options={PARTY_TYPES} selectClassName="erp-field" />
            <Select label="Account group" value={form.accountGroup} onChange={(event) => setField('accountGroup', event.target.value)} options={ACCOUNT_GROUPS} selectClassName="erp-field" />
          </FormGrid>
          <FormGrid cols={2}>
            <Input  label="Party / Company name *" value={form.companyName} onChange={(event) => setField('companyName', event.target.value)} error={errors.companyName} inputClassName="erp-field" />
            <Input label="Party code *" value={form.partyCode} onChange={(event) => setField('partyCode', event.target.value.toUpperCase())} error={errors.partyCode} inputClassName="erp-field" />
          </FormGrid>
          <FormGrid cols={2}>
            <Input label="Related parties" value={form.relatedParties} onChange={(event) => setField('relatedParties', event.target.value)} inputClassName="erp-field" placeholder="Partners, subsidiaries, aliases" />
            <Input label="Logo / attachment ref." value={form.logo} onChange={(event) => setField('logo', event.target.value)} inputClassName="erp-field" />
          </FormGrid>
        </section>

        <section className="erp-crm-card" aria-labelledby="crm-gst-title">
          <div className="erp-crm-card-title" id="crm-gst-title">GST registration</div>
          <Input label="GSTIN / Tax ID" value={form.taxId} onChange={(event) => setField('taxId', event.target.value.toUpperCase())} inputClassName="erp-field" placeholder="15-character GSTIN" />
        </section>

        <section className="erp-crm-card" aria-labelledby="crm-contact-title">
          <div className="erp-crm-card-title" id="crm-contact-title">Contact details</div>
          <FormGrid cols={3}>
            <Input label="Primary contact" value={form.primaryContactName} onChange={(event) => setField('primaryContactName', event.target.value)} inputClassName="erp-field" />
            <Input label="Role / designation" value={form.primaryContactRole} onChange={(event) => setField('primaryContactRole', event.target.value)} inputClassName="erp-field" />
            <Input label="Phone" value={form.phone} onChange={(event) => setField('phone', event.target.value)} inputClassName="erp-field" />
          </FormGrid>
          <FormGrid cols={2}>
            <Input label="Email" type="email" value={form.email} onChange={(event) => setField('email', event.target.value)} inputClassName="erp-field" />
            <Input label="Website" value={form.website} onChange={(event) => setField('website', event.target.value)} inputClassName="erp-field" />
          </FormGrid>
        </section>

        <section className="erp-crm-card" aria-labelledby="crm-address-title">
          <div className="erp-crm-card-title" id="crm-address-title">Registered address</div>
          <Textarea label="Street & locality" rows={3} value={form.billingAddress.addressLine1} onChange={(event) => setAddress('billingAddress', 'addressLine1', event.target.value)} textareaClassName="erp-field erp-field--textarea" />
          <FormGrid cols={4}>
            <Input label="City" value={form.billingAddress.city} onChange={(event) => setAddress('billingAddress', 'city', event.target.value)} inputClassName="erp-field" />
            <Input label="State" value={form.billingAddress.state} onChange={(event) => setAddress('billingAddress', 'state', event.target.value)} inputClassName="erp-field" />
            <Input label="Postal code" value={form.billingAddress.postalCode} onChange={(event) => setAddress('billingAddress', 'postalCode', event.target.value)} inputClassName="erp-field" />
            <Input label="Country" value={form.billingAddress.country} onChange={(event) => setAddress('billingAddress', 'country', event.target.value)} inputClassName="erp-field" />
          </FormGrid>

          <div style={{ marginTop: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div className="erp-crm-card-title" style={{ marginBottom: 0, borderBottom: 'none', paddingBottom: 0 }}>Alternate ship-to addresses</div>
            <Button variant="ghost" size="sm" onClick={addShippingAddress} style={CRM_GHOST_BTN}>Add site</Button>
          </div>
          <div className="erp-party-shiplist" style={{ marginTop: 12 }}>
            {form.shippingAddresses.map((address, index) => (
              <div key={index} className="crm-ship-card">
                <FieldRow label={`Ship-to ${index + 1}`} action={form.shippingAddresses.length > 1 ? <Button variant="ghost" size="sm" onClick={() => removeShippingAddress(index)} style={CRM_GHOST_BTN}>Remove</Button> : null} />
                <Textarea label="Street" rows={2} value={address.addressLine1} onChange={(event) => setShippingAddress(index, 'addressLine1', event.target.value)} textareaClassName="erp-field erp-field--textarea" />
                <FormGrid cols={4}>
                  <Input label="City" value={address.city} onChange={(event) => setShippingAddress(index, 'city', event.target.value)} inputClassName="erp-field" />
                  <Input label="State" value={address.state} onChange={(event) => setShippingAddress(index, 'state', event.target.value)} inputClassName="erp-field" />
                  <Input label="Postal code" value={address.postalCode} onChange={(event) => setShippingAddress(index, 'postalCode', event.target.value)} inputClassName="erp-field" />
                  <Input label="Country" value={address.country} onChange={(event) => setShippingAddress(index, 'country', event.target.value)} inputClassName="erp-field" />
                </FormGrid>
              </div>
            ))}
          </div>
        </section>

        <section className="erp-crm-card" aria-labelledby="crm-commercial-title">
          <div className="erp-crm-card-title" id="crm-commercial-title">Commercial & logistics</div>
          <FormGrid cols={4}>
            <Select label="Payment terms" value={form.paymentTerms} onChange={(event) => setField('paymentTerms', event.target.value)} options={PAYMENT_TERMS} selectClassName="erp-field" />
            <Input label="Credit limit" type="number" value={form.creditLimit} onChange={(event) => setField('creditLimit', event.target.value)} inputClassName="erp-field" />
            <Input label="Discount notes" value={form.discountStructure} onChange={(event) => setField('discountStructure', event.target.value)} inputClassName="erp-field" />
            <Select label="Billing currency" value={form.currency} onChange={(event) => setField('currency', event.target.value)} options={CURRENCIES} selectClassName="erp-field" />
          </FormGrid>
          <FormGrid cols={3}>
            <Input label="Bank name" value={form.bankName} onChange={(event) => setField('bankName', event.target.value)} inputClassName="erp-field" />
            <Input label="IFSC" value={form.ifsc} onChange={(event) => setField('ifsc', event.target.value.toUpperCase())} inputClassName="erp-field" />
            <Input label="Account number" value={form.accountNo} onChange={(event) => setField('accountNo', event.target.value)} inputClassName="erp-field" />
          </FormGrid>
          <CheckboxField soft label="Partner roles" values={['Sold-To', 'Ship-To', 'Bill-To', 'Payer']} selected={form.partnerRoles} onToggle={(value) => toggleListValue('partnerRoles', value)} />
          <CheckboxField soft label="Shipping methods" values={SHIPPING_METHODS} selected={form.shippingMethods} onToggle={(value) => toggleListValue('shippingMethods', value)} />
          <FormGrid cols={3}>
            <Input label="Working hours" value={form.workingHours} onChange={(event) => setField('workingHours', event.target.value)} inputClassName="erp-field" />
            <Select label="Preferred delivery window" value={form.deliverySlots} onChange={(event) => setField('deliverySlots', event.target.value)} options={DELIVERY_SLOTS} selectClassName="erp-field" />
            <Select label="Record status" value={form.status} onChange={(event) => setField('status', event.target.value)} options={STATUS_OPTIONS} selectClassName="erp-field" />
          </FormGrid>
          <FormGrid cols={2}>
            <Input label="Latitude" value={form.latitude} onChange={(event) => setField('latitude', event.target.value)} inputClassName="erp-field" />
            <Input label="Longitude" value={form.longitude} onChange={(event) => setField('longitude', event.target.value)} inputClassName="erp-field" />
          </FormGrid>
        </section>

        <section className="erp-crm-card" aria-labelledby="crm-notes-title">
          <div className="erp-crm-card-title" id="crm-notes-title">Notes & opening balance</div>
          <FormGrid cols={2}>
            <Input label="Opening balance (INR)" type="number" value={form.openingBalance} onChange={(event) => setField('openingBalance', event.target.value)} inputClassName="erp-field" placeholder="0 when starting fresh ledgers" />
            <div />
          </FormGrid>
          <Textarea label="Internal remarks" rows={3} value={form.notes} onChange={(event) => setField('notes', event.target.value)} textareaClassName="erp-field erp-field--textarea" />
          <FormGrid cols={2}>
            <Textarea label="Carrier / transporter notes" rows={3} value={form.carrierInfo} onChange={(event) => setField('carrierInfo', event.target.value)} textareaClassName="erp-field erp-field--textarea" />
            <Textarea label="Supplier / procurement notes" rows={3} value={form.supplierDetails} onChange={(event) => setField('supplierDetails', event.target.value)} textareaClassName="erp-field erp-field--textarea" />
          </FormGrid>
        </section>
      </div>

      <footer className="erp-crm-footer">
        <div className="erp-crm-footer-hint">Escape returns to where you navigated from (or back stack). Ctrl + Enter saves without leaving the keyboard.</div>
        <div className="erp-crm-footer-actions">
          <Button type="button" variant="ghost" size="sm" onClick={() => navigate('/parties')} style={CRM_GHOST_BTN}>Cancel</Button>
          <Button type="button" variant="primary" size="sm" data-party-submit="true" onClick={submitParty} style={CRM_PRIMARY_BUTTON}>{editingParty ? 'Save changes' : 'Create party'}</Button>
        </div>
      </footer>
    </div>
  )
}

function emptyShippingAddress() {
  return { addressLine1: '', city: '', state: '', postalCode: '', country: 'India' }
}

function createInitialForm(party) {
  return {
    partyType: party?.type || 'Customer',
    companyName: party?.companyName || party?.name || '',
    partyCode: party?.partyCode || '',
    accountGroup: party?.accountGroup || 'Sundry Debtors',
    logo: party?.logo || '',
    primaryContactName: party?.primaryContactName || party?.contactPerson || '',
    primaryContactRole: party?.contactRole || '',
    email: party?.email || '',
    phone: party?.phone || '',
    website: party?.website || '',
    taxId: party?.taxId || party?.gstin || '',
    billingAddress: {
      addressLine1: party?.billingAddress?.addressLine1 || '',
      city: party?.billingAddress?.city || party?.city || '',
      state: party?.billingAddress?.state || '',
      postalCode: party?.billingAddress?.postalCode || '',
      country: party?.billingAddress?.country || 'India',
    },
    shippingAddresses: party?.shippingAddresses?.length ? party.shippingAddresses : [emptyShippingAddress()],
    latitude: party?.location?.latitude || '',
    longitude: party?.location?.longitude || '',
    paymentTerms: party?.paymentTerms || 'Net 30',
    creditLimit: String(party?.creditLimit || ''),
    discountStructure: party?.discountStructure || '',
    currency: party?.currency || 'INR',
    bankName: party?.bankDetails?.bankName || '',
    ifsc: party?.bankDetails?.ifsc || '',
    accountNo: party?.bankDetails?.accountNo || '',
    partnerRoles: party?.partnerRoles || ['Sold-To', 'Bill-To'],
    shippingMethods: party?.shippingMethods || ['Road'],
    workingHours: party?.workingHours || '09:00 - 18:00',
    deliverySlots: party?.deliverySlots || '09:00 - 13:00',
    status: party?.status || 'Active',
    carrierInfo: party?.carrierInfo || '',
    supplierDetails: party?.supplierDetails || '',
    relatedParties: party?.relatedParties || '',
    notes: party?.notes || '',
    openingBalance: party?.balance !== undefined && party?.balance !== null ? String(party.balance) : '',
  }
}

const CRM_GHOST_BTN = {
  minHeight: 36,
  borderRadius: 8,
  boxShadow: 'none',
  fontWeight: 600,
}

const CRM_PRIMARY_BUTTON = {
  ...CRM_GHOST_BTN,
  background: '#2f4a62',
}
