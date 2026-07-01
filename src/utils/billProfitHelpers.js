// ============================================================
// BizLedger Pro - Bill-wise Profit Helpers
// ============================================================

function parseDateValue(value) {
  if (!value) return null
  const parsed = new Date(value)
  if (!Number.isNaN(parsed.getTime())) return parsed

  const match = String(value).trim().match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/)
  if (!match) return null

  const monthIndex = {
    jan: 0,
    feb: 1,
    mar: 2,
    apr: 3,
    may: 4,
    jun: 5,
    jul: 6,
    aug: 7,
    sep: 8,
    oct: 9,
    nov: 10,
    dec: 11,
  }[match[2].toLowerCase()]

  if (monthIndex === undefined) return null
  return new Date(Number(match[3]), monthIndex, Number(match[1]), 12)
}

function toISODate(value) {
  const parsed = parseDateValue(value)
  return parsed ? parsed.toISOString().slice(0, 10) : ''
}

function itemKey(name = '') {
  return String(name).trim().toLowerCase()
}

function buildPurchasePriceMap(purchases = [], itemMaster = []) {
  const prices = new Map()

  purchases.forEach((purchase) => {
    purchase.items?.forEach((item) => {
      const key = itemKey(item.desc)
      if (!key) return
      prices.set(key, Number(item.rate) || prices.get(key) || 0)
    })
  })

  itemMaster.forEach((item) => {
    const key = itemKey(item.name)
    if (!key) return
    prices.set(key, Number(item.purchasePrice) || prices.get(key) || 0)
  })

  return prices
}

function buildProductMap(itemMaster = []) {
  return new Map(itemMaster.map((item) => [itemKey(item.name), item]))
}

export function buildBillsFromErp({ invoices = [], purchases = [], itemMaster = [] } = {}) {
  const purchasePrices = buildPurchasePriceMap(purchases, itemMaster)
  const products = buildProductMap(itemMaster)

  return invoices.map((invoice) => {
    const items = (invoice.items || []).map((line) => {
      const key = itemKey(line.desc)
      const product = products.get(key)
      const quantity = Number(line.qty) || 0
      const sellingPrice = Number(line.rate) || (quantity ? (Number(line.amount) || 0) / quantity : 0)

      return {
        productName: line.desc || 'Imported Item',
        quantity,
        purchasePrice: Number(line.purchasePrice) || Number(product?.purchasePrice) || purchasePrices.get(key) || 0,
        sellingPrice,
        mrp: Number(line.mrp) || Number(product?.mrp) || sellingPrice,
        gstPercentage: Number(line.taxPct) || Number(product?.gst) || Number(product?.gstSlab) || 0,
      }
    })

    return {
      billNo: invoice.id,
      date: toISODate(invoice.date),
      partyName: invoice.party || 'Walk-in Customer',
      totalAmount: Number(invoice.total) || 0,
      discount: Number(invoice.discount) || items.reduce((sum, item) => sum + (Number(item.discount) || 0), 0),
      items,
    }
  })
}

/**
 * Calculate profit for a single line item.
 * GST is not counted as profit because it is a tax pass-through.
 */
export function calcItemProfit(item) {
  return (item.sellingPrice - item.purchasePrice) * item.quantity
}

/**
 * Calculate MRP vs selling price delta per item.
 */
export function calcMrpVsSelling(item) {
  if (!item.mrp || item.mrp === 0) return 0
  return (item.mrp - item.sellingPrice) * item.quantity
}

/**
 * Calculate profit margin percentage for an item.
 */
export function calcItemMarginPct(item) {
  const revenue = item.sellingPrice * item.quantity
  if (revenue === 0) return 0
  return (calcItemProfit(item) / revenue) * 100
}

/**
 * Calculate full bill-level analytics.
 */
export function calcBillProfit(bill) {
  const itemsWithProfit = bill.items.map((item) => ({
    ...item,
    itemProfit: calcItemProfit(item),
    mrpVsSelling: calcMrpVsSelling(item),
    itemMarginPct: calcItemMarginPct(item),
  }))

  const grossProfit = itemsWithProfit.reduce((sum, item) => sum + item.itemProfit, 0)
  const totalDiscount = bill.discount || 0
  const netProfit = grossProfit - totalDiscount
  const taxableRevenue = bill.items.reduce((sum, item) => sum + item.sellingPrice * item.quantity, 0)
  const marginPct = taxableRevenue > 0 ? (netProfit / taxableRevenue) * 100 : 0
  const totalMrpVsSelling = itemsWithProfit.reduce((sum, item) => sum + item.mrpVsSelling, 0)

  return {
    ...bill,
    items: itemsWithProfit,
    grossProfit,
    netProfit,
    marginPct,
    totalMrpVsSelling,
    taxableRevenue,
  }
}

/**
 * Process all bills and return enriched rows plus summary totals.
 */
export function processBills(bills) {
  const enriched = bills.map(calcBillProfit)

  const summary = {
    totalRevenue: enriched.reduce((sum, bill) => sum + bill.totalAmount, 0),
    totalGrossProfit: enriched.reduce((sum, bill) => sum + bill.grossProfit, 0),
    totalNetProfit: enriched.reduce((sum, bill) => sum + bill.netProfit, 0),
    totalDiscount: enriched.reduce((sum, bill) => sum + (bill.discount || 0), 0),
    totalMrpDelta: enriched.reduce((sum, bill) => sum + bill.totalMrpVsSelling, 0),
    avgMarginPct: enriched.length
      ? enriched.reduce((sum, bill) => sum + bill.marginPct, 0) / enriched.length
      : 0,
    billCount: enriched.length,
  }

  return { enriched, summary }
}

/**
 * Filter bills by date range, party, and bill number search.
 */
export function filterBills(bills, { fromDate, toDate, party, search }) {
  return bills.filter((bill) => {
    const billDate = parseDateValue(bill.date)
    if (fromDate && billDate && billDate < new Date(fromDate)) return false
    if (toDate && billDate && billDate > new Date(toDate)) return false
    if (party && party !== 'All' && bill.partyName !== party) return false
    if (search && !String(bill.billNo || '').toLowerCase().includes(search.toLowerCase())) return false
    return true
  })
}

/**
 * Get unique party names from bill list.
 */
export function getPartyOptions(bills) {
  const names = [...new Set(bills.map((bill) => bill.partyName).filter(Boolean))].sort()
  return ['All', ...names]
}

/**
 * Format number as Indian currency.
 */
export function fmtRs(n) {
  if (n === undefined || n === null) return 'Rs0'
  return 'Rs' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })
}

/**
 * Format percentage with 2 decimal places.
 */
export function fmtPct(n) {
  return `${Number(n).toFixed(2)}%`
}

/**
 * Format date from ISO to readable DD MMM YYYY.
 */
export function fmtDate(iso) {
  if (!iso) return ''
  const parsed = parseDateValue(iso)
  if (!parsed) return String(iso)
  return parsed.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Generate a PDF-friendly plain text report string.
 */
export function generatePDFText(enrichedBills, summary) {
  const lines = [
    'BizLedger Pro - Bill-wise Profit Report',
    `Generated: ${new Date().toLocaleString('en-IN')}`,
    '='.repeat(60),
    '',
    'SUMMARY',
    `Total Revenue    : ${fmtRs(summary.totalRevenue)}`,
    `Gross Profit     : ${fmtRs(summary.totalGrossProfit)}`,
    `Total Discount   : ${fmtRs(summary.totalDiscount)}`,
    `Net Profit       : ${fmtRs(summary.totalNetProfit)}`,
    `Avg Margin       : ${fmtPct(summary.avgMarginPct)}`,
    '',
    'BILL-WISE DETAIL',
    '-'.repeat(60),
  ]

  enrichedBills.forEach((bill) => {
    lines.push(`${bill.billNo} | ${fmtDate(bill.date)} | ${bill.partyName}`)
    lines.push(`  Revenue: ${fmtRs(bill.totalAmount)} | Net Profit: ${fmtRs(bill.netProfit)} | Margin: ${fmtPct(bill.marginPct)}`)
    bill.items.forEach((item) => {
      lines.push(`    - ${item.productName} x ${item.quantity}  SP:${item.sellingPrice}  PP:${item.purchasePrice}  Profit:${fmtRs(item.itemProfit)}`)
    })
    lines.push('')
  })

  return lines.join('\n')
}

/**
 * Export to CSV.
 */
export function exportToCSV(enrichedBills) {
  const header = [
    'Bill No', 'Date', 'Party Name', 'Total Amount',
    'Gross Profit', 'Net Profit', 'Margin %',
    'Product', 'Qty', 'Purchase Price', 'Selling Price', 'MRP',
    'GST %', 'Item Profit', 'MRP vs Selling',
  ]

  const rows = []
  enrichedBills.forEach((bill) => {
    bill.items.forEach((item, index) => {
      rows.push([
        index === 0 ? bill.billNo : '',
        index === 0 ? fmtDate(bill.date) : '',
        index === 0 ? bill.partyName : '',
        index === 0 ? bill.totalAmount : '',
        index === 0 ? bill.grossProfit.toFixed(2) : '',
        index === 0 ? bill.netProfit.toFixed(2) : '',
        index === 0 ? bill.marginPct.toFixed(2) : '',
        item.productName,
        item.quantity,
        item.purchasePrice,
        item.sellingPrice,
        item.mrp || '',
        item.gstPercentage,
        item.itemProfit.toFixed(2),
        item.mrpVsSelling.toFixed(2),
      ])
    })
  })

  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `BillWiseProfitReport_${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
