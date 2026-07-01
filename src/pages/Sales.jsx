// ============================================================
// BizLedger Pro — Sales Page
// Full invoice management: create, pay, view, filter, sort
// ============================================================
import React, { useState } from 'react'
import { useApp }      from '../context/AppContext.jsx'
import { useToast }    from '../context/ToastContext.jsx'
import { fmt, fmtShort } from '../utils/helpers.js'
import {
  KpiCard, PageHeader, Card, CardHead,
} from '../components/ui/index.js'
import { Avatar, Badge }    from '../components/ui/index.js'
import { SearchInput, FilterPills } from '../components/ui/index.js'
import { Input, Select, FormGrid } from '../components/ui/index.js'
import Table       from '../components/ui/Table.jsx'
import Modal       from '../components/ui/Modal.jsx'
import Button      from '../components/ui/Button.jsx'
import InvoiceView from '../components/layout/InvoiceView.jsx'
import ErpImportModal from '../components/import/ErpImportModal.jsx'

const FILTERS = ['All', 'Paid', 'Partial', 'Pending']

export default function SalesPage({ onNewInvoice }) {
  const { invoices, recordPayment } = useApp()
  const toast = useToast()

  const [search,      setSearch]      = useState('')
  const [filter,      setFilter]      = useState('All')
  const [viewInvoice, setViewInvoice] = useState(null)
  const [importOpen,  setImportOpen]  = useState(false)
  const [payModal,    setPayModal]    = useState(null)   // invoice to pay
  const [payAmt,      setPayAmt]      = useState('')
  const [payMode,     setPayMode]     = useState('Cash')

  /* Derived data */
  const filtered = invoices.filter(r => {
    const q = search.toLowerCase()
    const matchQ = r.party.toLowerCase().includes(q) || r.id.toLowerCase().includes(q)
    const matchF = filter === 'All' || r.status === filter
    return matchQ && matchF
  })

  const totalBilled  = invoices.reduce((a, b) => a + b.total, 0)
  const totalPaid    = invoices.reduce((a, b) => a + b.paid,  0)
  const outstanding  = totalBilled - totalPaid
  const overdueCount = invoices.filter(i => i.status === 'Pending').length

  /* Handle payment recording */
  const handlePay = () => {
    const amt = parseFloat(payAmt)
    if (!payAmt || isNaN(amt) || amt <= 0) {
      toast('Enter a valid amount', 'error')
      return
    }
    const bal = payModal.total - payModal.paid
    if (amt > bal) {
      toast(`Amount cannot exceed balance (${fmt(bal)})`, 'error')
      return
    }
    recordPayment(payModal.id, amt, payMode)
    toast(`Payment of ${fmt(amt)} recorded via ${payMode}`, 'success')
    setPayModal(null)
    setPayAmt('')
  }

  /* Table columns */
  const cols = [
    {
      key: 'id', label: 'Invoice #', mono: true,
      render: v => (
        <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-40)' }}>{v}</span>
      ),
    },
    {
      key: 'party', label: 'Party',
      render: v => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar name={v} size={26} />
          <span style={{ fontWeight: 500 }}>{v}</span>
        </div>
      ),
    },
    { key: 'date',  label: 'Date',     dim: true },
    {
      key: 'total', label: 'Amount',   right: true,
      render: v => <span style={{ fontWeight: 600 }}>{fmt(v)}</span>,
    },
    {
      key: 'paid',  label: 'Received', right: true,
      render: v => (
        <span style={{ color: 'var(--green)', fontWeight: 500 }}>{fmt(v)}</span>
      ),
    },
    {
      key: '_bal',  label: 'Balance',  right: true, sortable: false,
      render: (_, row) => {
        const b = row.total - row.paid
        return (
          <span style={{ fontWeight: 700, color: b > 0 ? 'var(--red)' : 'var(--ink-20)' }}>
            {fmt(b)}
          </span>
        )
      },
    },
    {
      key: 'status', label: 'Status',
      render: v => <Badge status={v} />,
    },
    {
      key: '_act', label: '', sortable: false,
      render: (_, row) => (
        <div style={{ display: 'flex', gap: 6 }}>
          <Button
            size="sm" variant="ghost"
            tabIndex={-1}
            onClick={e => { e.stopPropagation(); setViewInvoice(row) }}
          >
            View
          </Button>
          {row.status !== 'Paid' && (
            <Button
              size="sm" variant="ghost"
              tabIndex={-1}
              onClick={e => { e.stopPropagation(); setPayModal(row); setPayAmt('') }}
            >
              Pay
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="animate-slide">
      {/* Professional invoice overlay */}
      {viewInvoice && (
        <InvoiceView invoice={viewInvoice} onClose={() => setViewInvoice(null)} />
      )}
      <ErpImportModal open={importOpen} onClose={() => setImportOpen(false)} defaultKind="sales" />

      <PageHeader
        title="Sales"
        sub="Invoice management & receivables"
        right={
          <>
            <Button variant="ghost" onClick={() => setImportOpen(true)}>Import</Button>
            <Button variant="primary" onClick={onNewInvoice}>
              + New Invoice
            </Button>
          </>
        }
      />

      {/* KPIs */}
      <div className="kpi-grid-4" style={{
        display:             'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap:                 14,
        marginBottom:        22,
      }}>
        <KpiCard label="Total Billed"   value={fmtShort(totalBilled)}  sub={`${invoices.length} invoices`} />
        <KpiCard label="Collected"      value={fmtShort(totalPaid)}    />
        <KpiCard label="Outstanding"    value={fmtShort(outstanding)}  sub={`${overdueCount} unpaid`} />
        <KpiCard label="Overdue"        value={fmtShort(outstanding)}  sub={`${overdueCount} invoice${overdueCount === 1 ? '' : 's'}`} />
      </div>

      <Card>
        <CardHead
          title="All Invoices"
          right={
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search invoices or parties…"
              />
              <FilterPills
                options={FILTERS}
                value={filter}
                onChange={setFilter}
              />
            </div>
          }
        />
        <Table
          focusId="sales-invoices"
          cols={cols}
          rows={filtered}
          onRowClick={setViewInvoice}
          emptyMsg="No invoices match your search"
        />
      </Card>

      {/* Payment modal */}
      {payModal && (
        <Modal
          open={true}
          onClose={() => setPayModal(null)}
          title="Record Payment"
        >
          {/* Invoice summary */}
          <div style={{
            background:   'var(--surface-2)',
            border:       '1px solid var(--border)',
            borderRadius: 'var(--r-sm)',
            padding:      '12px 14px',
          }}>
            <div style={{ fontSize: 12, color: 'var(--ink-40)', marginBottom: 3 }}>
              {payModal.id} — {payModal.party}
            </div>
            <div style={{ fontSize: 13 }}>
              Outstanding:{' '}
              <strong style={{ color: 'var(--red)' }}>
                {fmt(payModal.total - payModal.paid)}
              </strong>
            </div>
          </div>

          <FormGrid cols={2}>
            <Select
              label="Payment Mode"
              value={payMode}
              onChange={e => setPayMode(e.target.value)}
              options={['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'NEFT', 'RTGS']}
            />
            <Input
              label="Amount (₹)"
              type="number"
              value={payAmt}
              onChange={e => setPayAmt(e.target.value)}
              placeholder="0.00"
            />
          </FormGrid>
          <Input label="Reference / UTR (optional)" placeholder="Transaction reference" />

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setPayModal(null)}>Cancel</Button>
            <Button variant="primary" onClick={handlePay}>Record Payment</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
