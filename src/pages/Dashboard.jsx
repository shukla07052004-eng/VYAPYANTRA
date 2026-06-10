import React, { useEffect, useMemo, useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { useApp } from '../context/AppContext.jsx'
import { BUSINESS, REVENUE_DATA } from '../data/store.js'
import { fmt, fmtShort, todayISO } from '../utils/helpers.js'
import { Button, Card, CardBody, CardHead, Input, KpiCard, Modal, PageHeader, Select, Textarea } from '../components/ui/index.js'
import { Avatar, Badge } from '../components/ui/index.js'
import Table from '../components/ui/Table.jsx'
import InvoiceView from '../components/layout/InvoiceView.jsx'
import useFocusZone from '../hooks/useFocusZone.js'

const DASHBOARD_TARGETS_STORAGE_KEY = 'bizledger.dashboard.targets'
const TARGET_PRIORITY_OPTIONS = ['High', 'Medium', 'Low']

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#111', color: '#fff', padding: '10px 14px', borderRadius: 6, fontSize: 12, fontFamily: 'var(--font)' }}>
      <div style={{ marginBottom: 4, color: '#888' }}>{label}</div>
      {payload.map((entry, index) => (
        <div key={index} style={{ color: entry.color, marginTop: 2 }}>{entry.name}: {fmt(entry.value)}</div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const { invoices } = useApp()
  const [viewInvoice, setViewInvoice] = useState(null)
  const [targets, setTargets] = useState(() => loadTargets())
  const [targetEditor, setTargetEditor] = useState(null)
  const targetFocus = useFocusZone({
    orientation: 'vertical',
    onSelect: (node) => {
      const targetId = node?.getAttribute('data-target-id')
      if (targetId) {
        const existing = targets.find((target) => target.id === targetId)
        if (existing) setTargetEditor(existing)
        return
      }
      if (node?.getAttribute('data-target-action') === 'create') {
        setTargetEditor(createEmptyTarget())
      }
    },
  })

  useEffect(() => {
    window.localStorage.setItem(DASHBOARD_TARGETS_STORAGE_KEY, JSON.stringify(targets))
  }, [targets])

  const totalRevenue = invoices.reduce((sum, invoice) => sum + invoice.total, 0)
  const collected = invoices.reduce((sum, invoice) => sum + invoice.paid, 0)
  const outstanding = totalRevenue - collected
  const overdueCount = invoices.filter((invoice) => invoice.status === 'Pending').length
  const recentInvoices = useMemo(() => [...invoices].sort((a, b) => b.id.localeCompare(a.id)).slice(0, 6), [invoices])

  const targetSummary = useMemo(() => {
    const openTargets = targets.filter((target) => !target.completed)
    const completedTargets = targets.filter((target) => target.completed)
    const nearestDeadline = openTargets
      .filter((target) => target.deadline)
      .sort((left, right) => String(left.deadline).localeCompare(String(right.deadline)))[0] ?? null

    return {
      openCount: openTargets.length,
      completedCount: completedTargets.length,
      nearestDeadline,
    }
  }, [targets])

  const cols = [
    { key: 'id', label: 'Invoice', mono: true, render: (value) => <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-40)' }}>{value}</span> },
    { key: 'party', label: 'Party', render: (value) => <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Avatar name={value} size={26} /><span style={{ fontWeight: 500 }}>{value}</span></div> },
    { key: 'date', label: 'Date', dim: true },
    { key: 'total', label: 'Amount', right: true, render: (value) => <span style={{ fontWeight: 600 }}>{fmt(value)}</span> },
    { key: 'status', label: 'Status', render: (value) => <Badge status={value} /> },
  ]

  const saveTarget = (payload) => {
    const nextTarget = normalizeTarget(payload)
    setTargets((current) => {
      const exists = current.some((target) => target.id === nextTarget.id)
      return exists
        ? current.map((target) => (target.id === nextTarget.id ? nextTarget : target))
        : [nextTarget, ...current]
    })
    setTargetEditor(null)
  }

  const deleteTarget = (targetId) => {
    setTargets((current) => current.filter((target) => target.id !== targetId))
    setTargetEditor((current) => (current?.id === targetId ? null : current))
  }

  const toggleTargetCompleted = (targetId) => {
    setTargets((current) => current.map((target) => (
      target.id === targetId
        ? { ...target, completed: !target.completed }
        : target
    )))
    setTargetEditor((current) => current?.id === targetId ? { ...current, completed: !current.completed } : current)
  }

  return (
    <div className="animate-slide">
      {viewInvoice && <InvoiceView invoice={viewInvoice} onClose={() => setViewInvoice(null)} />}

      <PageHeader title="Dashboard" sub={`FY ${BUSINESS.fy} | ${BUSINESS.name}`} />

      <div className="kpi-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 22 }}>
        <KpiCard label="Total Revenue" value={fmtShort(totalRevenue)} sub={`${invoices.length} invoices`} />
        <KpiCard label="Collected" value={fmtShort(collected)} sub="This period" trend="+8.2% vs last month" trendUp />
        <KpiCard label="Outstanding" value={fmtShort(outstanding)} sub={`${overdueCount} unpaid invoices`} />
        <KpiCard label="Cash in Hand" value={fmtShort(46250)} sub="Updated now" />
      </div>

      <div className="chart-target-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: 16, marginBottom: 18 }}>
        <Card>
          <CardHead title="Revenue Overview" sub="Monthly trend for current and prior year." />
          <CardBody>
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={REVENUE_DATA} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b5bdb" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#3b5bdb" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#94d82d" stopOpacity={0.14} />
                    <stop offset="95%" stopColor="#94d82d" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--ink-20)', fontFamily: 'var(--font)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--ink-20)', fontFamily: 'var(--font)' }} axisLine={false} tickLine={false} tickFormatter={(value) => `Rs${(value / 1000).toFixed(0)}K`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="prev" name="Last Year" stroke="#94d82d" strokeWidth={1.8} fill="url(#g2)" strokeDasharray="5 3" />
                <Area type="monotone" dataKey="current" name="This Year" stroke="#3b5bdb" strokeWidth={2.5} fill="url(#g1)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        <Card>
          <CardHead
            title="Add Target"
            sub={targetSummary.nearestDeadline ? `Next deadline ${targetSummary.nearestDeadline.deadline}` : 'Track priorities, deadlines and progress.'}
            right={<Button size="sm" variant="primary" data-focus-item="true" data-target-action="create" onClick={() => setTargetEditor(createEmptyTarget())}>+ Add</Button>}
          />
          <CardBody style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <TargetMiniStat label="Open" value={targetSummary.openCount} />
              <TargetMiniStat label="Completed" value={targetSummary.completedCount} />
            </div>

            <div ref={targetFocus.ref} style={{ display: 'grid', gap: 8 }}>
              {targets.length > 0 ? targets.map((target) => {
                const progress = computeTargetProgress(target)
                return (
                  <div
                    key={target.id}
                    data-focus-item="true"
                    data-target-id={target.id}
                    className="focusable-card"
                    role="button"
                    tabIndex={0}
                    onClick={() => setTargetEditor(target)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        setTargetEditor(target)
                      }
                    }}
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--r-md)',
                      padding: '10px 11px',
                      background: target.completed ? '#f6fbf7' : '#fff',
                      display: 'grid',
                      gap: 7,
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)', textDecoration: target.completed ? 'line-through' : 'none' }}>{target.title}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--ink-40)' }}>{target.deadline || 'No deadline'} | {target.priority}</div>
                      </div>
                      <StatusPill label={target.completed ? 'Done' : target.priority} tone={target.completed ? 'done' : target.priority.toLowerCase()} />
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11.5, color: 'var(--ink-40)', marginBottom: 4 }}>
                        <span>{fmt(target.currentValue)} of {fmt(target.targetValue)}</span>
                        <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{progress}%</span>
                      </div>
                      <div style={{ height: 6, borderRadius: 999, background: 'var(--surface-3)', overflow: 'hidden' }}>
                        <div style={{ width: `${progress}%`, height: '100%', background: target.completed ? '#1a6b3c' : '#111827', borderRadius: 999, transition: 'width .16s ease' }} />
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-40)', minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {target.notes || 'Enter opens target editor'}
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Button
                          size="sm"
                          variant="ghost"
                          tabIndex={-1}
                          onClick={(event) => {
                            event.stopPropagation()
                            toggleTargetCompleted(target.id)
                          }}
                        >
                          {target.completed ? 'Reopen' : 'Done'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          tabIndex={-1}
                          onClick={(event) => {
                            event.stopPropagation()
                            setTargetEditor(target)
                          }}
                        >
                          Edit
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              }) : (
                <div style={{ border: '1px dashed var(--border-2)', borderRadius: 'var(--r-md)', padding: '18px 14px', textAlign: 'center', color: 'var(--ink-40)', fontSize: 12 }}>
                  Targets will appear here. Use <strong style={{ color: 'var(--ink)' }}>Add</strong> to create your first dashboard goal.
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHead title="Recent Invoices" sub="Latest transactions across all parties." />
        <Table focusId="dashboard-recent-invoices" cols={cols} rows={recentInvoices} onRowClick={setViewInvoice} />
      </Card>

      <TargetEditorModal
        value={targetEditor}
        onClose={() => setTargetEditor(null)}
        onDelete={deleteTarget}
        onSave={saveTarget}
      />
    </div>
  )
}

function TargetEditorModal({ value, onClose, onDelete, onSave }) {
  if (!value) return null

  return (
    <Modal
      open={Boolean(value)}
      onClose={onClose}
      title={value.id ? 'Edit Target' : 'Add Target'}
      width={560}
    >
      <TargetEditorForm initialValue={value} onClose={onClose} onDelete={onDelete} onSave={onSave} />
    </Modal>
  )
}

function TargetEditorForm({ initialValue, onClose, onDelete, onSave }) {
  const [form, setForm] = useState({
    ...initialValue,
    targetValue: String(initialValue.targetValue ?? 0),
    currentValue: String(initialValue.currentValue ?? 0),
  })

  const progress = computeTargetProgress({
    ...form,
    targetValue: Number(form.targetValue),
    currentValue: Number(form.currentValue),
  })

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <Input label="Target Name" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Monthly sales collection" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Input label="Target Value" type="number" value={form.targetValue} onChange={(event) => setForm((current) => ({ ...current, targetValue: event.target.value }))} />
        <Input label="Current Progress" type="number" value={form.currentValue} onChange={(event) => setForm((current) => ({ ...current, currentValue: event.target.value }))} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Input label="Deadline" type="date" value={form.deadline} onChange={(event) => setForm((current) => ({ ...current, deadline: event.target.value }))} />
        <Select label="Priority" value={form.priority} onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))} options={TARGET_PRIORITY_OPTIONS} />
      </div>
      <Select label="Status" value={form.completed ? 'Completed' : 'Open'} onChange={(event) => setForm((current) => ({ ...current, completed: event.target.value === 'Completed' }))} options={['Open', 'Completed']} />
      <Textarea label="Notes" rows={3} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Next follow-up or target details" />

      <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', background: 'var(--surface-2)', padding: '10px 12px', display: 'grid', gap: 5 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12 }}>
          <span style={{ color: 'var(--ink-40)' }}>Progress</span>
          <strong>{progress}%</strong>
        </div>
        <div style={{ height: 7, borderRadius: 999, background: '#e9e9e9', overflow: 'hidden' }}>
          <div style={{ width: `${progress}%`, height: '100%', background: '#111827', borderRadius: 999 }} />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
        <div>
          {initialValue.id && (
            <Button variant="danger" onClick={() => onDelete(initialValue.id)}>
              Delete Target
            </Button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={() => onSave({
              ...form,
              targetValue: Number(form.targetValue) || 0,
              currentValue: Number(form.currentValue) || 0,
            })}
            disabled={!String(form.title || '').trim()}
          >
            Save Target
          </Button>
        </div>
      </div>
    </div>
  )
}

function TargetMiniStat({ label, value }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', background: 'var(--surface-2)', padding: '10px 11px' }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-40)', marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-.04em', color: 'var(--ink)' }}>{value}</div>
    </div>
  )
}

function StatusPill({ label, tone }) {
  const palette = {
    done: { background: '#edf8f0', color: '#1a6b3c', border: '#cae8d2' },
    high: { background: '#fff1f1', color: '#b91c1c', border: '#fecaca' },
    medium: { background: '#fffbeb', color: '#92400e', border: '#fde68a' },
    low: { background: '#eef6ff', color: '#1d4ed8', border: '#bfdbfe' },
  }[tone] ?? { background: 'var(--surface-2)', color: 'var(--ink-60)', border: 'var(--border)' }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 7px', borderRadius: 999, border: `1px solid ${palette.border}`, background: palette.background, color: palette.color, fontSize: 10.5, fontWeight: 700, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  )
}

function computeTargetProgress(target) {
  const goal = Number(target.targetValue) || 0
  const current = Number(target.currentValue) || 0
  if (goal <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((current / goal) * 100)))
}

function createEmptyTarget() {
  return {
    id: '',
    title: '',
    targetValue: 0,
    currentValue: 0,
    deadline: todayISO(),
    priority: 'Medium',
    completed: false,
    notes: '',
  }
}

function normalizeTarget(target) {
  return {
    id: target.id || `target-${Date.now()}`,
    title: String(target.title || '').trim(),
    targetValue: Number(target.targetValue) || 0,
    currentValue: Number(target.currentValue) || 0,
    deadline: target.deadline || todayISO(),
    priority: TARGET_PRIORITY_OPTIONS.includes(target.priority) ? target.priority : 'Medium',
    completed: Boolean(target.completed),
    notes: String(target.notes || '').trim(),
  }
}

function loadTargets() {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(DASHBOARD_TARGETS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.map(normalizeTarget)
  }
  catch {
    return []
  }
}
