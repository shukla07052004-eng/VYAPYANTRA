// ============================================================
// GST Dashboard — Output vs Input, Net Payable, Monthly Chart
// ============================================================
import React, { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { fmtRs, buildMonthlySummary, round2 } from '../../utils/gstEngine.js'
import { GSTCard, GSTCardHead, GSTTableWrapper, S } from './GSTShared.jsx'

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#111', color: '#fff', padding: '10px 14px', borderRadius: 6, fontSize: 12 }}>
      <div style={{ color: '#aaa', marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>{p.name}: {fmtRs(p.value)}</div>
      ))}
    </div>
  )
}

export default function GSTDashboard({ processedSales, itcData, netGST }) {
  const outputCGST = round2(processedSales.filter(i => i.invoiceType !== 'credit_note').reduce((s, i) => s + i.totalCGST, 0))
  const outputSGST = round2(processedSales.filter(i => i.invoiceType !== 'credit_note').reduce((s, i) => s + i.totalSGST, 0))
  const outputIGST = round2(processedSales.filter(i => i.invoiceType !== 'credit_note').reduce((s, i) => s + i.totalIGST, 0))
  const outputTotal = round2(outputCGST + outputSGST + outputIGST)

  const monthly = useMemo(() => buildMonthlySummary(processedSales.filter(i => i.invoiceType === 'sale')), [processedSales])

  const kpis = [
    { label: 'Total Output GST',    value: fmtRs(outputTotal),          color: '#1e40af',   border: '#bfdbfe', sub: `CGST ${fmtRs(outputCGST)} · SGST ${fmtRs(outputSGST)} · IGST ${fmtRs(outputIGST)}` },
    { label: 'Total Input Tax Credit', value: fmtRs(itcData.itcTotal),  color: '#166534',   border: '#c3e6d4', sub: `${itcData.eligibleCount} eligible purchase invoices` },
    { label: 'Net GST Payable',     value: fmtRs(netGST.netTotal),       color: netGST.netTotal > 0 ? '#b91c1c' : '#166534', border: netGST.netTotal > 0 ? '#fecaca' : '#c3e6d4', sub: `CGST ${fmtRs(netGST.netCGST)} · SGST ${fmtRs(netGST.netSGST)} · IGST ${fmtRs(netGST.netIGST)}` },
    { label: 'ITC Utilized',        value: fmtRs(itcData.itcTotal - (itcData.itcTotal - Math.min(itcData.itcTotal, outputTotal))), color: '#92400e', border: '#fde68a', sub: 'Set-off against output liability' },
  ]

  return (
    <div className="animate-slide">
      {/* KPI row */}
      <div className="kpi-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 22 }}>
        {kpis.map(k => <GSTCard key={k.label} {...k} />)}
      </div>

      {/* Charts + breakdown */}
      <div className="two-col-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, marginBottom: 18 }}>

        {/* Monthly bar chart */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <GSTCardHead title="Monthly GST Trend" sub="Output tax collected per month" />
          <div style={{ padding: '16px 18px' }}>
            {monthly.length === 0 ? (
              <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-20)', fontSize: 13 }}>No monthly data</div>
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={monthly} margin={{ top: 5, right: 5, bottom: 0, left: 0 }} barSize={18}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--ink-20)', fontFamily: 'var(--font)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--ink-20)', fontFamily: 'var(--font)' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'var(--font)' }} />
                  <Bar dataKey="cgst" name="CGST" stackId="a" fill="#1e40af" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="sgst" name="SGST" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="igst" name="IGST" stackId="a" fill="#7c3aed" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Tax breakdown panel */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          <GSTCardHead title="Tax Liability Summary" />
          <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'Output CGST',  value: outputCGST, color: '#1e40af', bg: '#eff6ff' },
              { label: 'Output SGST',  value: outputSGST, color: '#1e40af', bg: '#eff6ff' },
              { label: 'Output IGST',  value: outputIGST, color: '#7c3aed', bg: '#f5f3ff' },
              { label: '− ITC (CGST)', value: -itcData.itcCGST, color: '#166534', bg: '#f0faf4' },
              { label: '− ITC (SGST)', value: -itcData.itcSGST, color: '#166534', bg: '#f0faf4' },
              { label: '− ITC (IGST)', value: -itcData.itcIGST, color: '#166534', bg: '#f0faf4' },
            ].map(({ label, value, color, bg }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: bg, borderRadius: 'var(--r-sm)', padding: '9px 12px' }}>
                <span style={{ fontSize: 12.5, color: 'var(--ink-60)' }}>{label}</span>
                <span style={{ fontSize: 13.5, fontWeight: 700, fontFamily: 'var(--mono)', color }}>{fmtRs(Math.abs(value))}</span>
              </div>
            ))}
            <div style={{ borderTop: '2px solid var(--border-2)', paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>Net Payable</span>
              <span style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--mono)', color: netGST.netTotal > 0 ? '#b91c1c' : '#166534' }}>{fmtRs(netGST.netTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly table */}
      {monthly.length > 0 && (
        <GSTTableWrapper>
          <GSTCardHead title="Month-wise GST Summary" />
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Month', 'Invoices', 'Taxable Value', 'CGST', 'SGST', 'IGST', 'Total GST'].map((h, i) => (
                  <th key={h} style={{ ...S.th, textAlign: i >= 2 ? 'right' : 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthly.map((m, idx) => (
                <tr key={m.key} style={{ background: idx % 2 === 0 ? 'transparent' : 'var(--surface-2)' }}>
                  <td style={{ ...S.td, fontWeight: 600 }}>{m.label}</td>
                  <td style={S.td}>{m.count}</td>
                  <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--mono)' }}>{fmtRs(m.taxable)}</td>
                  <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--mono)', color: '#1e40af' }}>{fmtRs(m.cgst)}</td>
                  <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--mono)', color: '#1e40af' }}>{fmtRs(m.sgst)}</td>
                  <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--mono)', color: '#7c3aed' }}>{fmtRs(m.igst)}</td>
                  <td style={{ ...S.td, textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 700 }}>{fmtRs(m.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td style={{ ...S.tfootTd }} colSpan={2}>Total</td>
                <td style={{ ...S.tfootTd, textAlign: 'right', fontFamily: 'var(--mono)' }}>{fmtRs(monthly.reduce((s, m) => s + m.taxable, 0))}</td>
                <td style={{ ...S.tfootTd, textAlign: 'right', fontFamily: 'var(--mono)', color: '#1e40af' }}>{fmtRs(monthly.reduce((s, m) => s + m.cgst, 0))}</td>
                <td style={{ ...S.tfootTd, textAlign: 'right', fontFamily: 'var(--mono)', color: '#1e40af' }}>{fmtRs(monthly.reduce((s, m) => s + m.sgst, 0))}</td>
                <td style={{ ...S.tfootTd, textAlign: 'right', fontFamily: 'var(--mono)', color: '#7c3aed' }}>{fmtRs(monthly.reduce((s, m) => s + m.igst, 0))}</td>
                <td style={{ ...S.tfootTd, textAlign: 'right', fontFamily: 'var(--mono)' }}>{fmtRs(monthly.reduce((s, m) => s + m.total, 0))}</td>
              </tr>
            </tfoot>
          </table>
        </GSTTableWrapper>
      )}
    </div>
  )
}
