/**
 * Maps standardized import JSON (file-import module output) into ERP store entities.
 * Record shape: invoiceNo, invoiceDate, partyName, mobile, itemName, batchNo,
 * expiryDate, quantity, rate, discount, gstPercent, taxableAmount, gstAmount,
 * totalAmount, hsnCode, purchaseRate?
 */

function formatErpDate(value) {
  if (!value) return new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return String(value)
  return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function toLineItem(record) {
  const qty = Number(record.quantity) || 0
  const rate = Number(record.rate) || 0
  const taxPct = Number(record.gstPercent) || 0
  const baseAmount = Number(record.taxableAmount) || qty * rate
  const taxAmount = Number(record.gstAmount) || Math.round(baseAmount * taxPct / 100)
  const amount = Number(record.totalAmount) || baseAmount + taxAmount
  return {
    desc: record.itemName,
    hsn: record.hsnCode || '',
    qty,
    rate,
    discountPct: Number(record.discount) || 0,
    taxPct,
    taxLabel: `GST ${taxPct}%`,
    baseAmount,
    taxAmount,
    amount,
  }
}

function mergePartyType(current, next) {
  if (!current || current === next) return next || current || 'Customer'
  if (current === 'Both' || current === next) return current
  if (next === 'Both') return 'Both'
  if (current === 'Customer' && next === 'Supplier') return 'Both'
  if (current === 'Supplier' && next === 'Customer') return 'Both'
  return next || current
}

function upsertParty(parties, { name, phone, type, city, gstin, balance, drCr }) {
  const trimmed = String(name || '').trim()
  if (!trimmed) return parties
  const key = trimmed.toLowerCase()
  const existing = parties.find((party) => party.name?.toLowerCase() === key)
  if (existing) {
    return parties.map((party) => (
      party.name?.toLowerCase() === key
        ? {
            ...party,
            phone: phone || party.phone,
            city: city || party.city,
            gstin: gstin || party.gstin,
            balance: Number.isFinite(Number(balance)) && Number(balance) !== 0 ? Number(balance) : party.balance,
            drCr: drCr || party.drCr,
            type: mergePartyType(party.type, type),
          }
        : party
    ))
  }
  return [
    ...parties,
    {
      id: Date.now() + parties.length,
      name: trimmed,
      phone: phone || '',
      type: type || 'Customer',
      city: city || '',
      gstin: gstin || '',
      balance: Number(balance) || 0,
      drCr: drCr || '',
    },
  ]
}

function upsertItem(items, record, { addStockQty = false } = {}) {
  const name = String(record.itemName || '').trim()
  if (!name) return items
  const key = name.toLowerCase()
  const batchKey = String(record.batchNo || '').toLowerCase()
  const existing = items.find((item) => (
    item.name?.toLowerCase() === key
    && String(item.batchNo || '').toLowerCase() === batchKey
  )) ?? items.find((item) => item.name?.toLowerCase() === key)

  const qty = Number(record.quantity) || 0
  const rate = Number(record.rate) || 0
  const purchaseRate = Number(record.purchaseRate) || rate
  const gst = Number(record.gstPercent) || 18

  if (existing) {
    return items.map((item) => (
      item === existing
        ? {
            ...item,
            batchNo: record.batchNo || item.batchNo || '',
            expiryDate: record.expiryDate || item.expiryDate || '',
            hsn: record.hsnCode || item.hsn || '',
            gstSlab: gst,
            gst,
            purchasePrice: purchaseRate || item.purchasePrice,
            salesPrice: rate || item.salesPrice,
            mrp: rate || item.mrp,
            stockQty: addStockQty ? (Number(item.stockQty) || 0) + qty : item.stockQty,
            recentScore: (item.recentScore || 0) + 2,
            recentUsedOn: formatErpDate(record.invoiceDate) || item.recentUsedOn,
            status: 'Active',
          }
        : item
    ))
  }

  return [
    ...items,
    {
      id: `itm-import-${Date.now()}-${items.length + 1}`,
      name,
      category: 'Other Goods',
      batchNo: record.batchNo || '',
      mfgDate: '',
      expiryDate: record.expiryDate || '',
      expiryAlert: true,
      gstSlab: gst,
      gst,
      purchasePrice: purchaseRate,
      salesPrice: rate,
      mrp: rate,
      stockQty: addStockQty ? qty : 0,
      discount: Number(record.discount) || 0,
      unitType: 'Nos',
      barcode: '',
      hsn: record.hsnCode || '',
      notes: '',
      status: 'Active',
      recentScore: 3,
      recentUsedOn: formatErpDate(record.invoiceDate),
      recentEditedOn: '',
      deleted: false,
      version: 1,
    },
  ]
}

function upsertInvoice(invoices, doc) {
  const key = String(doc.id || '').toLowerCase()
  const without = invoices.filter((row) => String(row.id || '').toLowerCase() !== key)
  return [doc, ...without]
}

function upsertPurchase(purchases, doc) {
  const key = String(doc.id || '').toLowerCase()
  const without = purchases.filter((row) => String(row.id || '').toLowerCase() !== key)
  return [doc, ...without]
}

function isPurchaseDocument(invoiceNo, rows, importProfile, importKind) {
  if (importKind === 'sales') return false
  if (importKind === 'purchases') return true
  const id = String(invoiceNo || '').trim()
  if (/^PO/i.test(id)) return true
  if (importProfile === 'marg-erp' && rows.every((row) => !row.partyName?.trim())) return true
  return rows.some((row) => Number(row.purchaseRate) > 0 && Number(row.purchaseRate) !== Number(row.rate))
}

function buildSalesInvoice(invoiceNo, rows) {
  const first = rows[0]
  const items = rows.map(toLineItem)
  const subtotal = items.reduce((sum, item) => sum + (item.baseAmount || 0), 0)
  const tax = items.reduce((sum, item) => sum + (item.taxAmount || 0), 0)
  const total = items.reduce((sum, item) => sum + (item.amount || 0), 0)
  return {
    id: invoiceNo,
    party: first.partyName || 'Walk-in Customer',
    phone: first.mobile || '',
    city: first.city || '',
    gstin: first.gstin || '',
    buyerGSTIN: first.gstin || '',
    date: formatErpDate(first.invoiceDate),
    dueDate: formatErpDate(first.invoiceDate),
    items,
    subtotal,
    tax,
    total,
    paid: 0,
    status: 'Pending',
    notes: 'Imported from spreadsheet',
  }
}

function buildPurchaseBill(invoiceNo, rows) {
  const first = rows[0]
  const items = rows.map(toLineItem)
  const subtotal = items.reduce((sum, item) => sum + (item.baseAmount || 0), 0)
  const tax = items.reduce((sum, item) => sum + (item.taxAmount || 0), 0)
  const total = items.reduce((sum, item) => sum + (item.amount || 0), 0)
  const supplier = first.partyName?.trim() || 'Imported Supplier'
  return {
    id: invoiceNo,
    supplier,
    billNo: invoiceNo,
    date: formatErpDate(first.invoiceDate),
    dueDate: formatErpDate(first.invoiceDate),
    amount: total,
    subtotal,
    tax,
    paid: 0,
    status: 'Unpaid',
    mode: 'Credit',
    items,
    notes: 'Imported from spreadsheet',
  }
}

function buildOpeningStockPurchase(rows, metadata = {}) {
  const items = rows.map(toLineItem)
  const subtotal = items.reduce((sum, item) => sum + (item.baseAmount || 0), 0)
  const tax = items.reduce((sum, item) => sum + (item.taxAmount || 0), 0)
  const total = items.reduce((sum, item) => sum + (item.amount || 0), 0)
  const stamp = metadata.uploadedAt ? new Date(metadata.uploadedAt) : new Date()
  const id = `PO-IMPORT-${stamp.getTime()}`
  return {
    id,
    supplier: 'Opening Stock Import',
    billNo: id,
    date: formatErpDate(stamp),
    dueDate: formatErpDate(stamp),
    amount: total,
    subtotal,
    tax,
    paid: total,
    status: 'Paid',
    mode: 'Credit',
    items,
    notes: `Stock import from ${metadata.fileName || 'spreadsheet'}`,
  }
}

function recomputeRevenueData(invoices, existing = []) {
  if (!invoices.length) return existing
  const byMonth = new Map(existing.map((row) => [row.month, { ...row }]))
  invoices.forEach((invoice) => {
    const parsed = new Date(invoice.date)
    if (Number.isNaN(parsed.getTime())) return
    const month = parsed.toLocaleDateString('en-IN', { month: 'short' })
    const current = byMonth.get(month) || { month, current: 0, prev: 0 }
    current.current += Number(invoice.total) || 0
    byMonth.set(month, current)
  })
  const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return monthOrder
    .filter((month) => byMonth.has(month))
    .map((month) => byMonth.get(month))
}

/**
 * @param {import('./store.js').ErpState} state
 * @param {{ metadata?: object, records?: object[] }} payload
 * @param {object} [meta]
 */
export function mergeImportIntoErpState(state, payload, meta = {}) {
  const records = Array.isArray(payload?.records) ? payload.records : []
  const metadata = payload?.metadata || {}
  const importProfile = metadata.importProfile || meta.importProfile || 'generic'
  const importKind = metadata.importKind || meta.importKind || 'complete'

  if (!records.length) {
    return {
      ...state,
      importMeta: {
        lastImportAt: metadata.uploadedAt || new Date().toISOString(),
        fileName: metadata.fileName || '',
        totalRows: 0,
        importProfile,
      },
      _importStats: { records: 0, invoices: 0, purchases: 0, parties: 0, items: 0 },
    }
  }

  let parties = [...(state.parties || [])]
  let items = [...(state.items || [])]
  let invoices = [...(state.invoices || [])]
  let purchases = [...(state.purchases || [])]

  const invoiceRows = records.filter((row) => String(row.invoiceNo || '').trim())
  const stockRows = records.filter((row) => !String(row.invoiceNo || '').trim() && String(row.itemName || '').trim())

  let invoiceDocs = 0
  let purchaseDocs = 0

  const invoiceGroups = new Map()
  invoiceRows.forEach((row) => {
    const key = String(row.invoiceNo).trim()
    if (!invoiceGroups.has(key)) invoiceGroups.set(key, [])
    invoiceGroups.get(key).push(row)
  })

  invoiceGroups.forEach((rows, invoiceNo) => {
    const partyName = rows[0]?.partyName?.trim()
    const partyType = isPurchaseDocument(invoiceNo, rows, importProfile, importKind) ? 'Supplier' : 'Customer'
    if (partyName) {
      parties = upsertParty(parties, {
        name: partyName,
        phone: rows[0]?.mobile,
        type: rows[0]?.partyType || partyType,
        city: rows[0]?.city,
        gstin: rows[0]?.gstin,
        balance: rows[0]?.balance,
        drCr: rows[0]?.drCr,
      })
    }

    rows.forEach((row) => {
      items = upsertItem(items, row)
    })

    if (isPurchaseDocument(invoiceNo, rows, importProfile, importKind)) {
      purchases = upsertPurchase(purchases, buildPurchaseBill(invoiceNo, rows))
      if (!partyName) {
        parties = upsertParty(parties, { name: buildPurchaseBill(invoiceNo, rows).supplier, phone: '', type: 'Supplier' })
      }
      purchaseDocs += 1
    } else {
      invoices = upsertInvoice(invoices, buildSalesInvoice(invoiceNo, rows))
      if (!partyName) {
        parties = upsertParty(parties, { name: buildSalesInvoice(invoiceNo, rows).party, phone: rows[0]?.mobile, type: 'Customer' })
      }
      invoiceDocs += 1
    }
  })

  if (stockRows.length) {
    stockRows.forEach((row) => {
      items = upsertItem(items, row)
      if (row.partyName?.trim()) {
        parties = upsertParty(parties, { name: row.partyName, phone: row.mobile, type: row.partyType || 'Supplier', city: row.city, gstin: row.gstin })
      }
    })
    const openingPurchase = buildOpeningStockPurchase(stockRows, metadata)
    purchases = upsertPurchase(purchases, openingPurchase)
    parties = upsertParty(parties, { name: openingPurchase.supplier, phone: '', type: 'Supplier' })
    purchaseDocs += 1
  }

  const revenueData = recomputeRevenueData(invoices, state.revenueData || [])

  return {
    ...state,
    parties,
    items,
    invoices,
    purchases,
    revenueData,
    importMeta: {
      lastImportAt: metadata.uploadedAt || new Date().toISOString(),
      fileName: metadata.fileName || '',
      totalRows: records.length,
      importProfile,
      importKind,
      source: meta.source || 'file-import',
    },
    _importStats: {
      records: records.length,
      invoices: invoiceDocs,
      purchases: purchaseDocs,
      parties: parties.length,
      items: items.length,
    },
  }
}

export default mergeImportIntoErpState
