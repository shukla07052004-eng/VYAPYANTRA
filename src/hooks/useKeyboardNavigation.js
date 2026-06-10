import { useCallback, useEffect, useMemo, useState } from 'react'

export default function useKeyboardNavigation({ items = [], activePath, onSelect }) {
  const [currentSection, setCurrentSection] = useState('content')
  const [currentIndex, setCurrentIndex] = useState(() => {
    const foundIndex = items.findIndex((item) => item.path === activePath)
    return foundIndex >= 0 ? foundIndex : 0
  })

  useEffect(() => {
    const foundIndex = items.findIndex((item) => item.path === activePath)
    if (foundIndex >= 0) setCurrentIndex(foundIndex)
  }, [activePath, items])

  const activateSidebar = useCallback(() => setCurrentSection('sidebar'), [])
  const activateContent = useCallback(() => setCurrentSection('content'), [])

  const moveSidebar = useCallback((step) => {
    setCurrentIndex((current) => Math.min(Math.max(current + step, 0), Math.max(items.length - 1, 0)))
  }, [items.length])

  const selectCurrent = useCallback(() => {
    const item = items[currentIndex]
    if (item) onSelect?.(item.path)
  }, [currentIndex, items, onSelect])

  return useMemo(() => ({
    currentSection,
    currentIndex,
    setCurrentIndex,
    activateSidebar,
    activateContent,
    moveSidebar,
    selectCurrent,
  }), [activateContent, activateSidebar, currentIndex, currentSection, moveSidebar, selectCurrent])
}
