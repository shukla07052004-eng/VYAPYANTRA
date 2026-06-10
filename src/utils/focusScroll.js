function getScrollParents(target) {
  const parents = []
  let node = target.parentElement

  while (node) {
    const styles = window.getComputedStyle(node)
    const overflowY = styles.overflowY
    const overflowX = styles.overflowX
    const canScrollY = /(auto|scroll|overlay)/.test(overflowY) && node.scrollHeight > node.clientHeight
    const canScrollX = /(auto|scroll|overlay)/.test(overflowX) && node.scrollWidth > node.clientWidth

    if (canScrollY || canScrollX) {
      parents.push(node)
    }

    node = node.parentElement
  }

  return parents
}

function alignRect(containerRect, targetRect, current, max, axis, padding, mode) {
  if (mode === 'center') {
    const containerSize = axis === 'y' ? containerRect.height : containerRect.width
    const targetStart = axis === 'y' ? targetRect.top : targetRect.left
    const containerStart = axis === 'y' ? containerRect.top : containerRect.left
    const targetSize = axis === 'y' ? targetRect.height : targetRect.width
    const desired = current + (targetStart - containerStart) - ((containerSize - targetSize) / 2)
    return Math.min(Math.max(desired, 0), max)
  }

  const before = axis === 'y' ? targetRect.top - containerRect.top : targetRect.left - containerRect.left
  const after = axis === 'y' ? containerRect.bottom - targetRect.bottom : containerRect.right - targetRect.right

  if (before < padding) {
    return Math.max(current + before - padding, 0)
  }

  if (after < padding) {
    return Math.min(current + (padding - after), max)
  }

  return current
}

export function scrollElementIntoView(target, options = {}) {
  if (!(target instanceof HTMLElement) || !target.isConnected) return false

  const behavior = options.behavior ?? 'auto'
  const padding = options.padding ?? 12
  const block = options.block ?? 'center'

  requestAnimationFrame(() => {
    if (!target.isConnected) return

    const targetRect = target.getBoundingClientRect()
    const parents = getScrollParents(target)

    parents.forEach((parent) => {
      const rect = parent.getBoundingClientRect()
      const nextTop = alignRect(rect, targetRect, parent.scrollTop, parent.scrollHeight - parent.clientHeight, 'y', padding, block)
      const nextLeft = alignRect(rect, targetRect, parent.scrollLeft, parent.scrollWidth - parent.clientWidth, 'x', padding, block === 'center' ? 'center' : 'nearest')

      if (nextTop !== parent.scrollTop || nextLeft !== parent.scrollLeft) {
        parent.scrollTo({ top: nextTop, left: nextLeft, behavior })
      }
    })
  })

  return true
}
