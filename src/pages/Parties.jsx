import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { fmt, fmtShort } from '../utils/helpers.js'
import {
  Card,
  CardHead,
  FilterPills,
  KpiCard,
  PageHeader,
  SearchInput,
  Table,
} from '../components/ui/index.js'
import Button from '../components/ui/Button.jsx'
import ErpImportModal from '../components/import/ErpImportModal.jsx'

const PARTY_FILTERS = ['All', 'Customer', 'Supplier', 'Distributor', 'Carrier', 'Agent']

export default function PartiesPage() {
  const navigate = useNavigate()
  const { parties } = useApp()
  const searchRef = useRef(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [importOpen, setImportOpen] = useState(false)

  useEffect(() => {
    const handler = (event) => {
      if (event.ctrlKey && event.key.toLowerCase() === 'f') {
        event.preventDefault()
        searchRef.current?.focus({ preventScroll: true })
      }
      if (event.ctrlKey && event.key.toLowerCase() === 'n') {
        event.preventDefault()
        navigate('/parties/new')
      }
    }

    document.addEventListener('keydown', handler, true)
    return () => document.removeEventListener('keydown', handler, true)
  }, [navigate])

  const filteredParties = parties.filter((party) => {
    const query = search.toLowerCase()
    const matchesQuery = String(party.name || '').toLowerCase().includes(query)
      || String(party.city || '').toLowerCase().includes(query)
    const matchesFilter = filter === 'All' || party.type === filter
    return matchesQuery && matchesFilter
  })

  const totalDR = parties.filter((party) => party.drCr === 'DR').reduce((sum, party) => sum + party.balance, 0)
  const totalCR = parties.filter((party) => party.drCr === 'CR').reduce((sum, party) => sum + party.balance, 0)

  return (
    <div className="animate-slide">
      <ErpImportModal open={importOpen} onClose={() => setImportOpen(false)} defaultKind="parties" />
      <PageHeader
        title="Parties"
        sub="Keyboard-first party directory with full enterprise onboarding."
        right={(
          <>
            <Button variant="ghost" onClick={() => setImportOpen(true)}>Import</Button>
            <Button variant="primary" onClick={() => navigate('/parties/new')}>+ Add Party</Button>
          </>
        )}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 22 }}>
        <KpiCard label="Total Parties" value={parties.length} sub="Active accounts" />
        <KpiCard label="Total Receivable" value={fmtShort(totalDR)} />
        <KpiCard label="Total Payable" value={fmtShort(totalCR)} />
      </div>

      <Card>
        <CardHead
          title="All Parties"
          right={(
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <SearchInput inputRef={searchRef} value={search} onChange={setSearch} placeholder="Search parties..." />
              <FilterPills options={PARTY_FILTERS} value={filter} onChange={setFilter} />
            </div>
          )}
        />
        <Table
          focusId="parties-list"
          cols={[
            { key: 'name', label: 'Party Name' },
            { key: 'type', label: 'Type' },
            { key: 'phone', label: 'Phone', mono: true, dim: true },
            { key: 'city', label: 'City', dim: true },
            { key: 'balance', label: 'Balance', right: true, render: (value, row) => value ? `${fmt(Math.abs(value))} ${row.drCr}` : '-' },
            {
              key: '_edit',
              label: '',
              sortable: false,
              render: (_, row) => (
                <Button
                  size="sm"
                  variant="ghost"
                  tabIndex={-1}
                  onClick={(event) => {
                    event.stopPropagation()
                    navigate('/parties/new', { state: { partyId: row.id } })
                  }}
                >
                  Edit
                </Button>
              ),
            },
          ]}
          rows={filteredParties}
        />
      </Card>
    </div>
  )
}
