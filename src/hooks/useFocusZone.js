import { useCallback, useEffect, useMemo, useRef } from 'react'
import { scrollElementIntoView } from '../utils/focusScroll.js'

const DEFAULT_SELECTOR = '[data-focus-item="true"]'

const isEditable = (node) => {
  if (!(node instanceof HTMLElement)) return false
  const tag = node.tagName
  return node.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}

const isFocusableItem = (node) => {
  if (!(node instanceof HTMLElement)) return false
  if (node.matches('[disabled],[aria-hidden="true"],[hidden]')) return false
  if (node.getAttribute('tabindex') === '-1' && node.dataset.focusItem !== 'true') return false
  return node.isConnected && node.getClientRects().length > 0
}

const getItemCenter = (rect) => ({
  x: rect.left + (rect.width / 2),
  y: rect.top + (rect.height / 2),
})

const getGridTargetIndex = (items, currentIndex, key, columns) => {
  if (!items.length) return null

  const current = items[currentIndex]
  if (!(current instanceof HTMLElement)) return null

  if (typeof columns === 'number' && columns > 1) {
    switch (key) {
      case 'ArrowRight':
        return currentIndex + 1
      case 'ArrowLeft':
        return currentIndex - 1
      case 'ArrowDown':
        return currentIndex + columns
      case 'ArrowUp':
        return currentIndex - columns
      default:
        return null
    }
  }

  const currentRect = current.getBoundingClientRect()
  const currentCenter = getItemCenter(currentRect)
  let bestIndex = null
  let bestScore = Number.POSITIVE_INFINITY

  items.forEach((item, index) => {
    if (index === currentIndex || !(item instanceof HTMLElement)) return

    const rect = item.getBoundingClientRect()
    const center = getItemCenter(rect)
    const dx = center.x - currentCenter.x
    const dy = center.y - currentCenter.y

    if (key === 'ArrowRight' && dx <= 0) return
    if (key === 'ArrowLeft' && dx >= 0) return
    if (key === 'ArrowDown' && dy <= 0) return
    if (key === 'ArrowUp' && dy >= 0) return

    const primaryDistance = key === 'ArrowLeft' || key === 'ArrowRight' ? Math.abs(dx) : Math.abs(dy)
    const crossDistance = key === 'ArrowLeft' || key === 'ArrowRight' ? Math.abs(dy) : Math.abs(dx)
    const score = (primaryDistance * 10) + crossDistance

    if (score < bestScore) {
      bestScore = score
      bestIndex = index
    }
  })

  return bestIndex
}

export default function useFocusZone({
  orientation = 'vertical',
  columns = 1,
  selector = DEFAULT_SELECTOR,
  disabled = false,
  allowArrowInEditable = false,
  onActiveIndexChange,
  onSelect,
  onEscape,
  onLeaveBackward,
  onLeaveForward,
} = {}) {
  const containerRef = useRef(null)
  const activeIndexRef = useRef(0)
  const focusRafRef = useRef(null)

  const getItems = useCallback(() => {
    const container = containerRef.current
    if (!container) return []
    return Array.from(container.querySelectorAll(selector)).filter(isFocusableItem)
  }, [selector])

  const syncTabIndices = useCallback((preferredIndex = activeIndexRef.current) => {
    const items = getItems()
    if (!items.length) {
      activeIndexRef.current = 0
      return []
    }

    const nextIndex = Math.min(Math.max(preferredIndex, 0), items.length - 1)
    activeIndexRef.current = nextIndex

    items.forEach((item, index) => {
      item.tabIndex = index === nextIndex ? 0 : -1
    })

    return items
  }, [getItems])

  const focusItem = useCallback((index, options = {}) => {
    const items = syncTabIndices(index)
    const item = items[activeIndexRef.current]
    if (!item) return false
    if (focusRafRef.current) cancelAnimationFrame(focusRafRef.current)
    focusRafRef.current = requestAnimationFrame(() => {
      if (document.activeElement !== item) {
        item.focus({ preventScroll: options.preventScroll ?? true })
      }
      scrollElementIntoView(item, { behavior: options.behavior })
    })
    return true
  }, [syncTabIndices])

  const focusFirst = useCallback(() => focusItem(0), [focusItem])
  const focusCurrent = useCallback(() => focusItem(activeIndexRef.current), [focusItem])

  useEffect(() => {
    if (disabled) return undefined

    const container = containerRef.current
    if (!container) return undefined

    const handleFocusIn = (event) => {
      const target = event.target instanceof HTMLElement ? event.target.closest(selector) : null
      if (!(target instanceof HTMLElement)) return
      const items = getItems()
      const index = items.indexOf(target)
      if (index === -1) return
      activeIndexRef.current = index
      onActiveIndexChange?.(index, target, items)
      items.forEach((item, itemIndex) => {
        item.tabIndex = itemIndex === index ? 0 : -1
      })
      scrollElementIntoView(target)
    }

    const handleKeyDown = (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return
      if (isEditable(event.target) && !allowArrowInEditable) return

      const currentItem = event.target instanceof HTMLElement ? event.target.closest(selector) : null
      if (!(currentItem instanceof HTMLElement)) return

      const items = getItems()
      const currentIndex = items.indexOf(currentItem)
      if (currentIndex === -1) return

      if (event.key === 'Enter' || event.key === ' ') {
        onSelect?.(currentItem, currentIndex, event)
      }

      if (event.key === 'Escape' && onEscape) {
        const handled = onEscape(event)
        if (handled !== false) {
          event.preventDefault()
        }
        return
      }

      if (event.key === 'ArrowLeft' && orientation === 'vertical' && onLeaveBackward) {
        const handled = onLeaveBackward(currentItem, currentIndex, event)
        if (handled !== false) {
          event.preventDefault()
        }
        return
      }

      if (event.key === 'ArrowRight' && orientation === 'vertical' && onLeaveForward) {
        const handled = onLeaveForward(currentItem, currentIndex, event)
        if (handled !== false) {
          event.preventDefault()
        }
        return
      }

      let nextIndex = null

      if (orientation === 'vertical') {
        if (event.key === 'ArrowDown') nextIndex = currentIndex + 1
        if (event.key === 'ArrowUp') nextIndex = currentIndex - 1
      } else if (orientation === 'horizontal') {
        if (event.key === 'ArrowRight') nextIndex = currentIndex + 1
        if (event.key === 'ArrowLeft') nextIndex = currentIndex - 1
      } else if (orientation === 'grid') {
        nextIndex = getGridTargetIndex(items, currentIndex, event.key, columns)
      }

      if (nextIndex === null) return
      if (nextIndex < 0 || nextIndex >= items.length) {
        event.preventDefault()
        return
      }

      event.preventDefault()
      focusItem(nextIndex)
    }

    const observer = new MutationObserver(() => {
      syncTabIndices(activeIndexRef.current)
    })

    container.addEventListener('focusin', handleFocusIn)
    container.addEventListener('keydown', handleKeyDown)
    observer.observe(container, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['disabled', 'hidden', 'aria-hidden'],
    })

    syncTabIndices(activeIndexRef.current)

    return () => {
      container.removeEventListener('focusin', handleFocusIn)
      container.removeEventListener('keydown', handleKeyDown)
      observer.disconnect()
      if (focusRafRef.current) cancelAnimationFrame(focusRafRef.current)
    }
  }, [allowArrowInEditable, columns, disabled, focusItem, getItems, onActiveIndexChange, onEscape, onLeaveBackward, onLeaveForward, onSelect, orientation, selector, syncTabIndices])

  return useMemo(() => ({
    ref: containerRef,
    focusCurrent,
    focusFirst,
    focusItem,
    refresh: syncTabIndices,
  }), [focusCurrent, focusFirst, focusItem, syncTabIndices])
}
