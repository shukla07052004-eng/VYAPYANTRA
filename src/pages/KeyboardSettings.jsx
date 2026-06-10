import React, { useMemo, useState } from 'react'
import { DEFAULT_SHORTCUTS } from '../hooks/useKeyboard.js'
import { PageHeader, Card, CardHead, CardBody, Input, Button } from '../components/ui/index.js'

export default function KeyboardSettingsPage({ shortcuts, onSave }) {
  const [draft, setDraft] = useState(shortcuts)
  const rows = useMemo(() => Object.entries(DEFAULT_SHORTCUTS), [])

  const updateShortcut = (id, value) => {
    setDraft((current) => ({ ...current, [id]: value }))
  }

  return (
    <div className="animate-slide">
      <PageHeader title="Keyboard Settings" sub="Remap workspace shortcuts and save them to localStorage." />
      <Card>
        <CardHead title="Shortcut Map" sub="Use formats like Ctrl+S, Ctrl+K, F2, ArrowUp." />
        <CardBody id="keyboard-settings-form" style={{ display: 'grid', gap: 12 }}>
          {rows.map(([id, fallback]) => (
            <div key={id} style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 12, alignItems: 'end' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{labelForShortcut(id)}</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-40)' }}>Default: {fallback}</div>
              </div>
              <Input
                value={draft[id] ?? fallback}
                onChange={(event) => updateShortcut(id, event.target.value)}
                placeholder={fallback}
              />
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button variant="ghost" onClick={() => setDraft(DEFAULT_SHORTCUTS)}>Reset Defaults</Button>
            <Button variant="primary" onClick={() => onSave(draft)}>Save Shortcuts</Button>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

function labelForShortcut(id) {
  return {
    focusSearch: 'Focus Search',
    newInvoice: 'New Invoice',
    saveRecord: 'Save Record',
    navSales: 'Go To Sales',
    navPurchase: 'Go To Purchase',
    navReports: 'Go To Reports',
    moveSidebarUp: 'Sidebar Up',
    moveSidebarDown: 'Sidebar Down',
    selectSidebarItem: 'Sidebar Select',
  }[id] ?? id
}
