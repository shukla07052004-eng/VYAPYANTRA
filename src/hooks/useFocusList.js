import { useCallback, useEffect, useRef, useState } from 'react'

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

/**
 * useFocusList — roving-tabindex focus list
 *
 * Key fixes vs original:
 * 1. Roving tabIndex: only the "active" item has tabIndex=0; all others are -1.
 *    This means the list as a whole is a single tab-stop, exactly like a
 *    sidebar or toolbar in a desktop app.
 * 2. focusItem() is stable and works even when called immediately after a
 *    React re-render (uses requestAnimationFrame).
 * 3. setIndex() always syncs React state AND real DOM focus together, so
 *    arrow-key navigation cannot get out of sync.
 * 4. `onFocus` from getItemProps updates currentIndex so clicking an item
 *    with the mouse also syncs state.
 * 5. Removed the stray console.log.
 */
export default function useFocusList({
  count = 0,
  initialIndex = 0,
  orientation = 'vertical',
  loop = false,
  enabled = true,
  onEnter,
} = {}) {
  const itemRefs = useRef([])
  const [currentIndex, setCurrentIndex] = useState(initialIndex)

  // Keep currentIndex in-bounds when the list shrinks
  useEffect(() => {
    setCurrentIndex((current) => clamp(current, 0, Math.max(count - 1, 0)))
  }, [count])

  const focusItem = useCallback((index) => {
    const node = itemRefs.current[index]
    if (!(node instanceof HTMLElement)) return false
    requestAnimationFrame(() => node.focus({ preventScroll: true }))
    return true
  }, [])

  /**
   * setIndex — update state AND move real DOM focus.
   * shouldFocus defaults to true so callers never have to think about it.
   */
  const setIndex = useCallback(
    (nextIndex, shouldFocus = true) => {
      const safeIndex = clamp(nextIndex, 0, Math.max(count - 1, 0))
      setCurrentIndex(safeIndex)
      if (shouldFocus) focusItem(safeIndex)
    },
    [count, focusItem],
  )

  const move = useCallback(
    (step) => {
      if (!count) return
      setCurrentIndex((current) => {
        let nextIndex = current + step
        if (loop) {
          nextIndex = (nextIndex + count) % count
        } else {
          nextIndex = clamp(nextIndex, 0, count - 1)
        }
        // Schedule DOM focus for the new index
        requestAnimationFrame(() => {
          const node = itemRefs.current[nextIndex]
          if (node instanceof HTMLElement) node.focus({ preventScroll: true })
        })
        return nextIndex
      })
    },
    [count, loop],
  )

  const register = useCallback(
    (index) => (node) => {
      itemRefs.current[index] = node
    },
    [],
  )

  /**
   * getItemProps — spread these onto each list item element.
   *
   * Roving tabIndex:
   *   • active item  → tabIndex 0  (reachable via Tab)
   *   • all others   → tabIndex -1 (reachable only via arrow keys)
   *
   * This is the standard pattern used by WAI-ARIA composite widgets
   * (listbox, toolbar, menu).
   */
  const getItemProps = useCallback(
    (index, options = {}) => ({
      ref: register(index),
      // Roving tabIndex: only the focused item is in the tab order
      tabIndex: index === currentIndex ? 0 : -1,
      'data-section-entry': options.sectionEntry ? 'true' : undefined,
      onFocus: (event) => {
        // Sync state when an item receives focus (e.g. via mouse click)
        setCurrentIndex(index)
        options.onFocus?.(event)
      },
      onKeyDown: (event) => {
        if (!enabled) {
          options.onKeyDown?.(event)
          return
        }

        if (orientation === 'vertical') {
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            move(1)
            return
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault()
            move(-1)
            return
          }
        }

        if (orientation === 'horizontal') {
          if (event.key === 'ArrowRight') {
            event.preventDefault()
            move(1)
            return
          }
          if (event.key === 'ArrowLeft') {
            event.preventDefault()
            move(-1)
            return
          }
        }

        if (event.key === 'Enter') {
          onEnter?.(index, event)
        }

        options.onKeyDown?.(event)
      },
      // Spread caller's extras, but don't let them clobber ref/tabIndex
      ...options,
      // These must stay as our versions
      ref: register(index),
      tabIndex: index === currentIndex ? 0 : -1,
    }),
    [currentIndex, enabled, move, onEnter, orientation, register],
  )

  return {
    currentIndex,
    setCurrentIndex: setIndex,
    focusItem,
    move,
    getItemProps,
    itemRefs,
  }
}