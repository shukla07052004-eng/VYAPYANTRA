import { loadErpState } from './store.js'

export const expenseData = loadErpState().expenses

export const createExpenseRecord = (expense) => ({
  id: Date.now(),
  title: expense.title || expense.desc || '',
  desc: expense.desc || expense.title || '',
  category: expense.category || 'Miscellaneous',
  amount: Number(expense.amount) || 0,
  paymentMode: expense.paymentMode || expense.mode || 'Cash',
  mode: expense.mode || expense.paymentMode || 'Cash',
  notes: expense.notes || '',
  date: expense.date,
  ...expense,
})
