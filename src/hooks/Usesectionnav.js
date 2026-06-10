/**
 * useSectionNav
 * =============
 * Provides a Tally-style, section-based keyboard navigation controller for
 * individual pages.  Each "section" is a logical block of the page
 * (e.g. KPI cards, a table, a form).  Within a section the host component
 * manages its own fine-grained focus; this hook handles moving BETWEEN
 * sections using ArrowDown / ArrowUp (vertical pages) or
 * ArrowRight / ArrowLeft (horizontal pages like Reports).
 *
 * Usage
 * -----
 *   const nav = useSectionNav({ sections: ['kpi', 'table'], orientation: 'vertical' })
 *
 *   // Attach to the page root:
 *   <div {...nav.getRootProps()}>
 *     // Each section:
 *     <div {...nav.getSectionProps('kpi')}>...</div>
 *     <div {...nav.getSectionProps('table')}>...</div>
 *   </div>
 *
 * How it works
 * ------------
 * • The page root div captures keydown events.
 * • When an arrow key is pressed it finds the currently active section
 *   (the one that contains document.activeElement) and moves to the next.
 * • On entering a section it focuses the first element that has
 *   [data-section-entry] or, falling back, the first focusable child.
 * • Escape always tries to move focus back to section[0] (the "top" of the
 *   page), mirroring how Tally lets you back out of a table with Esc.
 */
import { useCallback, useRef } from 'react'

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), ' +
  'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function firstFocusable(container) {
  if (!(container instanceof HTMLElement)) return null
  // Prefer explicitly-marked section entry points
  const entry = container.querySelector('[data-section-entry]')
  if (entry instanceof HTMLElement) return entry
  // Fall back to first generic focusable
  return container.querySelector(FOCUSABLE_SELECTOR)
}

export default function useSectionNav({
  sections = [],       // ordered list of section IDs, e.g. ['kpi','chart','table']
  orientation = 'vertical', // 'vertical' | 'horizontal'
  loop = false,
} = {}) {
  const sectionRefs = useRef({})   // id → DOM node

  // ── Register a section container ────────────────────────────────────────
  const registerSection = useCallback(
    (id) => (node) => {
      sectionRefs.current[id] = node
    },
    [],
  )

  // ── Focus a section by ID ────────────────────────────────────────────────
  const focusSection = useCallback((id) => {
    const container = sectionRefs.current[id]
    const target = firstFocusable(container)
    if (target) {
      requestAnimationFrame(() => target.focus({ preventScroll: true }))
      return true
    }
    return false
  }, [])

  // ── Find which section currently owns focus ──────────────────────────────
  const currentSectionId = useCallback(() => {
    const active = document.activeElement
    if (!active) return null
    for (const id of sections) {
      const node = sectionRefs.current[id]
      if (node instanceof HTMLElement && node.contains(active)) return id
    }
    return null
  }, [sections])

  // ── Move to next / prev section ──────────────────────────────────────────
  const moveSection = useCallback(
    (step) => {
      const currentId = currentSectionId()
      const idx = currentId ? sections.indexOf(currentId) : -1
      let nextIdx = idx + step
      if (loop) {
        nextIdx = (nextIdx + sections.length) % sections.length
      } else {
        nextIdx = Math.min(Math.max(nextIdx, 0), sections.length - 1)
      }
      if (nextIdx !== idx) {
        focusSection(sections[nextIdx])
      }
    },
    [currentSectionId, focusSection, loop, sections],
  )

  // ── Root keydown handler ─────────────────────────────────────────────────
  const handleRootKeyDown = useCallback(
    (event) => {
      const forward  = orientation === 'vertical' ? 'ArrowDown'  : 'ArrowRight'
      const backward = orientation === 'vertical' ? 'ArrowUp'    : 'ArrowLeft'

      // Only intercept section-jump keys when focus is on a section *boundary*
      // element (not inside an input / textarea / select).
      const tag = document.activeElement?.tagName
      const isEditing =
        tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'

      if (isEditing) return  // let the field handle arrows

      if (event.key === forward) {
        // Check if the active item's list already handled this key
        // (it stops propagation when it moves internally); if we see it here
        // the list has hit its boundary, so we move to the next section.
        event.preventDefault()
        moveSection(1)
      }

      if (event.key === backward) {
        event.preventDefault()
        moveSection(-1)
      }

      if (event.key === 'Escape') {
        // Back to first section
        focusSection(sections[0])
      }
    },
    [focusSection, moveSection, orientation, sections],
  )

  // ── Prop generators ──────────────────────────────────────────────────────
  const getRootProps = useCallback(
    () => ({
      onKeyDown: handleRootKeyDown,
      // tabIndex -1 so the div is programmatically focusable but not in the
      // natural tab order.
      tabIndex: -1,
      'data-section-root': 'true',
    }),
    [handleRootKeyDown],
  )

  const getSectionProps = useCallback(
    (id) => ({
      ref: registerSection(id),
      'data-section-id': id,
    }),
    [registerSection],
  )

  return {
    focusSection,
    registerSection,
    getSectionProps,
    getRootProps,
    currentSectionId,
  }
}