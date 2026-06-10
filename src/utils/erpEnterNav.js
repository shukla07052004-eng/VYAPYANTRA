import { scrollElementIntoView } from './focusScroll.js'

/**
 * Desktop ERP-style field navigation: Enter advances, Shift+Enter goes back.
 * Skips when Ctrl/Meta held (e.g. Ctrl+Enter saves).
 */

function focusElement(element) {
  if (!(element instanceof HTMLElement)) return false
  element.focus({ preventScroll: true })
  scrollElementIntoView(element, { behavior: 'auto' })
  return true
}

/**
 * @param {KeyboardEvent} event
 * @param {number} index - Position of focused field in `elements`
 * @param {(HTMLElement|null|undefined)[]} elements - Stable ordered list (use refs[].current pattern)
 * @param {{ onTrailForward?: () => void; onTrailBackward?: () => void }} [trail]
 */
export function consumeSequentialEnter(event, index, elements, trail = {}) {
  if (event.key !== 'Enter') return false
  if (event.repeat) return false
  if (event.ctrlKey || event.metaKey || event.altKey) return false
  const activeEl = document.activeElement
  if (!(activeEl instanceof HTMLElement)) return false
  const anchor = elements[index]
  if (anchor instanceof HTMLElement && activeEl !== anchor && !anchor.contains(activeEl)) return false

  const backward = event.shiftKey
  event.preventDefault()

  const last = Math.max(elements.length - 1, 0)

  if (backward) {
    if (index <= 0) {
      trail.onTrailBackward?.()
      return true
    }
    for (let i = index - 1; i >= 0; i -= 1) {
      if (focusElement(elements[i])) return true
    }
    trail.onTrailBackward?.()
    return true
  }

  if (index >= last) {
    trail.onTrailForward?.()
    return true
  }
  for (let i = index + 1; i <= last; i += 1) {
    if (focusElement(elements[i])) return true
  }
  trail.onTrailForward?.()
  return true
}
