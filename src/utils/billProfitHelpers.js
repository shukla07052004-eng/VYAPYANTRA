// ============================================================
// BizLedger Pro — Bill-wise Profit Helpers & Sample Data
// Pharma-focused distribution profit analytics
// ============================================================

// ── Sample Data ─────────────────────────────────────────────
export const SAMPLE_BILLS = [
  {
    billNo:      'INV-2025-118',
    date:        '2025-04-01',
    partyName:   'Sharma Traders',
    totalAmount: 48200,
    discount:    500,
    items: [
      { productName: 'Paracetamol 500mg (Strip×10)', quantity: 200, purchasePrice: 18,  sellingPrice: 28,  mrp: 32,  gstPercentage: 12 },
      { productName: 'Amoxicillin 250mg Capsule',    quantity: 80,  purchasePrice: 55,  sellingPrice: 78,  mrp: 90,  gstPercentage: 12 },
      { productName: 'Cough Syrup 100ml',             quantity: 60,  purchasePrice: 42,  sellingPrice: 62,  mrp: 70,  gstPercentage: 12 },
      { productName: 'Vitamin B-Complex Tabs',        quantity: 120, purchasePrice: 22,  sellingPrice: 35,  mrp: 40,  gstPercentage: 5  },
    ],
  },
  {
    billNo:      'INV-2025-117',
    date:        '2025-03-30',
    partyName:   'Gupta & Sons',
    totalAmount: 32500,
    discount:    0,
    items: [
      { productName: 'Metformin 500mg (Strip×15)',    quantity: 150, purchasePrice: 30,  sellingPrice: 48,  mrp: 55,  gstPercentage: 12 },
      { productName: 'Atorvastatin 10mg',             quantity: 90,  purchasePrice: 65,  sellingPrice: 95,  mrp: 110, gstPercentage: 12 },
      { productName: 'Omeprazole 20mg',               quantity: 100, purchasePrice: 28,  sellingPrice: 42,  mrp: 50,  gstPercentage: 12 },
    ],
  },
  {
    billNo:      'INV-2025-116',
    date:        '2025-03-28',
    partyName:   'Mehta Wholesale',
    totalAmount: 27800,
    discount:    300,
    items: [
      { productName: 'Ibuprofen 400mg',               quantity: 300, purchasePrice: 12,  sellingPrice: 19,  mrp: 22,  gstPercentage: 5  },
      { productName: 'Azithromycin 500mg',            quantity: 60,  purchasePrice: 88,  sellingPrice: 130, mrp: 145, gstPercentage: 12 },
      { productName: 'Cetirizine 10mg',               quantity: 200, purchasePrice: 8,   sellingPrice: 14,  mrp: 16,  gstPercentage: 5  },
    ],
  },
  {
    billNo:      'INV-2025-115',
    date:        '2025-03-25',
    partyName:   'Patel Distributors',
    totalAmount: 19400,
    discount:    200,
    items: [
      { productName: 'Pantoprazole 40mg',             quantity: 120, purchasePrice: 35,  sellingPrice: 55,  mrp: 62,  gstPercentage: 12 },
      { productName: 'Telmisartan 40mg',              quantity: 80,  purchasePrice: 48,  sellingPrice: 72,  mrp: 82,  gstPercentage: 12 },
      { productName: 'Multivitamin Syrup 200ml',      quantity: 40,  purchasePrice: 55,  sellingPrice: 82,  mrp: 95,  gstPercentage: 5  },
    ],
  },
  {
    billNo:      'INV-2025-114',
    date:        '2025-03-22',
    partyName:   'Joshi Brothers',
    totalAmount: 14200,
    discount:    0,
    items: [
      { productName: 'Doxycycline 100mg',             quantity: 80,  purchasePrice: 38,  sellingPrice: 58,  mrp: 68,  gstPercentage: 12 },
      { productName: 'Iron Folic Acid Tabs',          quantity: 200, purchasePrice: 14,  sellingPrice: 22,  mrp: 26,  gstPercentage: 5  },
      { productName: 'Calcium Carbonate 500mg',       quantity: 150, purchasePrice: 18,  sellingPrice: 28,  mrp: 32,  gstPercentage: 5  },
    ],
  },
  {
    billNo:      'INV-2025-113',
    date:        '2025-03-20',
    partyName:   'Singh Emporium',
    totalAmount: 9800,
    discount:    100,
    items: [
      { productName: 'Ranitidine 150mg',              quantity: 100, purchasePrice: 15,  sellingPrice: 24,  mrp: 28,  gstPercentage: 12 },
      { productName: 'Loperamide 2mg',                quantity: 60,  purchasePrice: 22,  sellingPrice: 34,  mrp: 40,  gstPercentage: 12 },
      { productName: 'ORS Sachet (Pack×20)',          quantity: 80,  purchasePrice: 28,  sellingPrice: 42,  mrp: 48,  gstPercentage: 5  },
    ],
  },
  {
    billNo:      'INV-2025-112',
    date:        '2025-02-18',
    partyName:   'Sharma Traders',
    totalAmount: 22600,
    discount:    250,
    items: [
      { productName: 'Glimepiride 2mg',               quantity: 120, purchasePrice: 32,  sellingPrice: 50,  mrp: 58,  gstPercentage: 12 },
      { productName: 'Losartan 50mg',                 quantity: 90,  purchasePrice: 42,  sellingPrice: 64,  mrp: 75,  gstPercentage: 12 },
      { productName: 'Folic Acid 5mg',                quantity: 200, purchasePrice: 10,  sellingPrice: 16,  mrp: 18,  gstPercentage: 5  },
    ],
  },
  {
    billNo:      'INV-2025-111',
    date:        '2025-02-14',
    partyName:   'Gupta & Sons',
    totalAmount: 31800,
    discount:    400,
    items: [
      { productName: 'Lisinopril 10mg',               quantity: 100, purchasePrice: 55,  sellingPrice: 82,  mrp: 95,  gstPercentage: 12 },
      { productName: 'Hydroxychloroquine 200mg',      quantity: 50,  purchasePrice: 95,  sellingPrice: 140, mrp: 160, gstPercentage: 12 },
      { productName: 'Zinc Sulphate 20mg',            quantity: 180, purchasePrice: 12,  sellingPrice: 20,  mrp: 24,  gstPercentage: 5  },
    ],
  },
]

// ── Pure calculation helpers ─────────────────────────────────

/**
 * Calculate profit for a single line item.
 * GST is NOT counted as profit — it's a tax pass-through.
 */
export function calcItemProfit(item) {
  const grossProfit = (item.sellingPrice - item.purchasePrice) * item.quantity
  return grossProfit
}

/**
 * Calculate MRP vs Selling Price delta per item.
 * Useful for pharma margin tracking.
 */
export function calcMrpVsSelling(item) {
  if (!item.mrp || item.mrp === 0) return 0
  return (item.mrp - item.sellingPrice) * item.quantity
}

/**
 * Calculate profit margin % for an item.
 */
export function calcItemMarginPct(item) {
  const revenue = item.sellingPrice * item.quantity
  if (revenue === 0) return 0
  const profit = calcItemProfit(item)
  return (profit / revenue) * 100
}

/**
 * Calculate full bill-level analytics.
 * Returns enriched bill object with profit metrics.
 */
export function calcBillProfit(bill) {
  const itemsWithProfit = bill.items.map(item => ({
    ...item,
    itemProfit:    calcItemProfit(item),
    mrpVsSelling:  calcMrpVsSelling(item),
    itemMarginPct: calcItemMarginPct(item),
  }))

  const grossProfit   = itemsWithProfit.reduce((sum, it) => sum + it.itemProfit, 0)
  const totalDiscount = bill.discount || 0
  const netProfit     = grossProfit - totalDiscount

  // Profit margin on actual selling amount (excl. GST)
  const taxableRevenue = bill.items.reduce((sum, it) => sum + it.sellingPrice * it.quantity, 0)
  const marginPct = taxableRevenue > 0 ? (netProfit / taxableRevenue) * 100 : 0

  const totalMrpVsSelling = itemsWithProfit.reduce((sum, it) => sum + it.mrpVsSelling, 0)

  return {
    ...bill,
    items:           itemsWithProfit,
    grossProfit,
    netProfit,
    marginPct,
    totalMrpVsSelling,
    taxableRevenue,
  }
}

/**
 * Process all bills and return enriched array + summary totals.
 */
export function processBills(bills) {
  const enriched = bills.map(calcBillProfit)

  const summary = {
    totalRevenue:      enriched.reduce((s, b) => s + b.totalAmount, 0),
    totalGrossProfit:  enriched.reduce((s, b) => s + b.grossProfit, 0),
    totalNetProfit:    enriched.reduce((s, b) => s + b.netProfit, 0),
    totalDiscount:     enriched.reduce((s, b) => s + (b.discount || 0), 0),
    totalMrpDelta:     enriched.reduce((s, b) => s + b.totalMrpVsSelling, 0),
    avgMarginPct:      enriched.length
      ? enriched.reduce((s, b) => s + b.marginPct, 0) / enriched.length
      : 0,
    billCount:         enriched.length,
  }

  return { enriched, summary }
}

/**
 * Filter bills by date range, party, and bill number search.
 */
export function filterBills(bills, { fromDate, toDate, party, search }) {
  return bills.filter(b => {
    const bDate = new Date(b.date)
    if (fromDate && bDate < new Date(fromDate)) return false
    if (toDate   && bDate > new Date(toDate))   return false
    if (party    && party !== 'All' && b.partyName !== party) return false
    if (search   && !b.billNo.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })
}

/**
 * Get unique party names from bill list.
 */
export function getPartyOptions(bills) {
  const names = [...new Set(bills.map(b => b.partyName))].sort()
  return ['All', ...names]
}

/**
 * Format number as Indian currency.
 */
export function fmtRs(n) {
  if (n === undefined || n === null) return '₹0'
  return '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })
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
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

/**
 * Generate PDF-friendly plain text report string (CA-grade).
 * In production, replace with jsPDF or react-pdf.
 */
export function generatePDFText(enrichedBills, summary) {
  const lines = [
    'BizLedger Pro — Bill-wise Profit Report',
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
  enrichedBills.forEach(b => {
    lines.push(`${b.billNo} | ${fmtDate(b.date)} | ${b.partyName}`)
    lines.push(`  Revenue: ${fmtRs(b.totalAmount)} | Net Profit: ${fmtRs(b.netProfit)} | Margin: ${fmtPct(b.marginPct)}`)
    b.items.forEach(it => {
      lines.push(`    • ${it.productName} × ${it.quantity}  SP:${it.sellingPrice}  PP:${it.purchasePrice}  Profit:${fmtRs(it.itemProfit)}`)
    })
    lines.push('')
  })
  return lines.join('\n')
}

/**
 * Export to CSV (Excel-compatible).
 */
export function exportToCSV(enrichedBills) {
  const header = [
    'Bill No', 'Date', 'Party Name', 'Total Amount',
    'Gross Profit', 'Net Profit', 'Margin %',
    'Product', 'Qty', 'Purchase Price', 'Selling Price', 'MRP',
    'GST %', 'Item Profit', 'MRP vs Selling',
  ]

  const rows = []
  enrichedBills.forEach(b => {
    b.items.forEach((it, i) => {
      rows.push([
        i === 0 ? b.billNo    : '',
        i === 0 ? fmtDate(b.date) : '',
        i === 0 ? b.partyName : '',
        i === 0 ? b.totalAmount : '',
        i === 0 ? b.grossProfit.toFixed(2) : '',
        i === 0 ? b.netProfit.toFixed(2)   : '',
        i === 0 ? b.marginPct.toFixed(2)   : '',
        it.productName,
        it.quantity,
        it.purchasePrice,
        it.sellingPrice,
        it.mrp || '',
        it.gstPercentage,
        it.itemProfit.toFixed(2),
        it.mrpVsSelling.toFixed(2),
      ])
    })
  })

  const csv = [header, ...rows]
    .map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `BillWiseProfitReport_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
