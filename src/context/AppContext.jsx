import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { createInvoiceRecord } from '../data/salesData.js'
import { createPartyRecord } from '../data/partyData.js'
import { createPurchaseRecord } from '../data/purchaseData.js'
import { createExpenseRecord } from '../data/expenseData.js'
import { loadErpState, saveErpState } from '../data/store.js'
import {
  buildNormalizedErpData,
  importErpData,
  normalizePersistedState,
  resetRuntimeErpState,
} from '../data/dataManager.js'
import { buildReportState } from '../data/reportUtils.js'
import { deriveStockLedger } from '../data/stockData.js'
import {
  SAMPLE_BACKUP_SETTINGS,
  SAMPLE_BANK_ACCOUNTS,
  SAMPLE_CASH_TRANSACTIONS,
  SAMPLE_CHECKS,
  SAMPLE_COMPANIES,
  SAMPLE_LOANS,
  SHARED_COMPANIES,
} from '../data/erpModules.js'
import { genInvoiceId } from '../utils/helpers.js'

const AppContext = createContext(null)

function buildInitialItemMaster({ sales, purchases }) {
  const stockLedger = deriveStockLedger(sales, purchases)
  const byName = new Map()

  stockLedger.forEach((row, index) => {
    byName.set(row.item.toLowerCase(), {
      id: row.sku || `itm-${index + 1}`,
      name: row.item,
      category: guessCategory(row.item),
      batchNo: '',
      mfgDate: '',
      expiryDate: '',
      expiryAlert: true,
      gstSlab: row.gstSlab ?? 18,
      gst: row.gstSlab ?? 18,
      purchasePrice: row.valuationRate || 0,
      salesPrice: row.valuationRate || 0,
      mrp: row.valuationRate || 0,
      stockQty: row.closingQty,
      discount: 0,
      unitType: 'Nos',
      barcode: '',
      hsn: row.hsn || '',
      notes: '',
      status: row.closingQty > 0 ? 'Active' : 'Inactive',
      recentScore: 0,
      recentUsedOn: '',
      recentEditedOn: '',
      deleted: false,
      version: 1,
    })
  })

  const ingestEntries = (entries = [], type) => {
    entries.forEach((entry) => {
      entry.items?.forEach((item) => {
        const key = String(item.desc || '').trim().toLowerCase()
        if (!key) return
        const current = byName.get(key) ?? {
          id: `itm-${byName.size + 1}`,
          name: item.desc,
          category: 'Other Goods',
          batchNo: '',
          mfgDate: '',
          expiryDate: '',
          expiryAlert: true,
          gstSlab: Number(item.taxPct) || 18,
          gst: Number(item.taxPct) || 18,
          purchasePrice: Number(item.rate) || 0,
          salesPrice: Number(item.rate) || 0,
          mrp: Number(item.rate) || 0,
          stockQty: 0,
          discount: Number(item.discountPct) || 0,
          unitType: 'Nos',
          barcode: '',
          hsn: item.hsn || '',
          notesTag: '',
          notes: '',
          status: 'Active',
          recentScore: 0,
          recentUsedOn: '',
          recentEditedOn: '',
          deleted: false,
          version: 1,
        }

        byName.set(key, {
          ...current,
          hsn: current.hsn || item.hsn || '',
          gstSlab: Number(item.taxPct) || current.gstSlab || 18,
          gst: Number(item.taxPct) || current.gst || current.gstSlab || 18,
          purchasePrice: type === 'purchase' ? (Number(item.rate) || current.purchasePrice) : current.purchasePrice,
          salesPrice: type === 'sales' ? (Number(item.rate) || current.salesPrice) : current.salesPrice,
          mrp: current.mrp || Number(item.rate) || 0,
          discount: current.discount || Number(item.discountPct) || 0,
          recentScore: current.recentScore + 1,
          recentUsedOn: entry.date || current.recentUsedOn,
        })
      })
    })
  }

  ingestEntries(sales, 'sales')
  ingestEntries(purchases, 'purchase')

  return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name))
}

export function AppProvider({ children }) {
  const initialErpState = useMemo(() => normalizePersistedState(loadErpState()), [])
  const [invoices, setInvoices] = useState(initialErpState.invoices)
  const [parties, setParties] = useState(initialErpState.parties)
  const [purchases, setPurchases] = useState(initialErpState.purchases)
  const [expenses, setExpenses] = useState(initialErpState.expenses)
  const [workers, setWorkers] = useState(initialErpState.workers)
  const [revenueData, setRevenueData] = useState(initialErpState.revenueData)
  const [importMeta, setImportMeta] = useState(initialErpState.importMeta)
  const [companies, setCompanies] = useState(SAMPLE_COMPANIES)
  const [sharedCompanies] = useState(SHARED_COMPANIES)
  const [loans, setLoans] = useState(SAMPLE_LOANS)
  const [checks] = useState(SAMPLE_CHECKS)
  const [bankAccounts, setBankAccounts] = useState(SAMPLE_BANK_ACCOUNTS)
  const [cashTransactions] = useState(SAMPLE_CASH_TRANSACTIONS)
  const [backupSettings, setBackupSettings] = useState(SAMPLE_BACKUP_SETTINGS)
  const [items, setItems] = useState(() => {
    if (initialErpState.items?.length) return initialErpState.items
    return buildInitialItemMaster({ sales: initialErpState.invoices, purchases: initialErpState.purchases })
  })

  useEffect(() => {
    saveErpState({
      version: initialErpState.version,
      invoices,
      parties,
      purchases,
      expenses,
      workers,
      items,
      revenueData,
      importMeta,
      business: initialErpState.business,
      cashEntries: initialErpState.cashEntries,
      bankEntries: initialErpState.bankEntries,
      backups: initialErpState.backups,
    })
  }, [expenses, importMeta, initialErpState, invoices, items, parties, purchases, revenueData, workers])

  const undoStack = useRef([])
  const pushUndo = (fn) => {
    undoStack.current = [fn, ...undoStack.current].slice(0, 20)
  }

  const touchItemsFromDocument = useCallback((lineItems = [], dateLabel = '') => {
    setItems((prev) => {
      const existingByName = new Map(prev.map((item) => [item.name.toLowerCase(), item]))
      lineItems.forEach((line) => {
        const key = String(line.desc || '').trim().toLowerCase()
        if (!key) return
        const current = existingByName.get(key)
        if (current) {
          existingByName.set(key, {
            ...current,
            hsn: current.hsn || line.hsn || '',
            gstSlab: Number(line.taxPct) || current.gstSlab || 18,
            gst: Number(line.taxPct) || current.gst || current.gstSlab || 18,
            purchasePrice: Number(line.rate) || current.purchasePrice,
            salesPrice: Number(line.rate) || current.salesPrice,
            mrp: current.mrp || Number(line.rate) || 0,
            discount: current.discount || Number(line.discountPct) || 0,
            recentScore: (current.recentScore || 0) + 5,
            recentUsedOn: dateLabel || current.recentUsedOn,
            status: current.status || 'Active',
          })
          return
        }
        existingByName.set(key, {
          id: `itm-${Date.now()}-${existingByName.size + 1}`,
          name: line.desc,
          category: 'Other Goods',
          batchNo: '',
          mfgDate: '',
          expiryDate: '',
          expiryAlert: true,
          gstSlab: Number(line.taxPct) || 18,
          gst: Number(line.taxPct) || 18,
          purchasePrice: Number(line.rate) || 0,
          salesPrice: Number(line.rate) || 0,
          mrp: Number(line.rate) || 0,
          stockQty: 0,
          discount: Number(line.discountPct) || 0,
          unitType: 'Nos',
          barcode: '',
          hsn: line.hsn || '',
          notesTag: '',
          notes: '',
          status: 'Active',
          recentScore: 5,
          recentUsedOn: dateLabel,
          recentEditedOn: '',
          deleted: false,
          version: 1,
        })
      })
      return Array.from(existingByName.values())
    })
  }, [])

  const addInvoice = useCallback((invoice) => {
    const id = genInvoiceId(invoices)
    const nextInvoice = createInvoiceRecord(invoice, id)
    setInvoices((prev) => {
      pushUndo(() => setInvoices((current) => current.filter((row) => row.id !== id)))
      return [nextInvoice, ...prev]
    })
    touchItemsFromDocument(nextInvoice.items, nextInvoice.date)
    return nextInvoice
  }, [invoices, touchItemsFromDocument])

  const recordPayment = useCallback((invoiceId, amount) => {
    setInvoices((prev) => prev.map((invoice) => {
      if (invoice.id !== invoiceId) return invoice
      const newPaid = invoice.paid + parseFloat(amount)
      const status = newPaid >= invoice.total ? 'Paid' : newPaid > 0 ? 'Partial' : 'Pending'
      return { ...invoice, paid: newPaid, status }
    }))
  }, [])

  const deleteInvoice = useCallback((invoiceId) => {
    setInvoices((prev) => {
      const deleted = prev.find((invoice) => invoice.id === invoiceId)
      pushUndo(() => setInvoices((current) => [deleted, ...current]))
      return prev.filter((invoice) => invoice.id !== invoiceId)
    })
  }, [])

  const addParty = useCallback((party) => {
    setParties((prev) => [...prev, createPartyRecord(party)])
  }, [])

  const updateParty = useCallback((partyId, updates) => {
    setParties((prev) => prev.map((party) => (
      party.id === partyId ? { ...party, ...updates } : party
    )))
  }, [])

  const addPurchase = useCallback((purchase) => {
    const nextPurchase = createPurchaseRecord(purchase)
    setPurchases((prev) => [nextPurchase, ...prev])
    touchItemsFromDocument(nextPurchase.items, nextPurchase.date)
  }, [touchItemsFromDocument])

  const getPartyPurchases = useCallback((supplierName) =>
    purchases.filter((purchase) => purchase.supplier?.toLowerCase() === supplierName?.toLowerCase())
  , [purchases])

  const addExpense = useCallback((expense) => {
    setExpenses((prev) => [createExpenseRecord(expense), ...prev])
  }, [])

  const addWorker = useCallback((worker) => {
    setWorkers((prev) => [...prev, {
      ...worker,
      id: Date.now(),
      advance: 0,
      paid: false,
    }])
  }, [])

  const paySalary = useCallback((workerId) => {
    setWorkers((prev) => prev.map((worker) => (
      worker.id === workerId ? { ...worker, paid: true } : worker
    )))
  }, [])

  const recordAdvance = useCallback((workerId, amount) => {
    setWorkers((prev) => prev.map((worker) => (
      worker.id === workerId ? { ...worker, advance: (worker.advance || 0) + amount } : worker
    )))
  }, [])

  const addCompany = useCallback((company) => {
    setCompanies((prev) => [
      {
        id: `cmp-${Date.now()}`,
        sharedDate: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        accessType: 'Owner',
        name: company.companyName,
        owner: company.ownerName,
        ...company,
      },
      ...prev,
    ])
  }, [])

  const saveBackupSettings = useCallback((settings) => {
    setBackupSettings((current) => ({ ...current, ...settings }))
  }, [])

  const upsertLoan = useCallback((payload) => {
    setLoans((prev) => {
      const existing = prev.find((loan) => loan.id === payload.id)
      if (existing) return prev.map((loan) => (loan.id === payload.id ? { ...loan, ...payload } : loan))
      return [{ ...payload, id: payload.id ?? `loan-${Date.now()}` }, ...prev]
    })
  }, [])

  const deleteLoan = useCallback((loanId) => {
    setLoans((prev) => prev.filter((loan) => loan.id !== loanId))
  }, [])

  const upsertBankAccount = useCallback((payload) => {
    setBankAccounts((prev) => {
      const existing = prev.find((account) => account.id === payload.id)
      if (existing) return prev.map((account) => (account.id === payload.id ? { ...account, ...payload } : account))
      return [{ ...payload, id: payload.id ?? `bank-${Date.now()}` }, ...prev]
    })
  }, [])

  const deleteBankAccount = useCallback((accountId) => {
    setBankAccounts((prev) => prev.filter((account) => account.id !== accountId))
  }, [])

  const addItem = useCallback((item) => {
    setItems((prev) => [
      {
        id: `itm-${Date.now()}`,
        recentScore: 2,
        recentUsedOn: '',
        recentEditedOn: todayStamp(),
        deleted: false,
        version: 1,
        batchNo: item.batchNo || '',
        mfgDate: item.mfgDate || '',
        expiryDate: item.expiryDate || '',
        expiryAlert: item.expiryAlert !== false,
        gst: item.gst ?? item.gstSlab ?? 18,
        mrp: item.mrp ?? item.salesPrice ?? 0,
        discount: item.discount ?? 0,
        notesTag: item.notesTag || '',
        notes: item.notes || '',
        ...item,
      },
      ...prev,
    ])
  }, [])

  const updateItem = useCallback((itemId, updates) => {
    setItems((prev) => prev.map((item) => (
      item.id === itemId
        ? {
            ...item,
            ...updates,
            version: (item.version || 1) + 1,
            recentScore: (item.recentScore || 0) + 3,
            recentEditedOn: todayStamp(),
          }
        : item
    )))
  }, [])

  const deleteItem = useCallback((itemId) => {
    setItems((prev) => prev.map((item) => (
      item.id === itemId
        ? { ...item, deleted: true, status: 'Deleted', recentEditedOn: todayStamp() }
        : item
    )))
  }, [])

  const touchRecentItem = useCallback((itemId, reason = 'used') => {
    setItems((prev) => prev.map((item) => (
      item.id === itemId
        ? {
            ...item,
            recentScore: (item.recentScore || 0) + (reason === 'edited' ? 4 : 6),
            recentUsedOn: reason === 'used' ? todayStamp() : item.recentUsedOn,
            recentEditedOn: reason === 'edited' ? todayStamp() : item.recentEditedOn,
          }
        : item
    )))
  }, [])

  const undo = useCallback(() => {
    const fn = undoStack.current.shift()
    if (fn) fn()
  }, [])

  const getStateSnapshot = useCallback(() => normalizePersistedState({
    ...initialErpState,
    invoices,
    parties,
    purchases,
    expenses,
    workers,
    items,
    revenueData,
    importMeta,
  }), [expenses, importMeta, initialErpState, invoices, items, parties, purchases, revenueData, workers])

  const applyStateSnapshot = useCallback((state) => {
    const normalized = normalizePersistedState(state)
    setInvoices(normalized.invoices)
    setParties(normalized.parties)
    setPurchases(normalized.purchases)
    setExpenses(normalized.expenses)
    setWorkers(normalized.workers)
    setItems(normalized.items?.length ? normalized.items : buildInitialItemMaster({ sales: normalized.invoices, purchases: normalized.purchases }))
    setRevenueData(normalized.revenueData)
    setImportMeta(normalized.importMeta)
  }, [])

  const importData = useCallback((importResult, options = {}) => {
    const outcome = importErpData(getStateSnapshot(), importResult, options)
    if (!outcome.ok) return outcome
    applyStateSnapshot(outcome.state)
    return { ok: true, errors: [], stats: outcome.stats }
  }, [applyStateSnapshot, getStateSnapshot])

  const importFromParsedPayload = useCallback((importResult, options = {}) =>
    importData(importResult, options)
  , [importData])

  const clearImportedData = useCallback(() => {
    const defaults = resetRuntimeErpState()
    applyStateSnapshot(defaults)
    return defaults
  }, [applyStateSnapshot])

  const getPartyInvoices = useCallback((partyName) =>
    invoices.filter((invoice) => invoice.party === partyName)
  , [invoices])

  const getPartyProfit = useCallback((partyName) => {
    const sales = invoices.filter((invoice) => invoice.party === partyName).reduce((sum, invoice) => sum + invoice.total, 0)
    const purchaseTotal = purchases.filter((purchase) => purchase.supplier === partyName).reduce((sum, purchase) => sum + purchase.amount, 0)
    return { sales, purchases: purchaseTotal, net: sales - purchaseTotal }
  }, [invoices, purchases])

  const stockLedger = useMemo(() => deriveStockLedger(invoices, purchases), [invoices, purchases])

  const itemMaster = useMemo(() => {
    const stockByName = new Map(stockLedger.map((row) => [row.item.toLowerCase(), row]))
    return items
      .filter((item) => !item.deleted)
      .map((item) => {
        const stockRow = stockByName.get(item.name.toLowerCase())
        return {
          ...item,
          stockQty: stockRow?.closingQty ?? item.stockQty ?? 0,
          purchasePrice: item.purchasePrice ?? stockRow?.valuationRate ?? 0,
          salesPrice: item.salesPrice ?? stockRow?.valuationRate ?? 0,
          mrp: item.mrp ?? item.salesPrice ?? item.purchasePrice ?? stockRow?.valuationRate ?? 0,
          discount: item.discount ?? 0,
          gst: item.gst ?? item.gstSlab ?? 0,
          batchNo: item.batchNo || '',
          mfgDate: item.mfgDate || '',
          expiryDate: item.expiryDate || '',
          expiryAlert: item.expiryAlert !== false,
          notesTag: item.notesTag || '',
          notes: item.notes || '',
          lastRate: item.salesPrice ?? item.purchasePrice ?? stockRow?.valuationRate ?? 0,
          usageCount: item.recentScore || 0,
        }
      })
      .sort((a, b) => {
        if ((b.recentScore || 0) !== (a.recentScore || 0)) return (b.recentScore || 0) - (a.recentScore || 0)
        return a.name.localeCompare(b.name)
      })
  }, [items, stockLedger])

  const deletedItems = useMemo(() => items.filter((item) => item.deleted), [items])

  const recentItems = useMemo(
    () => itemMaster
      .filter((item) => item.recentScore || item.recentEditedOn || item.recentUsedOn)
      .sort((a, b) => (b.recentScore || 0) - (a.recentScore || 0))
      .slice(0, 10),
    [itemMaster],
  )

  const reports = useMemo(() => buildReportState({
    sales: invoices,
    purchases,
    parties,
    expenses,
    itemMaster,
  }), [expenses, invoices, itemMaster, parties, purchases])

  const erpData = useMemo(() => buildNormalizedErpData({
    ...initialErpState,
    invoices,
    parties,
    purchases,
    expenses,
    workers,
    items,
    revenueData,
    importMeta,
    business: initialErpState.business,
  }), [expenses, importMeta, initialErpState, invoices, items, parties, purchases, revenueData, workers])

  const getSummary = useCallback(() => {
    const totalSales = invoices.reduce((sum, invoice) => sum + invoice.total, 0)
    const totalPurchases = purchases.reduce((sum, purchase) => sum + purchase.amount, 0)
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0)
    const netProfit = totalSales - totalPurchases - totalExpenses
    const gstTotal = invoices.reduce((sum, invoice) => sum + (invoice.tax || 0), 0)
    const cgst = Math.round(gstTotal / 2)
    const sgst = Math.round(gstTotal / 2)
    return { totalSales, totalPurchases, totalExpenses, netProfit, gstTotal, cgst, sgst, igst: 0 }
  }, [expenses, invoices, purchases])

  return (
    <AppContext.Provider value={{
      invoices,
      sales: invoices,
      parties,
      purchases,
      expenses,
      products: itemMaster,
      dashboard: erpData.dashboard,
      stock: erpData.stock,
      analytics: erpData.analytics,
      payments: erpData.payments,
      gst: erpData.gst,
      company: erpData.company,
      workers,
      companies,
      sharedCompanies,
      loans,
      checks,
      bankAccounts,
      cashTransactions,
      backupSettings,
      itemMaster,
      deletedItems,
      recentItems,
      revenueData,
      importMeta,
      erpData,
      addInvoice,
      recordPayment,
      deleteInvoice,
      addParty,
      updateParty,
      addPurchase,
      getPartyPurchases,
      addExpense,
      addWorker,
      paySalary,
      recordAdvance,
      addCompany,
      saveBackupSettings,
      upsertLoan,
      deleteLoan,
      upsertBankAccount,
      deleteBankAccount,
      addItem,
      updateItem,
      deleteItem,
      touchRecentItem,
      importFromParsedPayload,
      importData,
      clearImportedData,
      undo,
      getPartyInvoices,
      getPartyProfit,
      getSummary,
      reports,
      stockLedger,
    }}
    >
      {children}
    </AppContext.Provider>
  )
}

function guessCategory(name = '') {
  const value = name.toLowerCase()
  if (value.includes('tablet') || value.includes(' tab')) return 'Tablet'
  if (value.includes('capsule') || value.includes(' cap')) return 'Capsule'
  if (value.includes('softgel')) return 'Softgel'
  if (value.includes('syrup')) return 'Syrup'
  if (value.includes('infusion')) return 'Infusion'
  if (value.includes('injection') || value.includes(' inj')) return 'Injection'
  return 'Other Goods'
}

function todayStamp() {
  return new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export const useApp = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
