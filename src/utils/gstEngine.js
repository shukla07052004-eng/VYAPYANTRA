// ============================================================
// BizLedger Pro — GST Engine v2
// Production-grade GST calculation for Indian pharma/distribution
// Centralized logic: item-level tax, CGST/SGST/IGST, ITC, RCM
// ============================================================

// ── Constants ─────────────────────────────────────────────────

export const GST_SLABS    = [0, 5, 12, 18, 28]
export const STATE_CODES  = {
  '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab',
  '04': 'Chandigarh',      '05': 'Uttarakhand',      '06': 'Haryana',
  '07': 'Delhi',           '08': 'Rajasthan',         '09': 'Uttar Pradesh',
  '10': 'Bihar',           '11': 'Sikkim',            '12': 'Arunachal Pradesh',
  '13': 'Nagaland',        '14': 'Manipur',           '15': 'Mizoram',
  '16': 'Tripura',         '17': 'Meghalaya',         '18': 'Assam',
  '19': 'West Bengal',     '20': 'Jharkhand',         '21': 'Odisha',
  '22': 'Chhattisgarh',    '23': 'Madhya Pradesh',    '24': 'Gujarat',
  '27': 'Maharashtra',     '29': 'Karnataka',          '30': 'Goa',
  '31': 'Lakshadweep',     '32': 'Kerala',             '33': 'Tamil Nadu',
  '34': 'Puducherry',      '36': 'Telangana',          '37': 'Andhra Pradesh',
}

export const INVOICE_TYPES = {
  SALE:         'sale',
  PURCHASE:     'purchase',
  SALE_RETURN:  'sale_return',
  PURCH_RETURN: 'purchase_return',
  CREDIT_NOTE:  'credit_note',
  DEBIT_NOTE:   'debit_note',
}

export const SUPPLY_TYPES = {
  B2B:   'b2b',   // Registered buyer
  B2C:   'b2c',   // Unregistered / consumer
  SEZWP: 'sezwp', // SEZ with payment
  SEZWOP:'sezwop',// SEZ without payment
  EXP:   'export',
}

// ── Utility helpers ───────────────────────────────────────────

/** Extract 2-char state code from GSTIN */
export const stateCodeFromGSTIN = (gstin = '') => gstin.slice(0, 2)

/** Get state name from GSTIN */
export const stateNameFromGSTIN = (gstin = '') =>
  STATE_CODES[stateCodeFromGSTIN(gstin)] || 'Unknown'

/** Validate GSTIN format (basic) */
export const isValidGSTIN = (gstin = '') =>
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin)

/** Round to 2 decimal places (bank rounding) */
export const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100

/** Format as Indian Rs with 2 decimals */
export const fmtRs = (n) =>
  '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** Format date from any string to DD Mon YYYY */
export const fmtDate = (str) => {
  if (!str) return ''
  const d = new Date(str)
  return isNaN(d) ? str : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Core GST Calculator ───────────────────────────────────────

/**
 * Calculate tax for a single line item.
 *
 * @param {object} item
 *   - rate         : unit selling price (EXCLUSIVE of GST by default)
 *   - quantity     : number of units
 *   - gstRate      : GST % (5, 12, 18, 28)
 *   - discount     : line-level discount amount (₹), applied before tax
 *   - discountPct  : line-level discount % (alternative to discount ₹)
 *   - inclusive    : boolean — if true, rate already includes GST
 *   - mrp          : maximum retail price (optional)
 *   - hsnCode      : HSN/SAC code
 * @param {string} supplyType - 'INTRA' | 'INTER'
 * @param {boolean} rcm       - Reverse Charge Mechanism flag
 *
 * @returns Enriched item object with full tax breakdown
 */
export function calcItemTax(item, supplyType = 'INTRA', rcm = false) {
  const qty     = Number(item.quantity) || 0
  const gstRate = Number(item.gstRate)  || 0

  // Base price per unit (exclusive)
  let pricePerUnit = Number(item.rate) || 0
  if (item.inclusive && gstRate > 0) {
    // Back-calculate exclusive price from inclusive
    pricePerUnit = round2(pricePerUnit / (1 + gstRate / 100))
  }

  const grossAmount = round2(pricePerUnit * qty)

  // Discount
  let discountAmt = 0
  if (item.discountPct > 0) {
    discountAmt = round2(grossAmount * item.discountPct / 100)
  } else {
    discountAmt = round2(Number(item.discount) || 0)
  }

  const taxableValue = round2(grossAmount - discountAmt)

  // GST split
  const totalGST = round2(taxableValue * gstRate / 100)

  let cgst = 0, sgst = 0, igst = 0
  if (supplyType === 'INTRA') {
    cgst = round2(totalGST / 2)
    sgst = round2(totalGST / 2)
    // Fix rounding split
    if (cgst + sgst !== totalGST) sgst = round2(totalGST - cgst)
  } else {
    igst = totalGST
  }

  // RCM: tax liability shifts to buyer; mark accordingly
  const lineTotal = round2(taxableValue + totalGST)

  // Profit tracking (if purchase price provided)
  const purchasePrice = Number(item.purchasePrice) || 0
  const itemProfit = purchasePrice > 0
    ? round2((pricePerUnit - purchasePrice) * qty - discountAmt)
    : null

  return {
    ...item,
    pricePerUnit,
    grossAmount,
    discountAmt,
    taxableValue,
    gstRate,
    totalGST,
    cgst,
    sgst,
    igst,
    lineTotal,
    rcm,
    supplyType,
    itemProfit,
  }
}

/**
 * Calculate full invoice GST totals from enriched items.
 */
export function calcInvoiceTotals(enrichedItems, invoiceDiscount = 0) {
  const subtotal      = round2(enrichedItems.reduce((s, it) => s + it.taxableValue, 0))
  const totalCGST     = round2(enrichedItems.reduce((s, it) => s + it.cgst,         0))
  const totalSGST     = round2(enrichedItems.reduce((s, it) => s + it.sgst,         0))
  const totalIGST     = round2(enrichedItems.reduce((s, it) => s + it.igst,         0))
  const totalGST      = round2(totalCGST + totalSGST + totalIGST)
  const grossDiscount = round2(enrichedItems.reduce((s, it) => s + it.discountAmt,  0))
  const invoiceTotal  = round2(subtotal + totalGST - Number(invoiceDiscount || 0))

  return { subtotal, totalCGST, totalSGST, totalIGST, totalGST, grossDiscount, invoiceTotal }
}

/**
 * Process a full invoice — determines supply type, enriches items, computes totals.
 */
export function processInvoice(invoice, sellerGSTIN) {
  const sellerState = stateCodeFromGSTIN(sellerGSTIN)
  const buyerState  = stateCodeFromGSTIN(invoice.buyerGSTIN || invoice.gstin || '')
  const supplyType  = (buyerState && buyerState === sellerState) ? 'INTRA' : 'INTER'
  const rcm         = !!invoice.rcm

  const hasItems = Array.isArray(invoice.items) && invoice.items.length > 0

  let enrichedItems = []
  if (hasItems) {
    enrichedItems = invoice.items.map(it => calcItemTax(it, supplyType, rcm))
  } else {
    // Fallback: reconstruct from invoice-level tax field
    enrichedItems = [{
      productName:  invoice.party || 'Supply',
      quantity:     1,
      rate:         invoice.subtotal || invoice.total || 0,
      gstRate:      invoice.total && invoice.subtotal
        ? round2(((invoice.tax || 0) / invoice.subtotal) * 100)
        : 0,
      discount:     0,
      hsnCode:      invoice.hsnCode || '',
      pricePerUnit: invoice.subtotal || invoice.total || 0,
      grossAmount:  invoice.subtotal || invoice.total || 0,
      discountAmt:  0,
      taxableValue: invoice.subtotal || invoice.total || 0,
      totalGST:     invoice.tax || 0,
      cgst:         supplyType === 'INTRA' ? round2((invoice.tax || 0) / 2) : 0,
      sgst:         supplyType === 'INTRA' ? round2((invoice.tax || 0) / 2) : 0,
      igst:         supplyType === 'INTER' ? invoice.tax || 0 : 0,
      lineTotal:    invoice.total || 0,
      rcm,
      supplyType,
      itemProfit:   null,
    }]
  }

  const totals = calcInvoiceTotals(enrichedItems, invoice.invoiceDiscount)

  // Supply category for GSTR-1
  const buyerGSTIN  = invoice.buyerGSTIN || invoice.gstin || ''
  const supplyCategory = !buyerGSTIN
    ? SUPPLY_TYPES.B2C
    : invoice.sez
    ? SUPPLY_TYPES.SEZWP
    : SUPPLY_TYPES.B2B

  return {
    ...invoice,
    supplyType,
    supplyCategory,
    buyerGSTIN,
    sellerState,
    buyerState,
    rcm,
    enrichedItems,
    ...totals,
  }
}

// ── ITC Engine ────────────────────────────────────────────────

/**
 * Calculate Input Tax Credit from purchase invoices.
 * ITC = sum of CGST + SGST + IGST on purchases (eligible only)
 */
export function calcITC(purchases, sellerGSTIN) {
  const eligible = purchases.filter(p =>
    p.status !== 'Cancelled' &&
    !p.rcm &&  // RCM ITC handled separately
    isValidGSTIN(p.supplierGSTIN || '')
  )

  const processed = eligible.map(p => processInvoice({
    ...p,
    buyerGSTIN: sellerGSTIN,
    gstin:      p.supplierGSTIN || '',
    items:      p.items || [],
    subtotal:   p.subtotal || p.amount,
    tax:        p.tax || 0,
    total:      p.amount,
  }, p.supplierGSTIN || p.gstin || ''))

  return {
    itcCGST:    round2(processed.reduce((s, p) => s + p.totalCGST, 0)),
    itcSGST:    round2(processed.reduce((s, p) => s + p.totalSGST, 0)),
    itcIGST:    round2(processed.reduce((s, p) => s + p.totalIGST, 0)),
    itcTotal:   round2(processed.reduce((s, p) => s + p.totalGST,  0)),
    eligibleCount: eligible.length,
    processed,
  }
}

/**
 * Calculate net GST payable.
 * Net = Output GST - ITC (CGST vs CGST, SGST vs SGST, IGST vs IGST+CGST)
 */
export function calcNetGST(outputTotals, itc) {
  const netCGST = round2(Math.max(0, outputTotals.totalCGST - itc.itcCGST))
  const netSGST = round2(Math.max(0, outputTotals.totalSGST - itc.itcSGST))
  const netIGST = round2(Math.max(0, outputTotals.totalIGST - itc.itcIGST))
  return {
    netCGST, netSGST, netIGST,
    netTotal: round2(netCGST + netSGST + netIGST),
    itcUtilized: round2(itc.itcTotal - Math.max(0, itc.itcTotal - (outputTotals.totalGST))),
  }
}

// ── HSN Summary Engine ────────────────────────────────────────

/**
 * Build HSN-wise summary from processed invoices (GSTR-1 Table 12).
 */
export function buildHSNSummary(processedInvoices) {
  const map = {}

  processedInvoices.forEach(inv => {
    inv.enrichedItems.forEach(it => {
      const key = `${it.hsnCode || 'NA'}_${it.gstRate}`
      if (!map[key]) {
        map[key] = {
          hsnCode:     it.hsnCode || 'NA',
          description: it.productName || '',
          gstRate:     it.gstRate,
          quantity:    0,
          taxableValue:0,
          cgst:        0,
          sgst:        0,
          igst:        0,
          totalGST:    0,
        }
      }
      map[key].quantity     += Number(it.quantity) || 0
      map[key].taxableValue += it.taxableValue
      map[key].cgst         += it.cgst
      map[key].sgst         += it.sgst
      map[key].igst         += it.igst
      map[key].totalGST     += it.totalGST
    })
  })

  return Object.values(map).map(row => ({
    ...row,
    taxableValue: round2(row.taxableValue),
    cgst:         round2(row.cgst),
    sgst:         round2(row.sgst),
    igst:         round2(row.igst),
    totalGST:     round2(row.totalGST),
  })).sort((a, b) => a.hsnCode.localeCompare(b.hsnCode))
}

// ── GSTR-1 Builder ────────────────────────────────────────────

/**
 * Build GSTR-1 structure (B2B, B2CS, CDNR, HSN).
 */
export function buildGSTR1(processedSales) {
  const b2b  = processedSales.filter(i => i.supplyCategory === SUPPLY_TYPES.B2B && i.invoiceType !== INVOICE_TYPES.CREDIT_NOTE && i.invoiceType !== INVOICE_TYPES.DEBIT_NOTE)
  const b2c  = processedSales.filter(i => i.supplyCategory === SUPPLY_TYPES.B2C)
  const cdnr = processedSales.filter(i => i.invoiceType === INVOICE_TYPES.CREDIT_NOTE || i.invoiceType === INVOICE_TYPES.DEBIT_NOTE)

  return {
    b2b: b2b.map(inv => ({
      gstin:       inv.buyerGSTIN,
      partyName:   inv.party,
      invoiceNo:   inv.id,
      invoiceDate: inv.date,
      invoiceValue:inv.invoiceTotal,
      placeOfSupply: inv.buyerState,
      reverseCharge: inv.rcm ? 'Y' : 'N',
      supplyType:  inv.supplyType,
      taxableValue:inv.subtotal,
      cgst:        inv.totalCGST,
      sgst:        inv.totalSGST,
      igst:        inv.totalIGST,
    })),
    b2c: b2c.map(inv => ({
      supplyType:   inv.supplyType,
      taxableValue: inv.subtotal,
      cgst:         inv.totalCGST,
      sgst:         inv.totalSGST,
      igst:         inv.totalIGST,
      invoiceValue: inv.invoiceTotal,
    })),
    cdnr: cdnr.map(inv => ({
      gstin:       inv.buyerGSTIN,
      partyName:   inv.party,
      noteNo:      inv.id,
      noteDate:    inv.date,
      noteType:    inv.invoiceType === INVOICE_TYPES.CREDIT_NOTE ? 'C' : 'D',
      taxableValue:inv.subtotal,
      cgst:        inv.totalCGST,
      sgst:        inv.totalSGST,
      igst:        inv.totalIGST,
    })),
    hsn: buildHSNSummary(processedSales),
  }
}

// ── GSTR-3B Builder ───────────────────────────────────────────

/**
 * Build GSTR-3B summary (Table 3.1, 4, 5).
 */
export function buildGSTR3B(processedSales, itcData) {
  const outwardTaxable = processedSales.filter(i =>
    i.invoiceType !== INVOICE_TYPES.SALE_RETURN &&
    i.invoiceType !== INVOICE_TYPES.CREDIT_NOTE
  )

  const returns = processedSales.filter(i =>
    i.invoiceType === INVOICE_TYPES.SALE_RETURN ||
    i.invoiceType === INVOICE_TYPES.CREDIT_NOTE
  )

  const outCGST = round2(outwardTaxable.reduce((s, i) => s + i.totalCGST, 0))
  const outSGST = round2(outwardTaxable.reduce((s, i) => s + i.totalSGST, 0))
  const outIGST = round2(outwardTaxable.reduce((s, i) => s + i.totalIGST, 0))

  const retCGST = round2(returns.reduce((s, i) => s + i.totalCGST, 0))
  const retSGST = round2(returns.reduce((s, i) => s + i.totalSGST, 0))
  const retIGST = round2(returns.reduce((s, i) => s + i.totalIGST, 0))

  const netOut = {
    taxableValue: round2(outwardTaxable.reduce((s, i) => s + i.subtotal, 0) - returns.reduce((s, i) => s + i.subtotal, 0)),
    cgst: round2(outCGST - retCGST),
    sgst: round2(outSGST - retSGST),
    igst: round2(outIGST - retIGST),
  }

  const netGST = calcNetGST(
    { totalCGST: netOut.cgst, totalSGST: netOut.sgst, totalIGST: netOut.igst, totalGST: round2(netOut.cgst + netOut.sgst + netOut.igst) },
    itcData
  )

  return {
    table31: {
      outwardTaxable: netOut,
      zeroRated:      { taxableValue: 0, igst: 0 },
      nilRated:       { taxableValue: round2(processedSales.filter(i => i.enrichedItems.every(it => it.gstRate === 0)).reduce((s, i) => s + i.subtotal, 0)) },
      rcm:            { cgst: 0, sgst: 0, igst: 0 },
    },
    table4: {
      itcAvailable: {
        importGoods: { igst: 0 },
        importServices: { igst: 0 },
        inward:     { cgst: itcData.itcCGST, sgst: itcData.itcSGST, igst: itcData.itcIGST },
        inwardRCM:  { cgst: 0, sgst: 0, igst: 0 },
      },
      totalITC: itcData.itcTotal,
    },
    table5: {
      netCGST:  netGST.netCGST,
      netSGST:  netGST.netSGST,
      netIGST:  netGST.netIGST,
      netTotal: netGST.netTotal,
    },
  }
}

// ── Party-wise GST Summary ────────────────────────────────────

export function buildPartyWiseGST(processedInvoices) {
  const map = {}
  processedInvoices.forEach(inv => {
    const key = inv.buyerGSTIN || inv.party
    if (!map[key]) {
      map[key] = {
        partyName:    inv.party,
        gstin:        inv.buyerGSTIN || '',
        invoiceCount: 0,
        taxableValue: 0,
        cgst: 0, sgst: 0, igst: 0,
        totalGST: 0, invoiceTotal: 0,
      }
    }
    map[key].invoiceCount++
    map[key].taxableValue += inv.subtotal     || 0
    map[key].cgst         += inv.totalCGST    || 0
    map[key].sgst         += inv.totalSGST    || 0
    map[key].igst         += inv.totalIGST    || 0
    map[key].totalGST     += inv.totalGST     || 0
    map[key].invoiceTotal += inv.invoiceTotal || inv.total || 0
  })

  return Object.values(map).map(p => ({
    ...p,
    taxableValue: round2(p.taxableValue),
    cgst:         round2(p.cgst),
    sgst:         round2(p.sgst),
    igst:         round2(p.igst),
    totalGST:     round2(p.totalGST),
    invoiceTotal: round2(p.invoiceTotal),
  })).sort((a, b) => b.invoiceTotal - a.invoiceTotal)
}

// ── Monthly Summary ───────────────────────────────────────────

export function buildMonthlySummary(processedInvoices) {
  const map = {}
  processedInvoices.forEach(inv => {
    const d = new Date(inv.date)
    if (isNaN(d)) return
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
    if (!map[key]) map[key] = { key, label, taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0, count: 0 }
    map[key].taxable += inv.subtotal || 0
    map[key].cgst    += inv.totalCGST || 0
    map[key].sgst    += inv.totalSGST || 0
    map[key].igst    += inv.totalIGST || 0
    map[key].total   += inv.totalGST  || 0
    map[key].count   += 1
  })
  return Object.values(map)
    .map(m => ({ ...m, taxable: round2(m.taxable), cgst: round2(m.cgst), sgst: round2(m.sgst), igst: round2(m.igst), total: round2(m.total) }))
    .sort((a, b) => a.key.localeCompare(b.key))
}

// ── Export Utilities ──────────────────────────────────────────

export function downloadCSV(rows, headers, filename) {
  const csv = [headers, ...rows]
    .map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function exportGSTR1CSV(gstr1) {
  const rows = gstr1.b2b.map(r => [
    r.gstin, r.partyName, r.invoiceNo, fmtDate(r.invoiceDate),
    r.invoiceValue, r.reverseCharge, r.taxableValue,
    r.cgst, r.sgst, r.igst,
  ])
  downloadCSV(rows,
    ['GSTIN', 'Party Name', 'Invoice No', 'Date', 'Invoice Value', 'RC', 'Taxable', 'CGST', 'SGST', 'IGST'],
    'GSTR1_B2B'
  )
}

export function exportBillwiseGSTCSV(invoices) {
  const rows = invoices.map(r => [
    r.id, fmtDate(r.date), r.party, r.buyerGSTIN || '', r.supplyType,
    r.subtotal, r.totalCGST, r.totalSGST, r.totalIGST, r.totalGST, r.invoiceTotal || r.total,
  ])
  downloadCSV(rows,
    ['Invoice No', 'Date', 'Party', 'GSTIN', 'Supply Type', 'Taxable', 'CGST', 'SGST', 'IGST', 'Total Tax', 'Invoice Total'],
    'GST_Billwise'
  )
}

export function exportHSNCSV(hsnRows) {
  const rows = hsnRows.map(r => [r.hsnCode, r.description, r.gstRate + '%', r.quantity, r.taxableValue, r.cgst, r.sgst, r.igst, r.totalGST])
  downloadCSV(rows, ['HSN Code', 'Description', 'GST Rate', 'Quantity', 'Taxable Value', 'CGST', 'SGST', 'IGST', 'Total Tax'], 'HSN_Summary')
}

export function exportPartyCSV(partyRows) {
  const rows = partyRows.map(r => [r.partyName, r.gstin, r.invoiceCount, r.taxableValue, r.cgst, r.sgst, r.igst, r.totalGST, r.invoiceTotal])
  downloadCSV(rows, ['Party', 'GSTIN', 'Invoices', 'Taxable', 'CGST', 'SGST', 'IGST', 'Total GST', 'Total Value'], 'Party_GST')
}

export function exportPlainTextReport(title, lines) {
  const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${title}_${new Date().toISOString().slice(0, 10)}.txt`
  a.click()
  URL.revokeObjectURL(url)
}
