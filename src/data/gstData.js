// ============================================================
// BizLedger Pro — GST Sample Data (Pharma Distribution)
// Rich data with items, GSTIN, HSN codes, credit notes, RCM
// ============================================================
import { INVOICE_TYPES } from '../utils/gstEngine.js'

export const SELLER_GSTIN = '09ABCDE1234F1Z5' // UP — Ram Kishore & Sons

export const GST_INVOICES = [
  // ── B2B Intra-state (UP → UP) ───────────────────────────
  {
    id: 'INV-2025-118', date: '2025-04-01',
    party: 'Sharma Traders', buyerGSTIN: '09SHTRD1234F1Z5',
    invoiceType: INVOICE_TYPES.SALE,
    items: [
      { productName: 'Paracetamol 500mg Strip', hsnCode: '3004', quantity: 200, rate: 28, gstRate: 12, purchasePrice: 18, inclusive: false },
      { productName: 'Amoxicillin 250mg Cap',   hsnCode: '3004', quantity: 80,  rate: 78, gstRate: 12, purchasePrice: 55, inclusive: false },
      { productName: 'Vitamin B-Complex Tabs',  hsnCode: '2936', quantity: 120, rate: 35, gstRate: 5,  purchasePrice: 22, inclusive: false },
    ],
  },
  {
    id: 'INV-2025-117', date: '2025-03-30',
    party: 'Gupta & Sons', buyerGSTIN: '09GUPTA5678G2Z6',
    invoiceType: INVOICE_TYPES.SALE,
    items: [
      { productName: 'Metformin 500mg Strip',  hsnCode: '2942', quantity: 150, rate: 48,  gstRate: 12, purchasePrice: 30, inclusive: false },
      { productName: 'Atorvastatin 10mg',      hsnCode: '2942', quantity: 90,  rate: 95,  gstRate: 12, purchasePrice: 65, inclusive: false },
      { productName: 'Omeprazole 20mg',        hsnCode: '3004', quantity: 100, rate: 42,  gstRate: 12, purchasePrice: 28, inclusive: false },
    ],
  },
  {
    id: 'INV-2025-116', date: '2025-03-28',
    party: 'Mehta Wholesale', buyerGSTIN: '09MEHTA9012H3Z7',
    invoiceType: INVOICE_TYPES.SALE,
    items: [
      { productName: 'Ibuprofen 400mg',        hsnCode: '2916', quantity: 300, rate: 19,  gstRate: 5,  purchasePrice: 12, inclusive: false },
      { productName: 'Azithromycin 500mg',     hsnCode: '2941', quantity: 60,  rate: 130, gstRate: 12, purchasePrice: 88, inclusive: false },
      { productName: 'Cetirizine 10mg',        hsnCode: '2933', quantity: 200, rate: 14,  gstRate: 5,  purchasePrice: 8,  inclusive: false },
    ],
  },

  // ── B2B Inter-state (UP → MH) ──────────────────────────
  {
    id: 'INV-2025-115', date: '2025-03-25',
    party: 'Patel Distributors', buyerGSTIN: '27PATDST7890J5Z9',
    invoiceType: INVOICE_TYPES.SALE,
    items: [
      { productName: 'Pantoprazole 40mg',       hsnCode: '2935', quantity: 120, rate: 55, gstRate: 12, purchasePrice: 35, inclusive: false },
      { productName: 'Telmisartan 40mg',        hsnCode: '2942', quantity: 80,  rate: 72, gstRate: 12, purchasePrice: 48, inclusive: false },
      { productName: 'Multivitamin Syrup 200ml',hsnCode: '2936', quantity: 40,  rate: 82, gstRate: 5,  purchasePrice: 55, inclusive: false },
    ],
  },

  // ── B2C Local ──────────────────────────────────────────
  {
    id: 'INV-2025-114', date: '2025-03-22',
    party: 'Joshi Brothers', buyerGSTIN: '',
    invoiceType: INVOICE_TYPES.SALE,
    items: [
      { productName: 'Doxycycline 100mg',       hsnCode: '2941', quantity: 80,  rate: 58, gstRate: 12, purchasePrice: 38, inclusive: false },
      { productName: 'Iron Folic Acid Tabs',    hsnCode: '2936', quantity: 200, rate: 22, gstRate: 5,  purchasePrice: 14, inclusive: false },
      { productName: 'Calcium Carbonate 500mg', hsnCode: '2836', quantity: 150, rate: 28, gstRate: 5,  purchasePrice: 18, inclusive: false },
    ],
  },
  {
    id: 'INV-2025-113', date: '2025-03-20',
    party: 'Singh Emporium', buyerGSTIN: '09SNGEM6789L7Z2',
    invoiceType: INVOICE_TYPES.SALE,
    items: [
      { productName: 'Ranitidine 150mg',        hsnCode: '2933', quantity: 100, rate: 24, gstRate: 12, purchasePrice: 15, inclusive: false },
      { productName: 'Loperamide 2mg',          hsnCode: '2933', quantity: 60,  rate: 34, gstRate: 12, purchasePrice: 22, inclusive: false },
      { productName: 'ORS Sachet Pack×20',      hsnCode: '3824', quantity: 80,  rate: 42, gstRate: 5,  purchasePrice: 28, inclusive: false },
    ],
  },

  // ── Credit Note ────────────────────────────────────────
  {
    id: 'CN-2025-008', date: '2025-04-03',
    party: 'Sharma Traders', buyerGSTIN: '09SHTRD1234F1Z5',
    invoiceType: INVOICE_TYPES.CREDIT_NOTE,
    refInvoice: 'INV-2025-118',
    items: [
      { productName: 'Paracetamol 500mg Strip (Return)', hsnCode: '3004', quantity: 20, rate: 28, gstRate: 12, purchasePrice: 18, inclusive: false },
    ],
  },

  // ── Debit Note ─────────────────────────────────────────
  {
    id: 'DN-2025-003', date: '2025-04-05',
    party: 'Gupta & Sons', buyerGSTIN: '09GUPTA5678G2Z6',
    invoiceType: INVOICE_TYPES.DEBIT_NOTE,
    refInvoice: 'INV-2025-117',
    items: [
      { productName: 'Short Charged — Metformin', hsnCode: '2942', quantity: 10, rate: 48, gstRate: 12, purchasePrice: 30, inclusive: false },
    ],
  },

  // ── RCM Purchase ──────────────────────────────────────
  {
    id: 'RCM-2025-001', date: '2025-04-02',
    party: 'Unregistered Supplier', buyerGSTIN: '',
    invoiceType: INVOICE_TYPES.PURCHASE,
    rcm: true,
    items: [
      { productName: 'Transport Service', hsnCode: '9965', quantity: 1, rate: 25000, gstRate: 5, purchasePrice: 0, inclusive: false },
    ],
  },

  // ── More sales months ─────────────────────────────────
  {
    id: 'INV-2025-112', date: '2025-02-18',
    party: 'Sharma Traders', buyerGSTIN: '09SHTRD1234F1Z5',
    invoiceType: INVOICE_TYPES.SALE,
    items: [
      { productName: 'Glimepiride 2mg',   hsnCode: '2935', quantity: 120, rate: 50, gstRate: 12, purchasePrice: 32, inclusive: false },
      { productName: 'Losartan 50mg',     hsnCode: '2942', quantity: 90,  rate: 64, gstRate: 12, purchasePrice: 42, inclusive: false },
    ],
  },
  {
    id: 'INV-2025-111', date: '2025-02-14',
    party: 'Gupta & Sons', buyerGSTIN: '09GUPTA5678G2Z6',
    invoiceType: INVOICE_TYPES.SALE,
    items: [
      { productName: 'Lisinopril 10mg',          hsnCode: '2942', quantity: 100, rate: 82,  gstRate: 12, purchasePrice: 55, inclusive: false },
      { productName: 'Hydroxychloroquine 200mg',  hsnCode: '2942', quantity: 50,  rate: 140, gstRate: 12, purchasePrice: 95, inclusive: false },
    ],
  },
  {
    id: 'INV-2025-110', date: '2025-01-15',
    party: 'Mehta Wholesale', buyerGSTIN: '09MEHTA9012H3Z7',
    invoiceType: INVOICE_TYPES.SALE,
    items: [
      { productName: 'Clonazepam 0.5mg',   hsnCode: '2933', quantity: 60,  rate: 95,  gstRate: 12, purchasePrice: 68, inclusive: false },
      { productName: 'Alprazolam 0.25mg',  hsnCode: '2933', quantity: 50,  rate: 120, gstRate: 12, purchasePrice: 85, inclusive: false },
    ],
  },
  {
    id: 'INV-2025-109', date: '2025-01-10',
    party: 'Patel Distributors', buyerGSTIN: '27PATDST7890J5Z9',
    invoiceType: INVOICE_TYPES.SALE,
    items: [
      { productName: 'Ondansetron 4mg',   hsnCode: '2933', quantity: 80,  rate: 45, gstRate: 12, purchasePrice: 30, inclusive: false },
      { productName: 'Metoclopramide 5mg',hsnCode: '2933', quantity: 100, rate: 28, gstRate: 12, purchasePrice: 18, inclusive: false },
    ],
  },
]

// ── Purchase invoices for ITC ─────────────────────────────────
export const GST_PURCHASES = [
  {
    id: 'PO-225', date: '2025-04-08', supplier: 'Meridian Supplies',
    supplierGSTIN: '27MRSUP1234M8Z3',
    subtotal: 8400, tax: 1008, amount: 9408, status: 'Unpaid',
    items: [
      { productName: 'Electronic Components', hsnCode: '8542', quantity: 4, rate: 1500, gstRate: 18, inclusive: false },
      { productName: 'Packaging Materials',   hsnCode: '3923', quantity: 1, rate: 2400, gstRate: 12, inclusive: false },
    ],
  },
  {
    id: 'PO-312', date: '2025-04-12', supplier: 'National Distributors',
    supplierGSTIN: '07NATDST3456I4Z8',
    subtotal: 9200, tax: 1104, amount: 10304, status: 'Partial',
    items: [
      { productName: 'Bulk API Supply',   hsnCode: '2941', quantity: 8, rate: 1000, gstRate: 12, inclusive: false },
      { productName: 'Freight Charges',   hsnCode: '9965', quantity: 1, rate: 1200, gstRate: 5,  inclusive: false },
    ],
  },
  {
    id: 'PO-189', date: '2025-03-20', supplier: 'City Wholesalers',
    supplierGSTIN: '09CTWHL5678K9Z4',
    subtotal: 62000, tax: 7440, amount: 69440, status: 'Paid',
    items: [
      { productName: 'Mixed Wholesale Items', hsnCode: '3004', quantity: 40, rate: 1500, gstRate: 12, inclusive: false },
    ],
  },
]
