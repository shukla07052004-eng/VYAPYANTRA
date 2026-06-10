import { INIT_PURCHASES } from './store.js'

export const purchaseData = INIT_PURCHASES

export const createPurchaseRecord = (purchase) => ({
  paid: purchase.paid ?? 0,
  status: purchase.status ?? 'Unpaid',
  ...purchase,
})
