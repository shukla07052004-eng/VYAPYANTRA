import { useEffect, useMemo, useState } from 'react'

const defaultGetLabel = (item) => item?.label ?? ''
export default function useAutocomplete({
  items = [],
  value = '',
  getLabel = defaultGetLabel,
  isOpen: controlledOpen,
  onOpenChange,
  maxSuggestions = 8,
  debounceMs = 40,
}) {
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const [internalOpen, setInternalOpen] = useState(false)
  const [debouncedValue, setDebouncedValue] = useState(value)
  const isOpen = controlledOpen ?? internalOpen

  const setOpen = (next) => {
    onOpenChange?.(next)
    if (controlledOpen === undefined) setInternalOpen(next)
  }

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedValue(value), debounceMs)
    return () => window.clearTimeout(timer)
  }, [debounceMs, value])

  const suggestions = useMemo(() => {
    const query = debouncedValue.trim().toLowerCase()
    if (!query) return items.slice(0, maxSuggestions)

    return items
      .map((item) => {
        const label = getLabel(item).toLowerCase()
        const startsWith = label.startsWith(query)
        const wordStarts = label.split(/\s+/).some((part) => part.startsWith(query))
        const includes = label.includes(query)
        if (!includes) return null

        let score = 0
        if (startsWith) score += 100
        else if (wordStarts) score += 75
        else score += 35

        score += Math.max(0, 20 - Math.abs(label.length - query.length))
        score += item?.recent ? 15 : 0
        score += Number(item?.usageCount || 0)

        return { item, score }
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxSuggestions)
      .map((entry) => entry.item)
  }, [debouncedValue, getLabel, items, maxSuggestions])

  useEffect(() => {
    setHighlightedIndex(0)
  }, [value])

  const handleKeyDown = (event, onSelect) => {
    if (!suggestions.length) return false

    if (!isOpen && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault()
      event.stopPropagation()
      setOpen(true)
      setHighlightedIndex((current) => {
        if (event.key === 'ArrowUp') return Math.max(Math.min(current, suggestions.length - 1), 0)
        return Math.max(Math.min(current, suggestions.length - 1), 0)
      })
      return true
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      event.stopPropagation()
      setOpen(true)
      setHighlightedIndex((i) => Math.min(i + 1, suggestions.length - 1))
      return true
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      event.stopPropagation()
      setOpen(true)
      setHighlightedIndex((i) => Math.max(i - 1, 0))
      return true
    }

    if (event.key === 'Enter' && isOpen) {
      event.preventDefault()
      event.stopPropagation()
      onSelect?.(suggestions[highlightedIndex] ?? suggestions[0])
      setOpen(false)
      return true
    }

    if (event.key === 'Tab' && isOpen) {
      onSelect?.(suggestions[highlightedIndex] ?? suggestions[0])
      setOpen(false)
      return false
    }

    if (event.key === 'Escape' && isOpen) {
      event.preventDefault()
      event.stopPropagation()
      setOpen(false)
      return true
    }

    return false
  }

  return {
    isOpen,
    setOpen,
    suggestions,
    highlightedIndex,
    setHighlightedIndex,
    handleKeyDown,
  }
}
