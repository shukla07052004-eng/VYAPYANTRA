import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { AppProvider } from './context/AppContext.jsx'
import { ToastProvider } from './context/ToastContext.jsx'
import { useToast } from './context/ToastContext.jsx'
import { EscapeProvider, useEscapeAction } from './context/EscapeContext.jsx'
import useKeyboard, { DEFAULT_SHORTCUTS, KEYBOARD_SETTINGS_STORAGE_KEY } from './hooks/useKeyboard.js'
import useFocusManager from './hooks/useFocusManager.js'
import Sidebar, { NAV_ITEMS } from './components/layout/Sidebar.jsx'
import Topbar from './components/layout/Topbar.jsx'
import Dashboard from './pages/Dashboard.jsx'
import SalesPage from './pages/Sales.jsx'
import PurchasePage from './pages/Purchase.jsx'
import PartiesPage from './pages/Parties.jsx'
import KeyboardSettingsPage from './pages/KeyboardSettings.jsx'
import NewInvoicePage from './pages/NewInvoicePage.jsx'
import NewPurchasePage from './pages/Newpuchasepage.jsx'
import PartyFormPage from './pages/PartyFormPage.jsx'
import ReportDetailPage from './pages/ReportDetailPage.jsx'
import ExpenseManagementPage from './pages/ExpenseManagementPage.jsx'
import { AiReportPage, AiReportsDashboardPage, BankingDashboardPage, BankingModulePage, ItemsMasterPage, UtilitiesDashboardPage, UtilityModulePage } from './pages/WorkspaceModules.jsx'
import { findSidebarSectionByPath, getVisibleSidebarItems } from './data/erpModules.js'
import {
  DuesPage,
  ReportsPage,
  WorkersPage,
} from './pages/OtherPages.jsx'

const PAGE_FOCUS_TARGETS = {
  '/': '#dashboard-recent-invoices [data-focus-item="true"]',
  '/dashboard': '#dashboard-recent-invoices [data-focus-item="true"]',
  '/sales': '#sales-invoices [data-focus-item="true"]',
  '/sales/new': '[data-page-focus="invoice-party"]',
  '/purchase/new': '[data-page-focus="purchase-supplier"]',
  '/purchase': '#purchase-list [data-focus-item="true"]',
  '/parties': '#parties-list [data-focus-item="true"]',
  '/parties/new': '[data-page-focus="party-company"]',
  '/reports': '#reports-grid [data-focus-item="true"]',
  '/reports/sales': '#report-billwise-profit [data-focus-item="true"]',
  '/reports/purchase': '#report-party-statement [data-focus-item="true"]',
  '/reports/billwiseprofit': '#report-billwise-profit [data-focus-item="true"]',
  '/reports/statement': '#report-party-statement [data-focus-item="true"]',
  '/reports/gst': '[data-gst-sidebar-item="true"]',
  '/reports/profit': '[data-focus-item="true"]',
  '/reports/expenses': '#report-expenses-analysis [data-focus-item="true"]',
  '/reports/expensesanalysis': '#report-expenses-analysis [data-focus-item="true"]',
  '/reports/profit-loss': '[data-focus-item="true"]',
  '/reports/stock': '#report-stock [data-focus-item="true"]',
  '/reports/cashflow': '[data-focus-item="true"]',
  '/reports/balance-sheet': '#report-balance-sheet [data-focus-item="true"]',
  '/items': '#items-master-table [data-focus-item="true"]',
  '/ai-reports': '#ai-reports-dashboard [data-focus-item="true"]',
  '/ai-reports/sales-prediction': '#ai-sales-prediction [data-focus-item="true"]',
  '/ai-reports/purchase-prediction': '#ai-purchase-prediction [data-focus-item="true"]',
  '/ai-reports/dead-stock-analysis': '#ai-dead-stock-analysis [data-focus-item="true"]',
  '/ai-reports/expense-analysis': '#ai-expense-analysis [data-focus-item="true"]',
  '/ai-reports/gst-analysis': '#ai-gst-analysis [data-focus-item="true"]',
  '/ai-reports/smart-reorder-suggestions': '#ai-smart-reorder-suggestions [data-focus-item="true"]',
  '/ai-reports/profit-analysis': '#ai-profit-analysis [data-focus-item="true"]',
  '/ai-reports/customer-behaviour': '#ai-customer-behaviour [data-focus-item="true"]',
  '/ai-reports/vendor-analysis': '#ai-vendor-analysis [data-focus-item="true"]',
  '/ai-reports/fast-moving-items': '#ai-fast-moving-items [data-focus-item="true"]',
  '/banking': '#banking-dashboard [data-focus-item="true"]',
  '/banking/loan-accounts': '#loan-accounts-table [data-focus-item="true"]',
  '/banking/checks': '#checks-table [data-focus-item="true"]',
  '/banking/bank-accounts': '#bank-accounts-table [data-focus-item="true"]',
  '/banking/cash-in-hand': '#cash-transactions-table [data-focus-item="true"]',
  '/utilities': '#utilities-dashboard [data-focus-item="true"]',
  '/utilities/manage-companies': '#company-list [data-focus-item="true"]',
  '/utilities/backup-restore': '[data-focus-item="true"]',
  '/utilities/data-verification': '#verification-matrix [data-focus-item="true"]',
  '/utilities/item-libraries': '#item-library-table [data-focus-item="true"]',
  '/utilities/bulk-update-tax-slab': '#bulk-tax-preview [data-focus-item="true"]',
  '/utilities/export-items': '#export-items-table [data-focus-item="true"]',
  '/utilities/import-items': '#import-items-table [data-focus-item="true"]',
  '/utilities/sync-share': '#sync-share-table [data-focus-item="true"]',
  '/workers': '#workers-grid [data-focus-item="true"]',
  '/expense': '#expense-statement [data-focus-item="true"]',
  '/dues': '#dues-list [data-focus-item="true"]',
  '/settings/keyboard': '#keyboard-settings-form input',
}

function isLockedWorkspacePath(pathname) {
  return pathname === '/sales/new' || pathname === '/purchase/new' || pathname === '/parties/new'
}

function parentIdForPath(pathname) {
  return findSidebarSectionByPath(pathname)
}

function sidebarItemIdForPath(pathname) {
  const normalizedPath = pathname === '/' ? '/dashboard' : pathname
  const directMatch = NAV_ITEMS.find((item) => item.path === normalizedPath)
  if (directMatch) return directMatch.id
  return parentIdForPath(normalizedPath)
}

function parentIdForSidebarItemId(itemId) {
  return NAV_ITEMS.find((item) => item.children?.some((child) => child.id === itemId))?.id ?? null
}

export default function App({ onReady }) {
  return (
    <ToastProvider>
      <AppProvider>
        <EscapeEnabledAppShell onReady={onReady} />
      </AppProvider>
    </ToastProvider>
  )
}

function EscapeEnabledAppShell({ onReady }) {
  const navigate = useNavigate()
  const location = useLocation()
  const focusManager = useFocusManager()
  const mainRef = useRef(null)
  const forceSidebarRestoreRef = useRef(false)

  const focusMainTarget = useCallback((path = location.pathname) => {
    const selector = PAGE_FOCUS_TARGETS[path] ?? PAGE_FOCUS_TARGETS['/dashboard']
    if (!selector) return false

    requestAnimationFrame(() => {
      const container = mainRef.current
      if (!container) return
      const target = container.querySelector(selector)
      if (target instanceof HTMLElement && document.activeElement !== target) {
        target.focus({ preventScroll: true })
      }
    })

    return true
  }, [location.pathname])

  const ensureSafeFocus = useCallback(() => {
    requestAnimationFrame(() => {
      const activeElement = document.activeElement
      const invalidFocus = !(activeElement instanceof HTMLElement)
        || activeElement === document.body
        || !activeElement.isConnected
        || activeElement.closest('[aria-hidden="true"]')

      if (!invalidFocus) return
      if (focusManager.restoreFocus()) return
      focusMainTarget(location.pathname)
    })
  }, [focusMainTarget, focusManager, location.pathname])

  const focusActiveSidebarItem = useCallback(() => {
    const activeElement = document.activeElement
    if (activeElement instanceof HTMLElement && activeElement !== document.body) {
      activeElement.blur?.()
    }

    const activeKey = String(focusManager.activeFocusKey || '')
    if (activeKey.startsWith('sidebar-') && focusManager.focus(activeKey)) {
      return true
    }
    const sidebarItemId = sidebarItemIdForPath(location.pathname)
    if (sidebarItemId && focusManager.focus(`sidebar-${sidebarItemId}`)) return true
    return focusManager.focus('sidebar-dashboard')
  }, [focusManager, location.pathname])

  const handleUnhandledEscape = useCallback(() => {
    const activeElement = document.activeElement
    const focusInsideSidebar = activeElement instanceof HTMLElement && Boolean(activeElement.closest('[data-sidebar-root="true"]'))

    if (focusInsideSidebar) {
      const activeKey = String(focusManager.activeFocusKey || '')
      const currentSidebarId = activeKey.startsWith('sidebar-') ? activeKey.replace('sidebar-', '') : sidebarItemIdForPath(location.pathname)
      const parentId = currentSidebarId ? parentIdForSidebarItemId(currentSidebarId) : null
      if (parentId) {
        focusManager.focus(`sidebar-${parentId}`)
        return true
      }
      return focusActiveSidebarItem()
    }

    if (!isLockedWorkspacePath(location.pathname) && !focusInsideSidebar) {
      return focusActiveSidebarItem()
    }

    const canGoBack = typeof window !== 'undefined' && Number(window.history.state?.idx) > 0
    if (canGoBack) {
      forceSidebarRestoreRef.current = true
      navigate(-1)
      return true
    }
    if (location.pathname !== '/' && location.pathname !== '/dashboard') {
      forceSidebarRestoreRef.current = true
      navigate('/dashboard')
      return true
    }
    focusMainTarget('/dashboard')
    return true
  }, [focusActiveSidebarItem, focusMainTarget, focusManager, location.pathname, navigate])

  return (
    <EscapeProvider onUnhandledEscape={handleUnhandledEscape} onAfterEscape={ensureSafeFocus}>
      <AppShell
        onReady={onReady}
        focusManager={focusManager}
        mainRef={mainRef}
        focusMainTarget={focusMainTarget}
        forceSidebarRestoreRef={forceSidebarRestoreRef}
      />
    </EscapeProvider>
  )
}

function AppShell({ onReady, focusManager, mainRef, focusMainTarget, forceSidebarRestoreRef }) {
  const toast = useToast()
  const [sidebarVisible, setSidebarVisible] = useState(false)
  const [shortcutSettings, setShortcutSettings] = useState(() => {
    const saved = window.localStorage.getItem(KEYBOARD_SETTINGS_STORAGE_KEY)
    return saved ? { ...DEFAULT_SHORTCUTS, ...JSON.parse(saved) } : DEFAULT_SHORTCUTS
  })
  const location = useLocation()
  const navigate = useNavigate()
  const [openSidebarSectionId, setOpenSidebarSectionId] = useState(() => findSidebarSectionByPath(location.pathname))
  const visibleSidebarItems = useMemo(() => getVisibleSidebarItems(openSidebarSectionId), [openSidebarSectionId])
  const [sidebarIndex, setSidebarIndex] = useState(0)
  const [routeFocusMode, setRouteFocusMode] = useState('sidebar')
  const isLockedWorkspaceRoute = isLockedWorkspacePath(location.pathname)
  const searchRef = useRef(null)
  const initialSidebarFocusDoneRef = useRef(false)

  const focusSidebarItemById = useCallback((itemId, { collapseParent = false } = {}) => {
    if (!itemId) return false

    const parentId = parentIdForSidebarItemId(itemId)
    const focusTargetId = collapseParent && parentId ? parentId : itemId
    const sectionToOpen = collapseParent ? null : (parentId ?? (NAV_ITEMS.find((item) => item.id === itemId && item.children?.length) ? itemId : null))

    if (sectionToOpen !== openSidebarSectionId) {
      setOpenSidebarSectionId(sectionToOpen)
    }

    const activeElement = document.activeElement
    if (activeElement instanceof HTMLElement && activeElement !== document.body) {
      activeElement.blur?.()
    }

    let attempts = 8
    const tryFocus = () => {
      const focused = focusManager.focus(`sidebar-${focusTargetId}`)
      if (focused) return
      if (attempts <= 0) return
      attempts -= 1
      requestAnimationFrame(tryFocus)
    }

    requestAnimationFrame(tryFocus)
    return true
  }, [focusManager, openSidebarSectionId])

  useEffect(() => {
    const timer = setTimeout(() => setSidebarVisible(true), 200)
    onReady?.()
    return () => clearTimeout(timer)
  }, [onReady])

  useEffect(() => {
    const parentSectionId = findSidebarSectionByPath(location.pathname)
    if (parentSectionId) setOpenSidebarSectionId(parentSectionId)
  }, [location.pathname])

  useEffect(() => {
    const activePath = location.pathname === '/' ? '/dashboard' : location.pathname
    const activeItemIndex = visibleSidebarItems.findIndex((item) => item.path === activePath || item.id === parentIdForPath(activePath))
    setSidebarIndex(activeItemIndex >= 0 ? activeItemIndex : 0)
  }, [location.pathname, visibleSidebarItems])

  useEffect(() => {
    if (routeFocusMode !== 'content') return
    focusMainTarget(location.pathname)
    setRouteFocusMode('idle')
  }, [focusMainTarget, location.pathname, routeFocusMode])

  useEffect(() => {
    if (isLockedWorkspaceRoute) return
    const activeElement = document.activeElement
    const mainElement = mainRef.current
    const focusInsideMain = activeElement instanceof HTMLElement && mainElement?.contains(activeElement)
    if (focusInsideMain) return
    focusMainTarget(location.pathname)
  }, [focusMainTarget, isLockedWorkspaceRoute, location.pathname, mainRef])

  useEffect(() => {
    if (isLockedWorkspaceRoute) return
    if (!sidebarVisible) return

    if (forceSidebarRestoreRef?.current) {
      forceSidebarRestoreRef.current = false
      const targetId = sidebarItemIdForPath(location.pathname) ?? 'dashboard'
      focusSidebarItemById(targetId)
      return
    }

    const current = visibleSidebarItems[sidebarIndex] ?? visibleSidebarItems[0]
    if (!current) return

    if (!initialSidebarFocusDoneRef.current) {
      initialSidebarFocusDoneRef.current = true
      focusSidebarItemById(current.id)
      return
    }
  }, [focusSidebarItemById, forceSidebarRestoreRef, isLockedWorkspaceRoute, sidebarIndex, sidebarVisible, visibleSidebarItems, location.pathname])

  const handleSidebarNavigate = useCallback((path) => {
    setRouteFocusMode('content')
    navigate(path)
  }, [navigate])

  const handleSidebarToggle = useCallback((sectionId) => {
    setOpenSidebarSectionId((current) => current === sectionId ? null : sectionId)
  }, [])

  useEscapeAction({
    active: !isLockedWorkspaceRoute,
    priority: 5,
    when: () => String(focusManager.activeFocusKey || '').startsWith('sidebar-'),
    handler: () => {
      const activeKey = String(focusManager.activeFocusKey || '')
      const currentSidebarId = activeKey.replace('sidebar-', '')
      const parentId = parentIdForSidebarItemId(currentSidebarId)

      if (parentId) {
        const collapsedItems = getVisibleSidebarItems(null)
        const nextIndex = collapsedItems.findIndex((item) => item.id === parentId)
        setOpenSidebarSectionId(null)
        setSidebarIndex(nextIndex >= 0 ? nextIndex : 0)
        focusSidebarItemById(currentSidebarId, { collapseParent: true })
        return true
      }

      if (openSidebarSectionId === currentSidebarId) {
        const collapsedItems = getVisibleSidebarItems(null)
        const nextIndex = collapsedItems.findIndex((item) => item.id === currentSidebarId)
        setOpenSidebarSectionId(null)
        setSidebarIndex(nextIndex >= 0 ? nextIndex : 0)
        focusSidebarItemById(currentSidebarId, { collapseParent: true })
        return true
      }

      return false
    },
  })

  const handleSaveShortcuts = (nextSettings) => {
    const merged = { ...DEFAULT_SHORTCUTS, ...nextSettings }
    window.localStorage.setItem(KEYBOARD_SETTINGS_STORAGE_KEY, JSON.stringify(merged))
    setShortcutSettings(merged)
    toast('Keyboard settings saved locally', 'success')
  }

  useKeyboard({
    shortcuts: shortcutSettings,
    bindings: [
      { id: 'focusSearch', allowInEditable: true, handler: () => searchRef.current?.focus({ preventScroll: true }) },
      { id: 'newInvoice', allowInEditable: true, handler: () => navigate('/sales/new') },
      {
        id: 'navSales',
        allowInEditable: true,
        handler: () => {
          setRouteFocusMode('content')
          navigate('/sales')
        },
      },
      {
        id: 'navPurchase',
        allowInEditable: true,
        handler: () => {
          setRouteFocusMode('content')
          navigate('/purchase')
        },
      },
      {
        id: 'navReports',
        allowInEditable: true,
        handler: () => {
          setRouteFocusMode('content')
          navigate('/reports')
        },
      },
      {
        id: 'moveSidebarUp',
        when: () => String(focusManager.activeFocusKey || '').startsWith('sidebar-'),
        handler: () => {
          const next = Math.max(sidebarIndex - 1, 0)
          setSidebarIndex(next)
          focusManager.focus(`sidebar-${visibleSidebarItems[next]?.id}`)
        },
      },
      {
        id: 'moveSidebarDown',
        when: () => String(focusManager.activeFocusKey || '').startsWith('sidebar-'),
        handler: () => {
          const next = Math.min(sidebarIndex + 1, visibleSidebarItems.length - 1)
          setSidebarIndex(next)
          focusSidebarItemById(visibleSidebarItems[next]?.id)
        },
      },
      {
        id: 'moveSidebarLeft',
        when: () => String(focusManager.activeFocusKey || '').startsWith('sidebar-'),
        handler: () => {
          const current = visibleSidebarItems[sidebarIndex]
          if (!current) return
          if (current.parentId) {
            const parentIndex = getVisibleSidebarItems(null).findIndex((item) => item.id === current.parentId)
            setSidebarIndex(parentIndex >= 0 ? parentIndex : 0)
            focusSidebarItemById(current.id, { collapseParent: true })
            return
          }
          if (current.type === 'section' && openSidebarSectionId === current.id) {
            const collapsedItems = getVisibleSidebarItems(null)
            const nextIndex = collapsedItems.findIndex((item) => item.id === current.id)
            setSidebarIndex(nextIndex >= 0 ? nextIndex : 0)
            focusSidebarItemById(current.id, { collapseParent: true })
          }
        },
      },
      {
        id: 'moveSidebarRight',
        when: () => String(focusManager.activeFocusKey || '').startsWith('sidebar-'),
        handler: () => {
          const current = visibleSidebarItems[sidebarIndex]
          if (!current || current.type !== 'section') return
          if (openSidebarSectionId !== current.id) {
            setOpenSidebarSectionId(current.id)
            requestAnimationFrame(() => {
              const expandedItems = getVisibleSidebarItems(current.id)
              const firstChild = expandedItems.find((item) => item.parentId === current.id)
              if (firstChild) {
                const nextIndex = expandedItems.findIndex((item) => item.id === firstChild.id)
                setSidebarIndex(nextIndex >= 0 ? nextIndex : sidebarIndex)
                focusSidebarItemById(firstChild.id)
              }
            })
            return
          }
          const firstChild = visibleSidebarItems.find((item) => item.parentId === current.id)
          if (firstChild) {
            const nextIndex = visibleSidebarItems.findIndex((item) => item.id === firstChild.id)
            setSidebarIndex(nextIndex >= 0 ? nextIndex : sidebarIndex)
            focusSidebarItemById(firstChild.id)
          }
        },
      },
      {
        id: 'selectSidebarItem',
        when: () => String(focusManager.activeFocusKey || '').startsWith('sidebar-'),
        handler: () => {
          const current = visibleSidebarItems[sidebarIndex]
          if (!current) return
          if (current.type === 'section') {
            handleSidebarToggle(current.id)
            focusSidebarItemById(current.id)
            return
          }
          handleSidebarNavigate(current.path || '/dashboard')
        },
      },
    ],
  })

  return (
    <div style={{ minHeight: '100vh', height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflow: 'hidden' }}>
      {!isLockedWorkspaceRoute && (
        <Topbar
          onNewInvoice={() => navigate('/sales/new')}
          onNewPurchase={() => navigate('/purchase/new')}
          onNewParty={() => navigate('/parties/new')}
          searchRef={searchRef}
        />
      )}

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {!isLockedWorkspaceRoute && (
          <div className={sidebarVisible ? 'sidebar-appear' : ''} style={{ flexShrink: 0, width: 'var(--sidebar-w)' }}>
            <Sidebar
              onNavigate={handleSidebarNavigate}
              onToggleSection={handleSidebarToggle}
              focusManager={focusManager}
              activeIndex={sidebarIndex}
              visibleItems={visibleSidebarItems}
              openSectionId={openSidebarSectionId}
              onActiveIndexChange={setSidebarIndex}
            />
          </div>
        )}

        <main
          id="main-content"
          ref={mainRef}
          style={{
            flex: 1,
            overflowY: isLockedWorkspaceRoute ? 'hidden' : 'auto',
            overflowX: 'hidden',
            padding: isLockedWorkspaceRoute ? 0 : '18px 20px',
            maxHeight: isLockedWorkspaceRoute ? '100vh' : 'calc(100vh - var(--topbar-h))',
            height: isLockedWorkspaceRoute ? '100vh' : 'calc(100vh - var(--topbar-h))',
            minWidth: 0,
            minHeight: 0,
            position: 'relative',
            background: isLockedWorkspaceRoute ? '#fff' : undefined,
          }}
        >
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/sales" element={<SalesPage onNewInvoice={() => navigate('/sales/new')} />} />
            <Route path="/purchase/new" element={<NewPurchasePage />} />
            <Route path="/sales/new" element={<NewInvoicePage />} />
            <Route path="/parties" element={<PartiesPage />} />
            <Route path="/parties/new" element={<PartyFormPage />} />
            <Route path="/purchase" element={<PurchasePage onNewPurchase={() => navigate('/purchase/new')} />} />
            <Route path="/expense" element={<ExpenseManagementPage />} />
            <Route path="/dues" element={<DuesPage />} />
            <Route path="/workers" element={<WorkersPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/reports/sales" element={<ReportDetailPage reportId="billwiseprofit" />} />
            <Route path="/reports/purchase" element={<ReportDetailPage reportId="statement" />} />
            <Route path="/reports/profit" element={<ReportDetailPage reportId="profit-loss" />} />
            <Route path="/reports/expenses" element={<ReportDetailPage reportId="expensesanalysis" />} />
            <Route path="/reports/billwiseprofit" element={<ReportDetailPage reportId="billwiseprofit" />} />
            <Route path="/reports/statement" element={<ReportDetailPage reportId="statement" />} />
            <Route path="/reports/gst" element={<ReportDetailPage reportId="gst" />} />
            <Route path="/reports/expensesanalysis" element={<ReportDetailPage reportId="expensesanalysis" />} />
            <Route path="/reports/profit-loss" element={<ReportDetailPage reportId="profit-loss" />} />
            <Route path="/reports/stock" element={<ReportDetailPage reportId="stock" />} />
            <Route path="/reports/cashflow" element={<ReportDetailPage reportId="cashflow" />} />
            <Route path="/reports/balance-sheet" element={<ReportDetailPage reportId="balance-sheet" />} />
            <Route path="/items" element={<ItemsMasterPage />} />
            <Route path="/ai-reports" element={<Navigate to="/ai-reports/sales-prediction" replace />} />
            <Route path="/ai-reports/:reportId" element={<AiReportPage />} />
            <Route path="/banking" element={<Navigate to="/banking/loan-accounts" replace />} />
            <Route path="/banking/:moduleId" element={<BankingModulePage />} />
            <Route path="/utilities" element={<Navigate to="/utilities/manage-companies" replace />} />
            <Route path="/utilities/:moduleId" element={<UtilityModulePage />} />
            <Route path="/settings/keyboard" element={<KeyboardSettingsPage shortcuts={shortcutSettings} onSave={handleSaveShortcuts} />} />
            <Route path="*" element={<Dashboard />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
