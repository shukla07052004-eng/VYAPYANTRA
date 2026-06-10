import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react'

const EscapeContext = createContext(null)

export function EscapeProvider({ children, onUnhandledEscape, onAfterEscape }) {
  const handlersRef = useRef(new Map())
  const orderRef = useRef(0)
  const onUnhandledEscapeRef = useRef(onUnhandledEscape)
  const onAfterEscapeRef = useRef(onAfterEscape)

  useEffect(() => {
    onUnhandledEscapeRef.current = onUnhandledEscape
  }, [onUnhandledEscape])

  useEffect(() => {
    onAfterEscapeRef.current = onAfterEscape
  }, [onAfterEscape])

  const register = useCallback((id, getEntry) => {
    handlersRef.current.set(id, { getEntry, order: orderRef.current++ })
    return () => {
      handlersRef.current.delete(id)
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return

      const handlers = Array.from(handlersRef.current.values())
        .map(({ getEntry, order }) => ({ ...getEntry(), order }))
        .filter((entry) => entry.active !== false)
        .sort((left, right) => (right.priority ?? 0) - (left.priority ?? 0) || right.order - left.order)

      for (const entry of handlers) {
        if (entry.when && entry.when(event) === false) continue
        const handled = entry.handler?.(event)
        if (handled === false) continue
        event.preventDefault()
        event.stopPropagation()
        onAfterEscapeRef.current?.()
        return
      }

      const fallbackHandled = onUnhandledEscapeRef.current?.(event)
      if (fallbackHandled === false) return
      event.preventDefault()
      event.stopPropagation()
      onAfterEscapeRef.current?.()
    }

    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [])

  const value = useMemo(() => ({ register }), [register])
  return <EscapeContext.Provider value={value}>{children}</EscapeContext.Provider>
}

export function useEscapeManager() {
  return useContext(EscapeContext)
}

export function useEscapeAction({ active = true, priority = 0, handler, when }) {
  const manager = useEscapeManager()
  const idRef = useRef(Symbol('escape-action'))
  const entryRef = useRef({ active, priority, handler, when })

  entryRef.current = { active, priority, handler, when }

  useEffect(() => {
    if (!manager?.register) return undefined
    return manager.register(idRef.current, () => entryRef.current)
  }, [manager])
}
