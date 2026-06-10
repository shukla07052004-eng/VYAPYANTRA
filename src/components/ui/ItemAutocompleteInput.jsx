import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import useAutocomplete from '../../hooks/useAutocomplete.js'
import { useApp } from '../../context/AppContext.jsx'
import { useEscapeAction } from '../../context/EscapeContext.jsx'
import { fmt } from '../../utils/helpers.js'

const inputStyle = {
  width: '100%',
  height: '28px',
  border: '1px solid transparent',
  background: 'transparent',
  fontSize: '12px',
  padding: '0 4px',
  outline: 'none',
}

const suggestionButton = {
  width: '100%',
  border: 'none',
  background: '#fff',
  textAlign: 'left',
  padding: '8px 10px',
  borderBottom: '1px solid #ececec',
  cursor: 'pointer',
}

const recentLabelStyle = {
  fontSize: 10.5,
  color: '#666',
  textTransform: 'uppercase',
  letterSpacing: '.08em',
}

const PORTAL_Z_INDEX = 5000

const ItemAutocompleteInput = forwardRef(function ItemAutocompleteInput({
  value,
  rowIndex,
  onChange,
  onSelect,
  onKeyDown,
  onFocus,
  placeholder = '',
}, forwardedRef) {
  const { itemMaster, recentItems } = useApp()
  const inputRef = useRef(null)
  const dropdownRef = useRef(null)
  const [portalRoot, setPortalRoot] = useState(null)
  const [position, setPosition] = useState(null)

  useImperativeHandle(forwardedRef, () => inputRef.current)

  const suggestionsSource = useMemo(() => {
    const merged = new Map()
    recentItems.forEach((item) => merged.set(item.name.toLowerCase(), { ...item, recent: true }))
    itemMaster.forEach((item) => {
      const key = item.name.toLowerCase()
      merged.set(key, { ...merged.get(key), ...item })
    })
    return Array.from(merged.values())
  }, [itemMaster, recentItems])

  const { isOpen, setOpen, suggestions, highlightedIndex, setHighlightedIndex, handleKeyDown } = useAutocomplete({
    items: suggestionsSource,
    value,
    getLabel: (item) => item.name,
    maxSuggestions: 10,
    debounceMs: 35,
  })

  useEffect(() => {
    setPortalRoot(document.body)
  }, [])

  const updatePosition = () => {
    const node = inputRef.current
    if (!(node instanceof HTMLElement)) return
    const rect = node.getBoundingClientRect()
    setPosition({
      top: rect.bottom + 2,
      left: rect.left,
      width: rect.width,
      maxHeight: Math.max(180, Math.min(280, window.innerHeight - rect.bottom - 16)),
    })
  }

  useEffect(() => {
    if (!isOpen) return undefined

    updatePosition()

    const handleScrollOrResize = () => updatePosition()
    window.addEventListener('resize', handleScrollOrResize)
    window.addEventListener('scroll', handleScrollOrResize, true)

    return () => {
      window.removeEventListener('resize', handleScrollOrResize)
      window.removeEventListener('scroll', handleScrollOrResize, true)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return undefined

    const handlePointerDown = (event) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (inputRef.current?.contains(target)) return
      if (dropdownRef.current?.contains(target)) return
      setOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown, true)
    return () => document.removeEventListener('mousedown', handlePointerDown, true)
  }, [isOpen, setOpen])

  useEscapeAction({
    active: isOpen,
    priority: 80,
    handler: () => {
      setOpen(false)
      return true
    },
  })

  const selectItem = (item) => {
    if (!item) return
    onSelect?.(item)
    setOpen(false)
  }

  const dropdown = portalRoot && isOpen && suggestions.length > 0 && position
    ? createPortal(
        <div
          ref={dropdownRef}
          data-item-suggestions={rowIndex}
          style={{
            position: 'fixed',
            top: position.top,
            left: position.left,
            width: position.width,
            maxHeight: position.maxHeight,
            overflowY: 'auto',
            background: '#fff',
            border: '1px solid #111',
            boxShadow: '0 14px 28px rgba(0,0,0,.18), 0 2px 8px rgba(0,0,0,.08)',
            zIndex: PORTAL_Z_INDEX,
          }}
        >
          {suggestions.map((item, index) => (
            <button
              key={`${item.id}-${index}`}
              type="button"
              style={{
                ...suggestionButton,
                background: highlightedIndex === index ? '#dbe8ff' : '#fff',
              }}
              onMouseDown={(event) => {
                event.preventDefault()
                event.stopPropagation()
                setHighlightedIndex(index)
                selectItem(item)
              }}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 2 }}>
                <strong style={{ fontSize: 12.5 }}>{item.name}</strong>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11.5 }}>{item.stockQty}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 11, color: '#555' }}>
                <span>GST {item.gstSlab}% | Rate {fmt(item.lastRate)}</span>
                <span style={recentLabelStyle}>{item.recent ? 'Recent' : 'Master'}</span>
              </div>
            </button>
          ))}
        </div>,
        portalRoot,
      )
    : null

  return (
    <>
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          value={value}
          placeholder={placeholder}
          className="erp-grid-input"
          style={inputStyle}
          onFocus={(event) => {
            setOpen(true)
            updatePosition()
            onFocus?.(event)
          }}
          onChange={(event) => {
            onChange?.(event.target.value)
            setOpen(true)
            updatePosition()
          }}
          onKeyDown={(event) => {
            const handled = handleKeyDown(event, selectItem)
            if (handled) return
            if (event.key === 'Tab' && isOpen && suggestions.length > 0) {
              event.preventDefault()
              return
            }
            onKeyDown?.(event)
          }}
        />
      </div>
      {dropdown}
    </>
  )
})

export default ItemAutocompleteInput
