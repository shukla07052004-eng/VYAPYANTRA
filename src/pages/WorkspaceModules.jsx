import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { AI_REPORT_DEFINITIONS, BANKING_DEFINITIONS, UTILITY_DEFINITIONS } from '../data/erpModules.js'
import { Card, CardBody, CardHead, FormGrid, Input, KpiCard, PageHeader, Select, Table, Textarea } from '../components/ui/index.js'
import Button from '../components/ui/Button.jsx'
import Modal from '../components/ui/Modal.jsx'
import { consumeSequentialEnter } from '../utils/erpEnterNav.js'
import { fmt, fmtShort, todayISO } from '../utils/helpers.js'

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
      <PageHeader
        title="Items"
        sub="Central inventory database for sales and purchase entry with fast keyboard-first search."
        right={<Button variant="primary" onClick={() => setEditor(createEmptyItem())}>+ Add Item</Button>}
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
  const { reportId } = useParams()
  const navigate = useNavigate()
  const { reports, stockLedger, parties } = useApp()
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
  const { companies, sharedCompanies, backupSettings, saveBackupSettings, addCompany, deletedItems, itemMaster, stockLedger, reports } = useApp()
  const [tab, setTab] = useState('my-companies')
  const [companyForm, setCompanyForm] = useState({ companyName: '', ownerName: '', gstNumber: '', mobile: '', email: '', address: '', state: '', pincode: '', financialYear: '2026-27', businessType: '' })
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

  if (moduleId === 'export-items' || moduleId === 'import-items') {
    const isImport = moduleId === 'import-items'
    return (
      <AnalyticsDetailPage
        title={isImport ? 'Import Items' : 'Export Items'}
        sub={isImport ? 'Excel/CSV import with duplicate checks and progress-aware review.' : 'Excel/CSV export from central item master.'}
        onBack={() => navigate('/utilities')}
        focusId={isImport ? 'import-items-table' : 'export-items-table'}
        kpis={[
          { label: 'Master Items', value: itemMaster.length },
          { label: 'CSV Ready', value: 'Yes' },
          { label: 'Excel Ready', value: 'Yes' },
          { label: isImport ? 'Duplicate Check' : 'Sample Format', value: 'Ready' },
        ]}
        rows={itemMaster.slice(0, 10).map((item, index) => ({ item: item.name, qty: item.stockQty, value: item.salesPrice, note: isImport ? (index % 3 === 0 ? 'Duplicate' : 'Ready') : 'Ready' }))}
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
        {cards.map((card, index) => (
          <Card
            key={card.id}
            className="focusable-card"
            data-focus-item="true"
            tabIndex={index === 0 ? 0 : -1}
            role="button"
            onClick={() => navigate(card.path)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                navigate(card.path)
              }
            }}
            style={{ cursor: 'pointer' }}
          >
            <CardBody style={{ display: 'grid', gap: 8 }}>
              <strong style={{ fontSize: 13.5 }}>{card.name}</strong>
              <div style={{ fontSize: 12, color: 'var(--ink-40)' }}>{card.desc}</div>
            </CardBody>
          </Card>
        ))}
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
