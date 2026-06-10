import { useEffect, useMemo } from 'react'

export const KEYBOARD_SETTINGS_STORAGE_KEY = 'bizledger.keyboard.shortcuts'

export const DEFAULT_SHORTCUTS = {
  focusSearch: 'Ctrl+K',
  newInvoice: 'Ctrl+I',
  saveRecord: 'Ctrl+S',
  navSales: 'F2',
  navPurchase: 'F3',
  navReports: 'F10',
  moveSidebarUp: 'ArrowUp',
  moveSidebarDown: 'ArrowDown',
  moveSidebarLeft: 'ArrowLeft',
  moveSidebarRight: 'ArrowRight',
  selectSidebarItem: 'Enter',
}

const normalizeShortcut = (shortcut = '') =>
  shortcut
    .split('+')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)

const isEditable = (target) => {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return target.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}

const matchesShortcut = (event, shortcut) => {
  const parts = normalizeShortcut(shortcut)
  if (!parts.length) return false

  const keyPart = parts.find((part) => !['ctrl', 'shift', 'alt', 'meta'].includes(part))
  const ctrl = parts.includes('ctrl')
  const shift = parts.includes('shift')
  const alt = parts.includes('alt')
  const meta = parts.includes('meta')

  return (
    event.ctrlKey === ctrl &&
    event.shiftKey === shift &&
    event.altKey === alt &&
    event.metaKey === meta &&
    event.key.toLowerCase() === (keyPart || '').toLowerCase()
  )
}

export default function useKeyboard({ bindings = [], shortcuts = DEFAULT_SHORTCUTS, enabled = true }) {
  const preparedBindings = useMemo(
    () => bindings
      .filter((binding) => binding?.id && shortcuts[binding.id])
      .map((binding) => ({ ...binding, shortcut: shortcuts[binding.id] })),
    [bindings, shortcuts],
  )

  useEffect(() => {
    if (!enabled) return undefined

    const handleKeyDown = (event) => {
      for (const binding of preparedBindings) {
        if (binding.enabled === false) continue
        if (!matchesShortcut(event, binding.shortcut)) continue
        if (isEditable(event.target) && !binding.allowInEditable) continue
        if (binding.when && !binding.when(event)) continue

        if (binding.preventDefault !== false) event.preventDefault()
        if (binding.stopPropagation !== false) event.stopPropagation()
        binding.handler?.(event)
        break
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [enabled, preparedBindings])
}
