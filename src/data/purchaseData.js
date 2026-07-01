import { loadErpState } from './store.js'

export const purchaseData = loadErpState().purchases

export const createPurchaseRecord = (purchase) => ({
  paid: purchase.paid ?? 0,
  status: purchase.status ?? 'Unpaid',
  ...purchase,
})
