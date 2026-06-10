export const REPORT_MENU_ITEMS = [
  { id: 'sales-reports', path: '/reports/sales', label: 'Sales Reports', reportId: 'billwiseprofit' },
  { id: 'purchase-reports', path: '/reports/purchase', label: 'Purchase Reports', reportId: 'statement' },
  { id: 'gst-reports', path: '/reports/gst', label: 'GST Reports', reportId: 'gst' },
  { id: 'stock-reports', path: '/reports/stock', label: 'Stock Reports', reportId: 'stock' },
  { id: 'profit-reports', path: '/reports/profit', label: 'Profit Reports', reportId: 'profit-loss' },
  { id: 'expense-reports', path: '/reports/expenses', label: 'Expense Reports', reportId: 'expensesanalysis' },
]

export const ERP_SIDEBAR_ITEMS = [
  { id: 'dashboard', path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'sales', path: '/sales', label: 'Sales', icon: 'invoice' },
  { id: 'purchase', path: '/purchase', label: 'Purchase', icon: 'cart' },
  { id: 'parties', path: '/parties', label: 'Parties', icon: 'parties' },
  { id: 'items', path: '/items', label: 'Items', icon: 'inventory' },
  { id: 'expense', path: '/expense', label: 'Expenses', icon: 'wallet' },
  { id: 'reports', label: 'Reports', icon: 'analytics', children: REPORT_MENU_ITEMS },
  {
    id: 'ai-reports',
    label: 'AI Analysed',
    icon: 'spark',
    children: [
      { id: 'sales-prediction', path: '/ai-reports/sales-prediction', label: 'Sales Prediction' },
      { id: 'purchase-prediction', path: '/ai-reports/purchase-prediction', label: 'Purchase Prediction' },
      { id: 'dead-stock-analysis', path: '/ai-reports/dead-stock-analysis', label: 'Dead Stock' },
      { id: 'fast-moving-items', path: '/ai-reports/fast-moving-items', label: 'Fast Moving Items' },
      { id: 'smart-reorder-suggestions', path: '/ai-reports/smart-reorder-suggestions', label: 'Smart Reorder' },
      { id: 'profit-analysis', path: '/ai-reports/profit-analysis', label: 'Profit Analysis' },
      { id: 'customer-behaviour', path: '/ai-reports/customer-behaviour', label: 'Customer Behaviour' },
      { id: 'vendor-analysis', path: '/ai-reports/vendor-analysis', label: 'Vendor Analysis' },
      { id: 'expense-analysis', path: '/ai-reports/expense-analysis', label: 'Expense Analysis' },
      { id: 'gst-analysis', path: '/ai-reports/gst-analysis', label: 'GST Analysis' },
    ],
  },
  {
    id: 'banking',
    label: 'Banking',
    icon: 'bank',
    children: [
      { id: 'loan-accounts', path: '/banking/loan-accounts', label: 'Loan Accounts' },
      { id: 'checks', path: '/banking/checks', label: 'Checks' },
      { id: 'bank-accounts', path: '/banking/bank-accounts', label: 'Bank Accounts' },
      { id: 'cash-in-hand', path: '/banking/cash-in-hand', label: 'Cash In Hand' },
    ],
  },
  {
    id: 'utilities',
    label: 'Important Utilities',
    icon: 'tools',
    children: [
      { id: 'manage-companies', path: '/utilities/manage-companies', label: 'Manage Companies' },
      { id: 'backup-restore', path: '/utilities/backup-restore', label: 'Backup & Restore' },
      { id: 'data-verification', path: '/utilities/data-verification', label: 'Data Verification' },
      { id: 'item-libraries', path: '/utilities/item-libraries', label: 'Item Libraries' },
      { id: 'bulk-update-tax-slab', path: '/utilities/bulk-update-tax-slab', label: 'Bulk Tax Update' },
      { id: 'export-items', path: '/utilities/export-items', label: 'Export Items' },
      { id: 'import-items', path: '/utilities/import-items', label: 'Import Items' },
      { id: 'sync-share', path: '/utilities/sync-share', label: 'Sync & Share' },
    ],
  },
  { id: 'keyboard-settings', path: '/settings/keyboard', label: 'Keyboard Settings', icon: 'keyboard' },
]

export function findSidebarSectionByPath(pathname) {
  return ERP_SIDEBAR_ITEMS.find((item) => item.children?.some((child) => pathname === child.path || pathname.startsWith(`${child.path}/`)))?.id ?? null
}

export function getVisibleSidebarItems(openSectionId = null) {
  return ERP_SIDEBAR_ITEMS.flatMap((item) => {
    const parentEntry = {
      id: item.id,
      type: item.children?.length ? 'section' : 'link',
      label: item.label,
      path: item.path ?? null,
      icon: item.icon,
      parentId: null,
    }

    if (!item.children?.length || openSectionId !== item.id) return [parentEntry]

    return [
      parentEntry,
      ...item.children.map((child) => ({
        id: child.id,
        type: 'child',
        label: child.label,
        path: child.path,
        icon: item.icon,
        parentId: item.id,
      })),
    ]
  })
}

export const PRIMARY_NAV_SECTIONS = [
  {
    section: null,
    items: ERP_SIDEBAR_ITEMS.flatMap((item) => item.children?.length ? item.children : [item]),
  },
]

export const AI_REPORT_DEFINITIONS = [
  { id: 'sales-prediction', path: '/ai-reports/sales-prediction', name: 'Sales Prediction', desc: 'Forecast invoice velocity and projected turnover.' },
  { id: 'purchase-prediction', path: '/ai-reports/purchase-prediction', name: 'Purchase Prediction', desc: 'Estimate procurement demand from buying patterns.' },
  { id: 'dead-stock-analysis', path: '/ai-reports/dead-stock-analysis', name: 'Dead Stock Analysis', desc: 'Track slow or non-moving inventory.' },
  { id: 'fast-moving-items', path: '/ai-reports/fast-moving-items', name: 'Fast Moving Items', desc: 'Monitor highest velocity SKUs.' },
  { id: 'smart-reorder-suggestions', path: '/ai-reports/smart-reorder-suggestions', name: 'Smart Reorder Suggestions', desc: 'Recommend purchase timing and reorder quantities.' },
  { id: 'profit-analysis', path: '/ai-reports/profit-analysis', name: 'Profit Analysis', desc: 'Identify strongest margin and profitability drivers.' },
  { id: 'gst-analysis', path: '/ai-reports/gst-analysis', name: 'GST Analysis', desc: 'Summarize GST contribution across invoices.' },
  { id: 'customer-behaviour', path: '/ai-reports/customer-behaviour', name: 'Customer Behaviour', desc: 'Find repeat buying and value concentration patterns.' },
  { id: 'vendor-analysis', path: '/ai-reports/vendor-analysis', name: 'Vendor Analysis', desc: 'Review supplier value, frequency and reliability.' },
  { id: 'expense-analysis', path: '/ai-reports/expense-analysis', name: 'Expense Analysis', desc: 'Map cost categories against business scale.' },
]

export const BANKING_DEFINITIONS = [
  { id: 'loan-accounts', path: '/banking/loan-accounts', name: 'Loan Accounts', desc: 'EMIs, balances and payment history.' },
  { id: 'checks', path: '/banking/checks', name: 'Checks', desc: 'Issue, deposit, clearance and bounce tracking.' },
  { id: 'bank-accounts', path: '/banking/bank-accounts', name: 'Bank Accounts', desc: 'Balances, transactions and transfers.' },
  { id: 'cash-in-hand', path: '/banking/cash-in-hand', name: 'Cash In Hand', desc: 'Daily cashbook and operational cash flow.' },
]

export const UTILITY_DEFINITIONS = [
  { id: 'manage-companies', path: '/utilities/manage-companies', name: 'Manage Companies', desc: 'Own companies, shared access and restore entry.' },
  { id: 'backup-restore', path: '/utilities/backup-restore', name: 'Backup & Restore', desc: 'Auto backup, manual backup and restore control.' },
  { id: 'data-verification', path: '/utilities/data-verification', name: 'Data Verification', desc: 'Detect invoice, GST and ledger inconsistencies.' },
  { id: 'item-libraries', path: '/utilities/item-libraries', name: 'Item Libraries', desc: 'Recover deleted items and restore versions.' },
  { id: 'bulk-update-tax-slab', path: '/utilities/bulk-update-tax-slab', name: 'Bulk Tax Update', desc: 'Mass update GST slabs with preview and backup prompt.' },
  { id: 'export-items', path: '/utilities/export-items', name: 'Export Items', desc: 'Create Excel or CSV item exports.' },
  { id: 'import-items', path: '/utilities/import-items', name: 'Import Items', desc: 'Validate and import item masters from files.' },
  { id: 'sync-share', path: '/utilities/sync-share', name: 'Sync & Share', desc: 'Control sync jobs and company sharing.' },
]

export const ITEM_SECTION_ROUTE = {
  path: '/items',
  label: 'Items',
}

export const SAMPLE_COMPANIES = [
  { id: 'cmp-1', name: 'Ram Kishore & Sons', owner: 'Ram Kishore', gstNumber: '09ABCDE1234F1Z5', mobile: '9876543210', email: 'ramkishore@bizledger.in', state: 'Uttar Pradesh', financialYear: '2024-25', businessType: 'Trading', sharedDate: '12 May 2026', accessType: 'Owner' },
  { id: 'cmp-2', name: 'Vardaan Fabrics', owner: 'Amit Jain', gstNumber: '09AABCV5500K1Z7', mobile: '9811102200', email: 'amit@vardaan.in', state: 'Delhi', financialYear: '2024-25', businessType: 'Wholesale', sharedDate: '03 May 2026', accessType: 'Manager' },
]

export const SHARED_COMPANIES = [
  { id: 'shr-1', name: 'Shree Agencies', owner: 'Kunal Verma', sharedDate: '08 May 2026', accessType: 'View + Export' },
  { id: 'shr-2', name: 'Northline Distributors', owner: 'Priya Bansal', sharedDate: '10 May 2026', accessType: 'Full Access' },
]

export const SAMPLE_LOANS = [
  { id: 'loan-1', name: 'Warehouse Expansion', institution: 'State Bank of India', interestRate: 10.25, emiAmount: 28500, dueDate: '2026-05-20', remainingBalance: 684000, totalPaid: 171000, pendingAmount: 684000, status: 'Active', paymentHistory: ['20 Apr 2026 - EMI cleared', '20 Mar 2026 - EMI cleared'], reminder: 'Next EMI due in 5 days' },
  { id: 'loan-2', name: 'Delivery Van Finance', institution: 'Mahindra Finance', interestRate: 11.5, emiAmount: 12800, dueDate: '2026-05-24', remainingBalance: 158000, totalPaid: 76800, pendingAmount: 158000, status: 'Active', paymentHistory: ['24 Apr 2026 - EMI cleared', '24 Mar 2026 - EMI cleared'], reminder: 'Insurance due next month' },
]

export const SAMPLE_CHECKS = [
  { id: 'chk-1', company: 'Sharma Traders', checkNumber: '003418', securityCheckNumber: 'SEC-8841', issueDate: '2026-05-02', depositDate: '2026-05-06', status: 'Pending', amount: 48200 },
  { id: 'chk-2', company: 'Gupta & Sons', checkNumber: '003422', securityCheckNumber: 'SEC-8845', issueDate: '2026-05-01', depositDate: '2026-05-03', status: 'Cleared', amount: 22500 },
  { id: 'chk-3', company: 'National Distributors', checkNumber: '003428', securityCheckNumber: 'SEC-8850', issueDate: '2026-04-29', depositDate: '2026-05-04', status: 'Bounced', amount: 18400 },
]

export const SAMPLE_BANK_ACCOUNTS = [
  { id: 'bank-1', bankName: 'State Bank of India', accountHolder: 'Ram Kishore & Sons', accountNo: 'XXXX4821', ifsc: 'SBIN0001234', branch: 'Civil Lines', balance: 324800, incomingPayments: 118000, outgoingPayments: 84500, pendingTransfers: 2, recentTransactions: ['NEFT from Gupta & Sons - 10,000', 'Salary transfer - 65,000'], transfers: ['Main to petty cash - 15,000', 'Customer refund - 4,500'] },
  { id: 'bank-2', bankName: 'HDFC Bank', accountHolder: 'Ram Kishore & Sons', accountNo: 'XXXX7830', ifsc: 'HDFC0007788', branch: 'Prayagraj Main', balance: 128400, incomingPayments: 54000, outgoingPayments: 31000, pendingTransfers: 1, recentTransactions: ['UPI collection - 12,000', 'Vendor payment - 18,500'], transfers: ['Transfer to SBI - 25,000'] },
]

export const SAMPLE_CASH_TRANSACTIONS = [
  { id: 'cash-1', date: '2026-05-12', narration: 'Opening Balance', type: 'Opening', amount: 45200, flow: 'In' },
  { id: 'cash-2', date: '2026-05-12', narration: 'Counter sale collection', type: 'Income', amount: 8000, flow: 'In' },
  { id: 'cash-3', date: '2026-05-12', narration: 'Loading charges', type: 'Expense', amount: 1800, flow: 'Out' },
  { id: 'cash-4', date: '2026-05-13', narration: 'Office petty expense', type: 'Expense', amount: 1200, flow: 'Out' },
]

export const SAMPLE_BACKUP_SETTINGS = {
  autoBackupEnabled: true,
  destination: 'Google Drive + Local Vault',
  schedule: 'Every 3 days',
  reminder: 'Every Monday at 09:00',
}
