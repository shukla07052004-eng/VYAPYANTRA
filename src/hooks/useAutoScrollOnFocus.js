import { useEffect } from 'react'
import { scrollElementIntoView } from '../utils/focusScroll.js'

const DEFAULT_SELECTOR = 'input, select, textarea, button, [tabindex]:not([tabindex="-1"]), [data-focus-item="true"]'

export default function useAutoScrollOnFocus(rootRef, selector = DEFAULT_SELECTOR) {
  useEffect(() => {
    const root = rootRef?.current
    if (!(root instanceof HTMLElement)) return undefined

    const handleFocusIn = (event) => {
      const target = event.target instanceof HTMLElement ? event.target.closest(selector) : null
      if (!(target instanceof HTMLElement)) return
      scrollElementIntoView(target)
    }

    root.addEventListener('focusin', handleFocusIn)
    return () => root.removeEventListener('focusin', handleFocusIn)
  }, [rootRef, selector])
}
