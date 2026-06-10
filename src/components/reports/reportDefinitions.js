export const REPORT_DEFINITIONS = [
  {
    id: 'billwiseprofit',
    path: '/reports/sales',
    name: 'Sales Reports',
    desc: 'Sales invoices, totals, GST and customer analytics',
  },
  {
    id: 'profit-loss',
    path: '/reports/profit',
    name: 'Profit Reports',
    desc: 'Bill-wise, item-wise and party-wise profitability',
  },
  {
    id: 'gst',
    path: '/reports/gst',
    name: 'GST Report',
    desc: 'CGST, SGST and IGST',
  },
  {
    id: 'statement',
    path: '/reports/purchase',
    name: 'Purchase Reports',
    desc: 'Supplier invoices, payments, dues and GST breakdown',
  },
  {
    id: 'cashflow',
    path: '/reports/cashflow',
    name: 'Cashflow Report',
    desc: 'Cash movement across sales, purchase and expenses',
  },
  {
    id: 'expensesanalysis',
    path: '/reports/expenses',
    name: 'Expense Reports',
    desc: 'Date-wise spend analytics and category trends',
  },
  {
    id: 'stock',
    path: '/reports/stock',
    name: 'Stock Reports',
    desc: 'Smart item search with expanded inventory columns',
  },
  {
    id: 'balance-sheet',
    path: '/reports/balance-sheet',
    name: 'Balance Sheet',
    desc: 'Assets, liabilities and equity',
  },
]

export const REPORT_BY_ID = Object.fromEntries(REPORT_DEFINITIONS.map((report) => [report.id, report]))
