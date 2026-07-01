export const stockData = []

export const deriveStockLedger = (sales = [], purchases = []) => {
  const byItem = new Map()

  const upsert = (desc, changes = {}) => {
    if (!desc) return
    const current = byItem.get(desc) ?? {
      sku: `SKU-${String(byItem.size + 1).padStart(3, '0')}`,
      item: desc,
      openingQty: 0,
      purchaseQty: 0,
      soldQty: 0,
      valuationRate: 0,
    }
    const next = {
      ...current,
      ...changes,
      openingQty: current.openingQty + (changes.openingQty || 0),
      purchaseQty: current.purchaseQty + (changes.purchaseQty || 0),
      soldQty: current.soldQty + (changes.soldQty || 0),
      valuationRate: changes.valuationRate ?? current.valuationRate,
    }
    byItem.set(desc, next)
  }

  purchases.forEach((purchase) => {
    purchase.items?.forEach((item) => {
      upsert(item.desc, {
        purchaseQty: Number(item.qty) || 0,
        valuationRate: Number(item.rate) || 0,
      })
    })
  })

  sales.forEach((sale) => {
    sale.items?.forEach((item) => {
      upsert(item.desc, {
        soldQty: Number(item.qty) || 0,
        valuationRate: Number(item.rate) || 0,
      })
    })
  })

  return Array.from(byItem.values()).map((row) => {
    const closingQty = row.openingQty + row.purchaseQty - row.soldQty
    return {
      ...row,
      closingQty,
      valuation: closingQty * (row.valuationRate || 0),
    }
  })
}
