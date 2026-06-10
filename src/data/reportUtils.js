import { deriveStockLedger } from './stockData.js'

const MONTH_MAP = {
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
}

export function parseDateValue(dateValue) {
  if (!dateValue) return null
  if (dateValue instanceof Date) return Number.isNaN(dateValue.getTime()) ? null : dateValue

  if (typeof dateValue === 'string') {
    const isoLike = new Date(dateValue)
    if (!Number.isNaN(isoLike.getTime())) return isoLike

    const match = dateValue.trim().match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/)
    if (match) {
      const [, day, month, year] = match
      const monthIndex = MONTH_MAP[month.toLowerCase()]
      if (monthIndex !== undefined) {
        return new Date(Number(year), monthIndex, Number(day), 12)
      }
    }
  }

  return null
}

function toDayStamp(dateValue) {
  const parsed = parseDateValue(dateValue)
  return parsed ? new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()).getTime() : null
}

export function formatRangeLabel(fromDate, toDate) {
  if (fromDate && toDate) return `${fromDate} to ${toDate}`
  if (fromDate) return `From ${fromDate}`
  if (toDate) return `Until ${toDate}`
  return 'All dates'
}

const inRange = (dateValue, fromDate, toDate) => {
  if (!fromDate && !toDate) return true

  const value = toDayStamp(dateValue)
  if (!value) return true

  const fromValue = toDayStamp(fromDate)
  const toValue = toDayStamp(toDate)

  if (fromValue && value < fromValue) return false
  if (toValue && value > toValue) return false
  return true
}

export const filterRowsByDate = (rows = [], fromDate, toDate, key = 'date') =>
  rows.filter((row) => inRange(row[key], fromDate, toDate))

function getItemCost(item, purchasePriceMap) {
  const key = String(item.desc || '').trim().toLowerCase()
  const baseRate = purchasePriceMap.get(key) ?? Number(item.rate) ?? 0
  return (Number(item.qty) || 0) * (Number(baseRate) || 0)
}

function sumTax(rows = []) {
  return rows.reduce((sum, row) => sum + (Number(row.tax) || 0), 0)
}

function normalizeExpenseCategory(category = '') {
  const map = {
    salaries: 'Salary',
    salary: 'Salary',
    misc: 'Miscellaneous',
  }
  const lowered = String(category).trim().toLowerCase()
  if (!lowered) return 'Miscellaneous'
  return map[lowered] ?? category
}

function getMonthKey(dateValue) {
  const parsed = parseDateValue(dateValue)
  if (!parsed) return 'Unknown'
  return parsed.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
}

export function buildReportState({
  sales = [],
  purchases = [],
  parties = [],
  expenses = [],
  itemMaster = [],
  fromDate = '',
  toDate = '',
  partyFilter = 'All',
} = {}) {
  const filteredSales = filterRowsByDate(sales, fromDate, toDate)
    .filter((row) => partyFilter === 'All' || row.party === partyFilter)
  const filteredPurchases = filterRowsByDate(purchases, fromDate, toDate)
    .filter((row) => partyFilter === 'All' || row.supplier === partyFilter)
  const filteredExpenses = filterRowsByDate(expenses, fromDate, toDate).map((expense) => ({
    ...expense,
    category: normalizeExpenseCategory(expense.category),
  }))

  const stockLedger = deriveStockLedger(sales, purchases)
  const stockByName = new Map(stockLedger.map((row) => [String(row.item || '').toLowerCase(), row]))

  const itemMasterMap = new Map(
    itemMaster.map((item) => [String(item.name || '').toLowerCase(), item]),
  )

  const purchasePriceMap = new Map()
  filteredPurchases.forEach((purchase) => {
    purchase.items?.forEach((item) => {
      const key = String(item.desc || '').trim().toLowerCase()
      if (!key) return
      purchasePriceMap.set(key, Number(item.rate) || purchasePriceMap.get(key) || 0)
    })
  })

  itemMaster.forEach((item) => {
    const key = String(item.name || '').trim().toLowerCase()
    if (!key) return
    purchasePriceMap.set(key, Number(item.purchasePrice) || purchasePriceMap.get(key) || 0)
  })

  const totalSales = filteredSales.reduce((sum, row) => sum + (Number(row.total) || 0), 0)
  const totalPurchases = filteredPurchases.reduce((sum, row) => sum + (Number(row.amount) || 0), 0)
  const totalExpenses = filteredExpenses.reduce((sum, row) => sum + (Number(row.amount) || 0), 0)
  const purchasePaid = filteredPurchases.reduce((sum, row) => sum + (Number(row.paid) || 0), 0)
  const purchaseDue = filteredPurchases.reduce((sum, row) => {
    const amount = Number(row.amount) || 0
    const paid = Number(row.paid) || 0
    return sum + Math.max(amount - paid, 0)
  }, 0)

  const billWiseProfit = filteredSales.map((invoice) => {
    const purchaseCost = invoice.items?.reduce((sum, item) => sum + getItemCost(item, purchasePriceMap), 0) || 0
    const profitEarned = (Number(invoice.total) || 0) - purchaseCost
    return {
      ...invoice,
      customerName: invoice.party,
      salesAmount: Number(invoice.total) || 0,
      purchaseCost,
      profitEarned,
      profitPct: invoice.total ? (profitEarned / Number(invoice.total)) * 100 : 0,
      gstAmount: Number(invoice.tax) || 0,
    }
  })

  const itemWiseProfitMap = new Map()
  filteredSales.forEach((invoice) => {
    invoice.items?.forEach((item) => {
      const key = String(item.desc || '').trim()
      if (!key) return
      const quantity = Number(item.qty) || 0
      const saleValue = Number(item.amount) || quantity * (Number(item.rate) || 0)
      const purchaseCost = getItemCost(item, purchasePriceMap)
      const current = itemWiseProfitMap.get(key) ?? {
        itemName: key,
        quantitySold: 0,
        purchaseCost: 0,
        saleValue: 0,
        profitLoss: 0,
      }
      current.quantitySold += quantity
      current.purchaseCost += purchaseCost
      current.saleValue += saleValue
      current.profitLoss = current.saleValue - current.purchaseCost
      itemWiseProfitMap.set(key, current)
    })
  })

  const partyWiseProfit = parties.map((party) => {
    const partySales = billWiseProfit.filter((row) => row.party === party.name)
    const partyPurchases = filteredPurchases.filter((purchase) => purchase.supplier === party.name)
    const totalBusiness = partySales.reduce((sum, row) => sum + row.salesAmount, 0) + partyPurchases.reduce((sum, row) => sum + (Number(row.amount) || 0), 0)
    const grossFromSales = partySales.reduce((sum, row) => sum + row.profitEarned, 0)
    return {
      ...party,
      partyName: party.name,
      totalBusiness,
      profitGenerated: grossFromSales > 0 ? grossFromSales : 0,
      lossGenerated: grossFromSales < 0 ? Math.abs(grossFromSales) : 0,
      netMargin: totalBusiness ? (grossFromSales / totalBusiness) * 100 : 0,
    }
  }).filter((party) => party.totalBusiness > 0)

  const grossProfit = billWiseProfit.reduce((sum, row) => sum + row.profitEarned, 0)
  const netProfit = grossProfit - totalExpenses

  const partyStatement = parties.map((party) => {
    const partySales = filteredSales.filter((sale) => sale.party === party.name)
    const partyPurchases = filteredPurchases.filter((purchase) => purchase.supplier === party.name)
    const salesValue = partySales.reduce((sum, row) => sum + (Number(row.total) || 0), 0)
    const purchaseValue = partyPurchases.reduce((sum, row) => sum + (Number(row.amount) || 0), 0)
    return {
      ...party,
      salesValue,
      purchaseValue,
      invoices: partySales.length,
      purchases: partyPurchases.length,
      balanceValue: salesValue - purchaseValue,
    }
  })

  const expenseAnalysis = filteredExpenses.reduce((acc, expense) => {
    const category = normalizeExpenseCategory(expense.category)
    const current = acc.get(category) ?? { category, amount: 0, count: 0 }
    current.amount += Number(expense.amount) || 0
    current.count += 1
    acc.set(category, current)
    return acc
  }, new Map())

  const expenseTrend = filteredExpenses.reduce((acc, expense) => {
    const key = getMonthKey(expense.date)
    const current = acc.get(key) ?? { month: key, amount: 0 }
    current.amount += Number(expense.amount) || 0
    acc.set(key, current)
    return acc
  }, new Map())

  const averageDailyExpense = (() => {
    const activeDates = new Set(filteredExpenses.map((expense) => toDayStamp(expense.date)).filter(Boolean))
    if (!activeDates.size) return 0
    return totalExpenses / activeDates.size
  })()

  const highestExpenseCategory = Array.from(expenseAnalysis.values()).sort((a, b) => b.amount - a.amount)[0] ?? null

  const stockReport = stockLedger.map((row) => {
    const item = itemMasterMap.get(String(row.item || '').toLowerCase())
    const lastPurchase = [...purchases]
      .sort((a, b) => (toDayStamp(b.date) || 0) - (toDayStamp(a.date) || 0))
      .find((purchase) => purchase.items?.some((purchaseItem) => String(purchaseItem.desc || '').toLowerCase() === String(row.item || '').toLowerCase()))
    return {
      ...row,
      batchNo: item?.batchNo || lastPurchase?.id || '-',
      purchaseRate: Number(item?.purchasePrice) || Number(row.valuationRate) || 0,
      saleRate: Number(item?.salesPrice) || Number(item?.mrp) || Number(row.valuationRate) || 0,
      purchaseDate: item?.mfgDate || lastPurchase?.date || '-',
      expiryDate: item?.expiryDate || '-',
      currentStock: Number(item?.stockQty ?? row.closingQty) || 0,
    }
  })

  return {
    totals: {
      totalSales,
      totalPurchases,
      totalExpenses,
      grossProfit,
      netProfit,
      purchasePaid,
      purchaseDue,
      salesInvoices: filteredSales.length,
      purchaseInvoices: filteredPurchases.length,
      salesGST: sumTax(filteredSales),
      purchaseGST: sumTax(filteredPurchases),
      cashInflow: totalSales,
      cashOutflow: totalPurchases + totalExpenses,
      stockValue: stockReport.reduce((sum, row) => sum + (Number(row.currentStock) || 0) * (Number(row.purchaseRate) || 0), 0),
      averageDailyExpense,
    },
    filteredSales,
    filteredPurchases,
    filteredExpenses,
    billWiseProfit,
    itemWiseProfit: Array.from(itemWiseProfitMap.values()).sort((a, b) => b.profitLoss - a.profitLoss),
    partyWiseProfit: partyWiseProfit.sort((a, b) => b.totalBusiness - a.totalBusiness),
    partyStatement,
    expenseAnalysis: Array.from(expenseAnalysis.values()).sort((a, b) => b.amount - a.amount),
    expenseTrend: Array.from(expenseTrend.values()),
    highestExpenseCategory,
    stockReport,
    balanceSheet: {
      assets: totalSales + stockReport.reduce((sum, row) => sum + (Number(row.currentStock) || 0) * (Number(row.purchaseRate) || 0), 0),
      liabilities: totalPurchases,
      equity: netProfit,
    },
  }
}
