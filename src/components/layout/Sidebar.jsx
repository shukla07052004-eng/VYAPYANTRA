import React, { memo, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { BUSINESS } from '../../data/store.js'
import { ERP_SIDEBAR_ITEMS } from '../../data/erpModules.js'

export const NAV_ITEMS = ERP_SIDEBAR_ITEMS

function Sidebar({
  onNavigate,
  onToggleSection,
  focusManager,
  activeIndex = 0,
  visibleItems = [],
  openSectionId = null,
  onActiveIndexChange,
}) {
  const location = useLocation()
  const activePath = location.pathname
  const activeSectionId = useMemo(
    () => NAV_ITEMS.find((item) => item.children?.some((child) => activePath === child.path || activePath.startsWith(`${child.path}/`)))?.id ?? null,
    [activePath],
  )

  const visibleIndexMap = useMemo(
    () => new Map(visibleItems.map((item, index) => [item.id, index])),
    [visibleItems],
  )

  return (
    <aside className="erp-sidebar" aria-label="Main navigation" data-sidebar-root="true">
      <div className="erp-sidebar__scroll">
        <nav className="erp-sidebar__nav">
          {NAV_ITEMS.map((item) => {
            const isSection = Boolean(item.children?.length)
            const isOpen = openSectionId === item.id
            const isSectionActive = activeSectionId === item.id
            const parentIndex = visibleIndexMap.get(item.id) ?? -1

            return (
              <div key={item.id} className="erp-sidebar__group">
                <SidebarButton
                  item={item}
                  active={item.path ? activePath === item.path || activePath.startsWith(`${item.path}/`) : isSectionActive}
                  expanded={isSection ? isOpen : undefined}
                  focusManager={focusManager}
                  tabIndex={parentIndex === activeIndex ? 0 : -1}
                  onFocus={() => onActiveIndexChange?.(parentIndex)}
                  onClick={() => {
                    if (isSection) {
                      onToggleSection?.(item.id)
                      return
                    }
                    onNavigate?.(item.path)
                  }}
                />

                {isSection && (
                  <div className="erp-sidebar__submenu" data-open={isOpen ? 'true' : 'false'}>
                    <div className="erp-sidebar__submenu-inner">
                      {item.children.map((child) => {
                        const childIndex = visibleIndexMap.get(child.id) ?? -1
                        const active = activePath === child.path || activePath.startsWith(`${child.path}/`)
                        return (
                          <button
                            key={child.id}
                            ref={focusManager?.register(`sidebar-${child.id}`)}
                            type="button"
                            className="erp-sidebar__subitem"
                            data-active={active ? 'true' : 'false'}
                            tabIndex={childIndex === activeIndex ? 0 : -1}
                            aria-current={active ? 'page' : undefined}
                            onFocus={() => onActiveIndexChange?.(childIndex)}
                            onClick={() => onNavigate?.(child.path)}
                            onMouseDown={(event) => {
                              event.preventDefault()
                              event.stopPropagation()
                            }}
                          >
                            <span className="erp-sidebar__subitem-dot" aria-hidden="true" />
                            <span>{child.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </nav>
      </div>

      <div className="erp-sidebar__footer">
        <div className="erp-sidebar__user">
          <div className="erp-sidebar__user-name">Admin User</div>
          <div className="erp-sidebar__user-company">{BUSINESS.name}</div>
        </div>
        <div className="erp-sidebar__footer-actions">
          <button type="button" onClick={() => onNavigate?.('/settings/keyboard')} className="erp-sidebar__footer-btn">
            Settings
          </button>
          <button type="button" onClick={() => onNavigate?.('/dashboard')} className="erp-sidebar__footer-btn">
            Logout
          </button>
        </div>
      </div>
    </aside>
  )
}

function SidebarButton({ item, active, expanded, focusManager, tabIndex, onFocus, onClick }) {
  const isSection = Boolean(item.children?.length)

  return (
    <button
      ref={focusManager?.register(`sidebar-${item.id}`)}
      data-sidebar-item="true"
      type="button"
      className="erp-sidebar__item"
      data-active={active ? 'true' : 'false'}
      data-section={isSection ? 'true' : 'false'}
      tabIndex={tabIndex}
      aria-current={active && !isSection ? 'page' : undefined}
      aria-expanded={isSection ? expanded : undefined}
      onFocus={onFocus}
      onClick={onClick}
      onMouseDown={(event) => {
        event.preventDefault()
        event.stopPropagation()
      }}
    >
      <span className="erp-sidebar__item-main">
        <SidebarIcon name={item.icon} />
        <span className="erp-sidebar__item-label">{item.label}</span>
      </span>
      {isSection && <span className="erp-sidebar__caret" data-open={expanded ? 'true' : 'false'} aria-hidden="true" />}
    </button>
  )
}

function SidebarIcon({ name = 'grid' }) {
  const paths = {
    dashboard: 'M4 5.5h6v5H4zm10 0h6v9h-6zM4 13.5h6v5H4zm10-1h6v6h-6z',
    invoice: 'M6 4.5h9l3 3v12H6zm9 0v3h3M9 11h6M9 14h6M9 17h4',
    cart: 'M4.5 6h2l1.2 6.2h8.8l1.5-4.7H8.2M9 17.5a1.1 1.1 0 1 0 0 .01M16 17.5a1.1 1.1 0 1 0 0 .01',
    parties: 'M8.5 11a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zm7 1a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4zM4.5 18c.7-2.2 2.5-3.3 5-3.3s4.3 1.1 5 3.3m-2.3 0c.4-1.5 1.6-2.3 3.4-2.3 1.7 0 2.8.8 3.3 2.3',
    inventory: 'M5 7.5 12 4l7 3.5v9L12 20l-7-3.5zm7-3.5v16m-7-12.5 7 3.5 7-3.5',
    wallet: 'M4.5 7.5h14a1.5 1.5 0 0 1 1.5 1.5v6a1.5 1.5 0 0 1-1.5 1.5h-14A1.5 1.5 0 0 1 3 15V9a1.5 1.5 0 0 1 1.5-1.5zm0 0V6.8A1.8 1.8 0 0 1 6.3 5h10.4M16 12h2.5',
    analytics: 'M6 18.5V11m6 7.5V6m6 12.5v-9',
    spark: 'M12 4.5 13.8 9 18.5 10.8 14 12.6 12.2 17.5 10.4 12.6 5.5 10.8 10.2 9z',
    bank: 'M3.5 8 12 4l8.5 4M5.5 10.5h13M6.5 10.5v6m3.5-6v6m3.5-6v6m3.5-6v6M4.5 18.5h15',
    tools: 'M13.5 5.5a3 3 0 0 0 4 4L12 15l-3-1-1-3 5.5-5.5zm-6 7L5 15l-1.5-.5L3 13l2.5-2.5',
    keyboard: 'M4 7.5h16v9H4zm2.5 2.5h1.5m2 0h1.5m2 0H15m2 0h1.5M6.5 13h9',
    grid: 'M5 5h6v6H5zm8 0h6v6h-6zM5 13h6v6H5zm8 0h6v6h-6z',
  }

  return (
    <span className="erp-sidebar__icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d={paths[name] ?? paths.grid} />
      </svg>
    </span>
  )
}

export default memo(Sidebar)
