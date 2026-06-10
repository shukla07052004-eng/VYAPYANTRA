import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const isFocusable = (node) =>
  node instanceof HTMLElement &&
  !node.hasAttribute('disabled') &&
  node.isConnected

export default function useFocusManager() {
  const refs = useRef(new Map())
  const [activeFocusKey, setActiveFocusKey] = useState(null)
  const lastElementRef = useRef(null)

  // Regions marked via pauseTracking() will not update lastElementRef while
  // they hold focus. Used by the sidebar to prevent its own nav buttons from
  // overwriting the page element we want to restore to on close.
  const pausedContainersRef = useRef(new Set())

  const register = useCallback((key) => (node) => {
    if (node) refs.current.set(key, node)
    else refs.current.delete(key)
  }, [])

  /**
   * pauseTracking(containerNode)
   * While `containerNode` contains the active element, focusin events from
   * inside it will NOT update lastElementRef. Call resumeTracking() when the
   * region is hidden so tracking resumes globally.
   */
  const pauseTracking = useCallback((containerNode) => {
    if (containerNode instanceof HTMLElement) {
      pausedContainersRef.current.add(containerNode)
    }
  }, [])

  const resumeTracking = useCallback((containerNode) => {
    pausedContainersRef.current.delete(containerNode)
  }, [])

  const focus = useCallback((key, options = {}) => {
    const node = refs.current.get(key)
    if (!isFocusable(node)) return false
    requestAnimationFrame(() => {
      if (document.activeElement !== node) {
        node.focus({ preventScroll: options.preventScroll ?? true })
      }
    })
    return true
  }, [])

  const restoreFocus = useCallback((node = lastElementRef.current) => {
    if (!isFocusable(node)) return false
    requestAnimationFrame(() => {
      // Guard: the element must still be in the DOM and not inside a paused
      // (hidden) container — e.g. a sidebar that has just been closed.
      const isInsidePaused = Array.from(pausedContainersRef.current).some(
        (container) => container.contains(node),
      )
      if (isInsidePaused) return
      if (document.activeElement !== node) {
        node.focus({ preventScroll: true })
      }
    })
    return true
  }, [])

  const withFocusPreserved = useCallback((fn) => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    fn?.()
    if (previous && previous.isConnected) {
      requestAnimationFrame(() => {
        if (document.activeElement === document.body) {
          previous.focus({ preventScroll: true })
        }
      })
    }
  }, [])

  useEffect(() => {
    const handleFocusIn = (event) => {
      const node = event.target
      if (!(node instanceof HTMLElement)) return

      // Only record as "last page element" if the newly-focused node is NOT
      // inside any paused container (e.g. an open sidebar drawer).
      const isInsidePaused = Array.from(pausedContainersRef.current).some(
        (container) => container.contains(node),
      )
      if (!isInsidePaused) {
        lastElementRef.current = node
      }

      const match = Array.from(refs.current.entries()).find(([, element]) => element === node)
      setActiveFocusKey(match?.[0] ?? null)
    }

    document.addEventListener('focusin', handleFocusIn)
    return () => document.removeEventListener('focusin', handleFocusIn)
  }, [])

  return useMemo(() => ({
    activeFocusKey,
    register,
    focus,
    restoreFocus,
    pauseTracking,
    resumeTracking,
    withFocusPreserved,
    getNode: (key) => refs.current.get(key) ?? null,
  }), [activeFocusKey, focus, pauseTracking, register, restoreFocus, resumeTracking, withFocusPreserved])
}