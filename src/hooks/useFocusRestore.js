import { useEffect, useRef } from 'react'

export default function useFocusRestore({ active, restore }) {
  const previousFocusRef = useRef(null)

  useEffect(() => {
    if (active) {
      previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      return undefined
    }

    const previous = previousFocusRef.current
    if (previous instanceof HTMLElement && previous.isConnected) {
      requestAnimationFrame(() => {
        restore?.(previous)
      })
    }

    return undefined
  }, [active, restore])

  return previousFocusRef
}
