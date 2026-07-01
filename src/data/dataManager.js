import { clearErpState, getDefaultErpState, loadErpState, saveErpState } from './store.js'
import { mergeImportIntoErpState } from './importBridge.js'
import { buildReportState, parseDateValue } from './reportUtils.js'
import { deriveStockLedger } from './stockData.js'

export const ERP_DATA_SHAPE = {
  company: {},
  dashboard: {},
  sales: [],
  purchases: [],
  parties: [],
  products: [],
  expenses: [],
  payments: [],
  stock: [],
  gst: [],
  analytics: {},
}

export function createEmptyErpState(base = getDefaultErpState()) {
  return {
    ...base,
    invoices: [],
    parties: [],
    purchases: [],
    expenses: [],
    workers: [],
    items: [],
    revenueData: [],
    cashEntries: [],
    bankEntries: [],
    backups: [],
    importMeta: null,
  }
}

export function hasImportedData(state) {
  return Boolean(state?.importMeta?.lastImportAt)
}

export function getRuntimeErpState() {
  return loadErpState()
}

export function persistRuntimeErpState(state) {
  return saveErpState(state)
}

export function resetRuntimeErpState() {
  clearErpState()
  return getDefaultErpState()
}

export function importErpData(currentState, importResult, options = {}) {
  if (!importResult?.success) {
    return {
      ok: false,
      state: currentState,
      errors: importResult?.errors || [],
      stats: null,
    }
  }

  const importKind = options.importKind || importResult.meta?.importKind || importResult.payload?.metadata?.importKind || 'complete'
  const baseState = hasImportedData(currentState) ? currentState : createEmptyErpState(currentState)
  const structuredData = importResult.payload?.erpData

  let merged
  if (structuredData) {
    merged = mergeStructuredErpData(baseState, structuredData, { ...importResult.meta, importKind })
  } else if (importKind === 'parties') {
    merged = mergePartyRecords(baseState, importResult.payload, importResult.meta)
  } else if (importKind === 'expenses') {
    merged = mergeExpenseRecords(baseState, importResult.payload, importResult.meta)
  } else if (importKind === 'products') {
    merged = mergeProductRecords(baseState, importResult.payload, importResult.meta)
  } else {
    merged = mergeImportIntoErpState(baseState, importResult.payload, { ...importResult.meta, importKind })
  }

  const normalized = normalizePersistedState({
    ...merged,
    importMeta: {
      ...(merged.importMeta || {}),
      importKind,
      lastImportAt: merged.importMeta?.lastImportAt || new Date().toISOString(),
      fileName: merged.importMeta?.fileName || importResult.payload?.metadata?.fileName || '',
      source: merged.importMeta?.source || 'file-import',
    },
  })

  return {
    ok: true,
    state: normalized,
    errors: [],
    stats: normalized._importStats || merged._importStats || null,
  }
}

export function normalizePersistedState(state = getDefaultErpState()) {
  const defaults = getDefaultErpState()
  return {
    ...defaults,
    ...state,
    business: { ...defaults.business, ...(state.business || state.company || {}) },
    invoices: asArray(state.invoices || state.sales),
    parties: asArray(state.parties),
    purchases: asArray(state.purchases),
    expenses: asArray(state.expenses),
    workers: asArray(state.workers),
    items: asArray(state.items || state.products),
    revenueData: asArray(state.revenueData),
    cashEntries: asArray(state.cashEntries),
    bankEntries: asArray(state.bankEntries),
    backups: asArray(state.backups),
    importMeta: state.importMeta ?? null,
  }
}

export function buildNormalizedErpData(state) {
  const normalized = normalizePersistedState(state)
  const stock = deriveStockLedger(normalized.invoices, normalized.purchases)
  const analytics = buildReportState({
    sales: normalized.invoices,
    purchases: normalized.purchases,
    parties: normalized.parties,
    expenses: normalized.expenses,
    itemMaster: normalized.items,
  })

  return {
    ...ERP_DATA_SHAPE,
    company: normalized.business,
    dashboard: buildDashboardData(normalized, stock, analytics),
    sales: normalized.invoices,
    purchases: normalized.purchases,
    parties: normalized.parties,
    products: normalized.items,
    expenses: normalized.expenses,
    payments: buildPayments(normalized),
    stock,
    gst: buildGstRows(normalized),
    analytics,
  }
}

export function buildDashboardData(state, stock = deriveStockLedger(state.invoices, state.purchases), analytics = null) {
  const sales = asArray(state.invoices)
  const purchases = asArray(state.purchases)
  const expenses = asArray(state.expenses)
  const reports = analytics || buildReportState({ sales, purchases, parties: state.parties, expenses, itemMaster: state.items })
  const totalSales = sales.reduce((sum, row) => sum + (Number(row.total) || 0), 0)
  const totalPurchase = purchases.reduce((sum, row) => sum + (Number(row.amount) || 0), 0)
  const totalExpenses = expenses.reduce((sum, row) => sum + (Number(row.amount) || 0), 0)
  const paidSales = sales.reduce((sum, row) => sum + (Number(row.paid) || 0), 0)
  const paidPurchases = purchases.reduce((sum, row) => sum + (Number(row.paid) || 0), 0)

  return {
    totalSales,
    totalPurchase,
    totalProfit: reports.totals.netProfit,
    pendingPayments: Math.max(totalSales - paidSales, 0) + Math.max(totalPurchase - paidPurchases, 0),
    expenses: totalExpenses,
    topProducts: reports.itemWiseProfit.slice(0, 5),
    topParties: reports.partyStatement
      .filter((row) => Math.abs(Number(row.balanceValue) || 0) > 0 || Number(row.salesValue) || Number(row.purchaseValue))
      .sort((a, b) => Math.abs(b.balanceValue || 0) - Math.abs(a.balanceValue || 0))
      .slice(0, 5),
    recentTransactions: [...sales, ...purchases, ...expenses]
      .map((row) => normalizeTransaction(row))
      .sort((a, b) => {
        const left = parseDateValue(a.date)?.getTime() || 0
        const right = parseDateValue(b.date)?.getTime() || 0
        if (right !== left) return right - left
        return String(b.id || '').localeCompare(String(a.id || ''))
      })
      .slice(0, 8),
    gstSummary: {
      salesGST: reports.totals.salesGST,
      purchaseGST: reports.totals.purchaseGST,
      netGST: Math.max((reports.totals.salesGST || 0) - (reports.totals.purchaseGST || 0), 0),
    },
    stockAlerts: stock.filter((row) => (Number(row.closingQty) || 0) <= 5),
    monthlyRevenue: buildMonthlyRevenue(sales, purchases),
  }
}

function normalizeTransaction(row = {}) {
  if (row.party) {
    return {
      ...row,
      type: 'Sale',
      partyName: row.party,
      amount: Number(row.total) || 0,
      reference: row.id,
    }
  }

  if (row.supplier) {
    return {
      ...row,
      type: 'Purchase',
      partyName: row.supplier,
      amount: Number(row.amount) || 0,
      reference: row.id || row.billNo,
    }
  }

  return {
    ...row,
    type: 'Expense',
    partyName: row.title || row.desc || row.category || 'Expense',
    amount: Number(row.amount) || 0,
    reference: row.id,
    status: row.category || row.mode || row.paymentMode || '',
  }
}

function buildMonthlyRevenue(sales, purchases) {
  const months = new Map()

  const ensureMonth = (dateValue) => {
    const parsed = parseDateValue(dateValue)
    if (!parsed) return null
    const month = parsed.toLocaleDateString('en-IN', { month: 'short' })
    const order = parsed.getFullYear() * 12 + parsed.getMonth()
    const current = months.get(`${parsed.getFullYear()}-${parsed.getMonth()}`) || {
      month,
      order,
      sales: 0,
      purchases: 0,
    }
    months.set(`${parsed.getFullYear()}-${parsed.getMonth()}`, current)
    return current
  }

  sales.forEach((invoice) => {
    const bucket = ensureMonth(invoice.date)
    if (bucket) bucket.sales += Number(invoice.total) || 0
  })

  purchases.forEach((purchase) => {
    const bucket = ensureMonth(purchase.date)
    if (bucket) bucket.purchases += Number(purchase.amount) || 0
  })

  return Array.from(months.values())
    .sort((a, b) => a.order - b.order)
    .map(({ order, ...row }) => row)
}

function mergeStructuredErpData(state, data, meta = {}) {
  const next = normalizePersistedState({
    ...state,
    business: { ...(state.business || {}), ...(data.company || data.business || {}) },
    invoices: asArray(data.sales || data.invoices || state.invoices).map(normalizeSalesDoc),
    purchases: asArray(data.purchases || state.purchases).map(normalizePurchaseDoc),
    parties: asArray(data.parties || state.parties).map(normalizeParty),
    expenses: asArray(data.expenses || state.expenses).map(normalizeExpense),
    items: asArray(data.products || data.items || state.items).map(normalizeProduct),
  })

  return {
    ...next,
    importMeta: buildImportMeta(data?.metadata || {}, meta),
    _importStats: {
      records: countStructuredRows(data),
      invoices: next.invoices.length,
      purchases: next.purchases.length,
      parties: next.parties.length,
      items: next.items.length,
      expenses: next.expenses.length,
    },
  }
}

function mergePartyRecords(state, payload = {}, meta = {}) {
  const records = asArray(payload.records)
  const parties = dedupeByName([
    ...asArray(state.parties),
    ...records.map(recordToParty).filter(Boolean),
  ])

  return {
    ...state,
    parties,
    importMeta: buildImportMeta(payload.metadata, meta),
    _importStats: { records: records.length, parties: parties.length, invoices: 0, purchases: 0, items: state.items?.length || 0 },
  }
}

function mergeExpenseRecords(state, payload = {}, meta = {}) {
  const records = asArray(payload.records)
  const expenses = [
    ...records.map(recordToExpense).filter(Boolean),
    ...asArray(state.expenses),
  ]

  return {
    ...state,
    expenses,
    importMeta: buildImportMeta(payload.metadata, meta),
    _importStats: { records: records.length, expenses: expenses.length, invoices: 0, purchases: 0, parties: state.parties?.length || 0, items: state.items?.length || 0 },
  }
}

function mergeProductRecords(state, payload = {}, meta = {}) {
  const records = asArray(payload.records)
  const products = dedupeByName([
    ...asArray(state.items),
    ...records.map(recordToProduct).filter(Boolean),
  ])

  const stockPurchase = records.length
    ? {
        id: `PO-STOCK-${Date.now()}`,
        supplier: 'Opening Stock Import',
        billNo: `PO-STOCK-${Date.now()}`,
        date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        dueDate: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        amount: records.reduce((sum, row) => sum + ((Number(row.quantity) || 0) * (Number(row.purchaseRate || row.rate) || 0)), 0),
        subtotal: records.reduce((sum, row) => sum + ((Number(row.quantity) || 0) * (Number(row.purchaseRate || row.rate) || 0)), 0),
        tax: 0,
        paid: 0,
        status: 'Paid',
        mode: 'Credit',
        items: records.map((row) => ({
          desc: row.itemName,
          hsn: row.hsnCode || '',
          qty: Number(row.quantity) || 0,
          rate: Number(row.purchaseRate || row.rate) || 0,
          taxPct: Number(row.gstPercent) || 0,
          amount: (Number(row.quantity) || 0) * (Number(row.purchaseRate || row.rate) || 0),
        })),
        notes: 'Imported opening stock',
      }
    : null

  return {
    ...state,
    items: products,
    purchases: stockPurchase ? [stockPurchase, ...asArray(state.purchases)] : asArray(state.purchases),
    importMeta: buildImportMeta(payload.metadata, meta),
    _importStats: { records: records.length, items: products.length, purchases: stockPurchase ? 1 : 0, invoices: 0, parties: state.parties?.length || 0 },
  }
}

function buildImportMeta(metadata = {}, meta = {}) {
  return {
    lastImportAt: metadata.uploadedAt || new Date().toISOString(),
    fileName: metadata.fileName || '',
    totalRows: metadata.totalRows || meta.totalParsedRows || 0,
    importProfile: metadata.importProfile || meta.importProfile || 'generic',
    importKind: metadata.importKind || meta.importKind || 'complete',
    source: meta.source || 'file-import',
  }
}

function normalizeSalesDoc(row = {}) {
  return {
    paid: 0,
    status: 'Pending',
    ...row,
    id: row.id || row.invoiceNo || `INV-${Date.now()}`,
    party: row.party || row.partyName || 'Walk-in Customer',
    total: Number(row.total ?? row.totalAmount ?? row.amount) || 0,
    subtotal: Number(row.subtotal ?? row.taxableAmount) || Number(row.total ?? row.amount) || 0,
    tax: Number(row.tax ?? row.gstAmount) || 0,
    items: asArray(row.items),
  }
}

function normalizePurchaseDoc(row = {}) {
  return {
    paid: 0,
    status: 'Unpaid',
    ...row,
    id: row.id || row.billNo || row.invoiceNo || `PO-${Date.now()}`,
    supplier: row.supplier || row.party || row.partyName || 'Imported Supplier',
    amount: Number(row.amount ?? row.total ?? row.totalAmount) || 0,
    subtotal: Number(row.subtotal ?? row.taxableAmount) || Number(row.amount ?? row.total) || 0,
    tax: Number(row.tax ?? row.gstAmount) || 0,
    items: asArray(row.items),
  }
}

function normalizeParty(row = {}) {
  return {
    id: row.id || `party-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: row.name || row.partyName || row.party || 'Unnamed Party',
    type: row.type || row.partyType || 'Customer',
    phone: row.phone || row.mobile || '',
    city: row.city || '',
    gstin: row.gstin || '',
    balance: Number(row.balance) || 0,
    drCr: row.drCr || '',
    ...row,
  }
}

function normalizeExpense(row = {}) {
  return {
    id: row.id || `exp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: row.title || row.expenseTitle || row.desc || row.category || 'Imported Expense',
    desc: row.desc || row.title || row.expenseTitle || '',
    category: row.category || 'Miscellaneous',
    amount: Number(row.amount ?? row.totalAmount ?? row.taxableAmount) || 0,
    paymentMode: row.paymentMode || row.mode || 'Cash',
    mode: row.mode || row.paymentMode || 'Cash',
    notes: row.notes || '',
    date: row.date || row.invoiceDate || new Date().toISOString().slice(0, 10),
    ...row,
  }
}

function normalizeProduct(row = {}) {
  return {
    id: row.id || `itm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: row.name || row.itemName || row.desc || 'Imported Item',
    category: row.category || 'Other Goods',
    batchNo: row.batchNo || '',
    expiryDate: row.expiryDate || '',
    expiryAlert: row.expiryAlert !== false,
    gstSlab: Number(row.gstSlab ?? row.gst ?? row.gstPercent) || 0,
    gst: Number(row.gst ?? row.gstSlab ?? row.gstPercent) || 0,
    purchasePrice: Number(row.purchasePrice ?? row.purchaseRate ?? row.rate) || 0,
    salesPrice: Number(row.salesPrice ?? row.rate) || 0,
    mrp: Number(row.mrp ?? row.rate) || 0,
    stockQty: Number(row.stockQty ?? row.quantity) || 0,
    discount: Number(row.discount) || 0,
    unitType: row.unitType || 'Nos',
    hsn: row.hsn || row.hsnCode || '',
    status: row.status || 'Active',
    recentScore: Number(row.recentScore) || 1,
    deleted: Boolean(row.deleted),
    version: Number(row.version) || 1,
    ...row,
  }
}

function recordToParty(record) {
  if (!record?.partyName) return null
  return normalizeParty(record)
}

function recordToExpense(record) {
  const amount = Number(record.totalAmount) || Number(record.taxableAmount) || Number(record.balance) || 0
  if (!amount) return null
  return normalizeExpense({
    title: record.expenseTitle || record.partyName || record.category,
    category: record.category,
    amount,
    paymentMode: record.paymentMode,
    notes: record.notes,
    date: record.invoiceDate,
  })
}

function recordToProduct(record) {
  if (!record?.itemName) return null
  return normalizeProduct(record)
}

function dedupeByName(rows) {
  const map = new Map()
  rows.filter(Boolean).forEach((row) => {
    const key = String(row.name || row.partyName || row.itemName || '').trim().toLowerCase()
    if (!key) return
    map.set(key, { ...(map.get(key) || {}), ...row })
  })
  return Array.from(map.values())
}

function buildPayments(state) {
  return [
    ...asArray(state.invoices).filter((row) => Number(row.paid) > 0).map((row) => ({
      id: `pay-sales-${row.id}`,
      type: 'Receipt',
      party: row.party,
      date: row.date,
      amount: Number(row.paid) || 0,
      reference: row.id,
    })),
    ...asArray(state.purchases).filter((row) => Number(row.paid) > 0).map((row) => ({
      id: `pay-purchase-${row.id}`,
      type: 'Payment',
      party: row.supplier,
      date: row.date,
      amount: Number(row.paid) || 0,
      reference: row.id,
    })),
  ]
}

function buildGstRows(state) {
  return [
    ...asArray(state.invoices).map((row) => ({ type: 'sale', id: row.id, date: row.date, party: row.party, tax: Number(row.tax) || 0 })),
    ...asArray(state.purchases).map((row) => ({ type: 'purchase', id: row.id, date: row.date, party: row.supplier, tax: Number(row.tax) || 0 })),
  ]
}

function countStructuredRows(data) {
  return ['sales', 'invoices', 'purchases', 'parties', 'products', 'items', 'expenses', 'payments', 'stock', 'gst']
    .reduce((sum, key) => sum + (Array.isArray(data?.[key]) ? data[key].length : 0), 0)
}

function asArray(value) {
  return Array.isArray(value) ? value : []
}
