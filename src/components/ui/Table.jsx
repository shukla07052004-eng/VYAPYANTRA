import React, { useState } from 'react'
import useKeyboardListNavigation from '../../hooks/useKeyboardListNavigation.js'

export default function Table({
  cols,
  rows,
  onRowClick,
  emptyMsg = 'No records found',
  stickyHead = false,
  focusId,
}) {
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('asc')
  const focusZone = useKeyboardListNavigation({
    orientation: 'vertical',
    onSelect: (_, index) => onRowClick?.(sorted[index]),
  })

  const sorted = sortKey
    ? [...rows].sort((a, b) => {
        const v1 = a[sortKey]
        const v2 = b[sortKey]
        if (typeof v1 === 'number') return sortDir === 'asc' ? v1 - v2 : v2 - v1
        return sortDir === 'asc'
          ? String(v1 ?? '').localeCompare(String(v2 ?? ''))
          : String(v2 ?? '').localeCompare(String(v1 ?? ''))
      })
    : rows

  const handleSort = (col) => {
    if (col.sortable === false) return
    if (sortKey === col.key) setSortDir((dir) => dir === 'asc' ? 'desc' : 'asc')
    else {
      setSortKey(col.key)
      setSortDir('asc')
    }
  }

  const handleKeyDown = (event, index) => {
    if (event.key === 'Enter' && onRowClick) {
      event.preventDefault()
      onRowClick(sorted[index])
    }
  }

  return (
    <div
      id={focusId}
      ref={focusZone.ref}
      style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {cols.map((col) => (
              <th
                key={col.key}
                onClick={() => handleSort(col)}
                style={{
                  padding: '9px 14px',
                  textAlign: col.right ? 'right' : 'left',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--ink-40)',
                  textTransform: 'uppercase',
                  letterSpacing: '.06em',
                  borderBottom: '1px solid var(--border)',
                  background: 'var(--surface-2)',
                  whiteSpace: 'nowrap',
                  cursor: col.sortable === false ? 'default' : 'pointer',
                  userSelect: 'none',
                  position: stickyHead ? 'sticky' : undefined,
                  top: stickyHead ? 0 : undefined,
                }}
              >
                {col.label}
                {col.sortable !== false && sortKey === col.key && (
                  <span style={{ marginLeft: 4, opacity: 0.7 }}>
                    {sortDir === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={cols.length} style={{ padding: '40px', textAlign: 'center', color: 'var(--ink-20)', fontSize: 13 }}>
                {emptyMsg}
              </td>
            </tr>
          ) : sorted.map((row, index) => (
            <TableRow
              key={row.id ?? index}
              row={row}
              cols={cols}
              index={index}
              isLast={index === sorted.length - 1}
              clickable={Boolean(onRowClick)}
              focusable={sorted.length > 0}
              onClick={() => onRowClick?.(row)}
              onKeyDown={(event) => handleKeyDown(event, index)}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TableRow({ row, cols, index, isLast, clickable, focusable, onClick, onKeyDown }) {
  const [hovered, setHovered] = useState(false)

  return (
    <tr
      className="focusable-row"
      data-focus-item={focusable ? 'true' : undefined}
      tabIndex={focusable && index === 0 ? 0 : -1}
      onClick={onClick}
      onKeyDown={onKeyDown}
      onMouseDown={() => {
        if (focusable && document.activeElement !== document.body) {
          requestAnimationFrame(() => {
            const activeRow = document.activeElement instanceof HTMLElement
              ? document.activeElement.closest('tr[data-focus-item="true"]')
              : null
            if (!activeRow && clickable) {
              document.activeElement?.blur?.()
            }
          })
        }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'var(--surface-2)' : 'transparent',
        cursor: clickable ? 'pointer' : 'default',
        outline: 'none',
        transition: 'background .09s',
      }}
    >
      {cols.map((col) => (
        <td
          key={col.key}
          className="focusable-row-cell"
          style={{
            padding: '11px 14px',
            fontSize: 13,
            borderBottom: isLast ? 'none' : '1px solid var(--border)',
            textAlign: col.right ? 'right' : 'left',
            fontFamily: col.mono ? 'var(--mono)' : 'var(--font)',
            color: col.dim ? 'var(--ink-40)' : 'var(--ink)',
            whiteSpace: col.wrap ? 'normal' : 'nowrap',
            fontWeight: col.bold ? 600 : 400,
          }}
        >
          {col.render ? col.render(row[col.key], row, index) : row[col.key]}
        </td>
      ))}
    </tr>
  )
}
