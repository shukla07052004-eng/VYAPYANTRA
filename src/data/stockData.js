export const stockData = [
  { sku: 'FAB-001', item: 'Premium Cotton Fabric (Roll)', openingQty: 40, purchaseQty: 54, soldQty: 10, valuationRate: 2820 },
  { sku: 'ELC-002', item: 'Electronic Components (Lot)', openingQty: 20, purchaseQty: 4, soldQty: 0, valuationRate: 1500 },
  { sku: 'BUL-003', item: 'Bulk Supply Lot-7', openingQty: 60, purchaseQty: 50, soldQty: 0, valuationRate: 1650 },
  { sku: 'GST-004', item: 'Wholesale Goods Batch-A', openingQty: 22, purchaseQty: 8, soldQty: 0, valuationRate: 1000 },
]

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

  stockData.forEach((row) => byItem.set(row.item, { ...row }))

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
