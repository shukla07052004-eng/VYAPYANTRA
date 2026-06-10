// ============================================================
// BizLedger Pro — Keyboard Shortcuts Hook v2
// Full shortcut map: F2/F3/F10, Ctrl+S/P/D/E/N/Z, Alt+C/I, Esc, Enter
// ============================================================
import { useEffect } from 'react'

export default function useKeyboardShortcuts({
  onToggleSidebar,
  onNewInvoice,
  onFocusSearch,
  onNavSales,
  onNavPurchase,
  onNavReports,
  onNavParties,
  onNavWorkers,
  onNewEntry,
  onSaveBill,
  onPrintBill,
  onDeleteBill,
  onEditBill,
  onCreateParty,
  onUndo,
}) {
  useEffect(() => {
    const handler = (e) => {
      const tag = document.activeElement?.tagName
      const isEditing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'

      // ── Navigation (F-keys, never blocked) ────────────────
      if (e.key === 'F2')  { e.preventDefault(); onNavSales?.()    }
      if (e.key === 'F3')  { e.preventDefault(); onNavPurchase?.() }
      if (e.key === 'F10') { e.preventDefault(); onNavReports?.()  }

      // ── Ctrl combos ────────────────────────────────────────
      if (e.ctrlKey) {
        switch (e.key.toLowerCase()) {
          case 'b': e.preventDefault(); onToggleSidebar?.();  break
          case 'k': e.preventDefault(); onFocusSearch?.();    break
          case 'n': if (!isEditing) { e.preventDefault(); onNewEntry?.() }   break
          case 'i': if (!isEditing) { e.preventDefault(); onNewInvoice?.() } break
          case 's': if (!isEditing) { e.preventDefault(); onSaveBill?.() }   break
          case 'p': if (!isEditing) { e.preventDefault(); onPrintBill?.() }  break
          case 'd': if (!isEditing) { e.preventDefault(); onDeleteBill?.() } break
          case 'e': if (!isEditing) { e.preventDefault(); onEditBill?.() }   break
          case 'z': if (!isEditing) { e.preventDefault(); onUndo?.() }       break
          default: break
        }
      }

      // ── Alt combos ─────────────────────────────────────────
      if (e.altKey && !e.ctrlKey) {
        switch (e.key.toLowerCase()) {
          case 'c': e.preventDefault(); onCreateParty?.(); break
          case 'i': if (!isEditing) { e.preventDefault(); onNewInvoice?.() } break
          default: break
        }
      }

      // ── Esc: close modals (handled per-modal via useEffect) ─
      // ── Enter: handled by individual table/form components ──
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [
    onToggleSidebar, onNewInvoice, onFocusSearch,
    onNavSales, onNavPurchase, onNavReports, onNavParties, onNavWorkers,
    onNewEntry, onSaveBill, onPrintBill, onDeleteBill, onEditBill,
    onCreateParty, onUndo,
  ])
}
