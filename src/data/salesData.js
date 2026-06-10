import { INIT_INVOICES } from './store.js'

export const salesData = INIT_INVOICES

export const createInvoiceRecord = (invoice, id) => ({
  id,
  paid: 0,
  status: 'Pending',
  ...invoice,
})

export const getSalesTotals = (sales = []) => {
  const totalSales = sales.reduce((sum, sale) => sum + (sale.total || 0), 0)
  const totalPaid = sales.reduce((sum, sale) => sum + (sale.paid || 0), 0)
  const outstanding = totalSales - totalPaid
  return {
    totalSales,
    totalPaid,
    outstanding,
    overdueCount: sales.filter((sale) => sale.status === 'Pending').length,
  }
}
