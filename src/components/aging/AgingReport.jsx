import { useState, useEffect } from 'react'
import { debtorService } from '../../services/debtorService'
import { fmt } from '../../utils/formatters'
import { computeAgingReport, AGING_BUCKETS } from '../../utils/agingUtils'
import { exportAgingToPDF, exportToCSV } from '../../utils/exportUtils'
import { PageLoader } from '../common/LoadingSpinner'

const BUCKET_COLORS = {
  current:     { card: 'border-green-200 bg-success-lt',  text: 'text-success',  badge: 'badge-green' },
  days30_60:   { card: 'border-amber-200 bg-warning-lt',  text: 'text-warning',  badge: 'badge-amber' },
  days60_90:   { card: 'border-orange-200 bg-orange-50',  text: 'text-orange-600',badge: 'bg-orange-100 text-orange-600' },
  days90_120:  { card: 'border-red-200 bg-danger-lt',     text: 'text-danger',   badge: 'badge-red' },
  days120plus: { card: 'border-red-300 bg-red-50',        text: 'text-red-700',  badge: 'bg-red-100 text-red-700' },
}

export default function AgingReport() {
  const [debtors,      setDebtors]      = useState([])
  const [ledgerMap,    setLedgerMap]    = useState({})
  const [loading,      setLoading]      = useState(true)
  const [loadingLdgr,  setLoadingLdgr]  = useState(false)
  const [search,       setSearch]       = useState('')
  const [bucketFilter, setBucketFilter] = useState('all')

  useEffect(() => {
    const unsub = debtorService.subscribe(async (all) => {
      setDebtors(all); setLoading(false); setLoadingLdgr(true)
      const map = {}
      await Promise.all(all.map(async (d) => {
        if ((d.currentBalance || 0) > 0) map[d.id] = await debtorService.getLedger(d.id)
      }))
      setLedgerMap(map); setLoadingLdgr(false)
    })
    return unsub
  }, [])

  if (loading) return <PageLoader />

  const { report, totals, totalOutstanding } = computeAgingReport(debtors, ledgerMap)

  const filtered = report.filter((r) => {
    const matchSearch = !search || r.debtor.name.toLowerCase().includes(search.toLowerCase())
    const matchBucket = bucketFilter === 'all' || (r.buckets[bucketFilter] || 0) > 0
    return matchSearch && matchBucket
  })

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="page-title">Aging Analysis</h2>
        <div className="flex gap-2">
          <button onClick={() => exportToCSV(report.map((r) => ({ Name: r.debtor.name, Phone: r.debtor.phone, Total: r.balance, ...r.buckets })), 'aging')} className="btn-secondary text-xs px-3">↓ CSV</button>
          <button onClick={() => exportAgingToPDF(report, totals, totalOutstanding)} className="btn-primary text-xs px-3">↓ PDF Report</button>
        </div>
      </div>

      {/* Bucket summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {AGING_BUCKETS.map((b) => {
          const clr = BUCKET_COLORS[b.key]
          return (
            <div key={b.key}
              onClick={() => setBucketFilter(bucketFilter === b.key ? 'all' : b.key)}
              className={`card cursor-pointer transition-all hover:shadow-card-hover text-center
                ${bucketFilter === b.key ? 'ring-2 ring-primary ring-offset-1' : ''}
                ${clr.card}`}>
              <p className="text-ink-3 text-xs font-body mb-1 font-medium">{b.label}</p>
              <p className={`font-body font-bold text-base ${clr.text}`}>
                {fmt.currency(totals[b.key] || 0)}
              </p>
            </div>
          )
        })}
      </div>

      {/* Total */}
      <div className="card border-border-blue bg-primary-lt flex items-center justify-between">
        <div>
          <p className="text-ink-3 text-xs font-body font-medium">Total Outstanding</p>
          <p className="font-body font-bold text-danger text-2xl">{fmt.currency(totalOutstanding)}</p>
        </div>
        <div className="text-right">
          <p className="text-ink-3 text-xs font-body font-medium">Active Debtors</p>
          <p className="font-body font-bold text-primary text-2xl">{report.length}</p>
        </div>
      </div>

      {loadingLdgr && (
        <p className="text-ink-3 text-xs font-body text-center animate-pulse py-2">Loading ledger data…</p>
      )}

      {/* Search + bucket filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4">🔍</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-9" placeholder="Search debtor…" />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setBucketFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-body font-medium border transition-all
              ${bucketFilter === 'all' ? 'bg-primary text-white border-primary' : 'bg-white border-border-lt text-ink-3'}`}>
            All
          </button>
          {AGING_BUCKETS.slice(3).map((b) => (
            <button key={b.key} onClick={() => setBucketFilter(bucketFilter === b.key ? 'all' : b.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-body font-medium border transition-all
                ${bucketFilter === b.key ? 'bg-danger text-white border-danger' : 'bg-white border-border-lt text-ink-3'}`}>
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {/* Debtor list */}
      {filtered.length === 0 ? (
        <div className="card text-center py-14 border-dashed">
          <p className="text-4xl mb-3">✅</p>
          <p className="text-ink-3 font-body">No outstanding debtors matching filter. 🙏</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.sort((a, b) => b.balance - a.balance).map(({ debtor, buckets, bills, balance }) => (
            <div key={debtor.id} className="card hover:shadow-card-hover transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-ink font-body font-semibold">{debtor.name}</p>
                  <p className="text-ink-3 text-xs">{fmt.phone(debtor.phone)}</p>
                </div>
                <p className="font-body font-bold text-danger text-lg shrink-0">{fmt.currency(balance)}</p>
              </div>

              {/* Aging breakdown bar */}
              <div className="grid grid-cols-5 gap-1.5 mt-3 pt-2.5 border-t border-border-lt">
                {AGING_BUCKETS.map((b) => {
                  const clr = BUCKET_COLORS[b.key]
                  return (
                    <div key={b.key} className="text-center">
                      <p className="text-ink-4 text-xs leading-tight">{b.label}</p>
                      <p className={`font-body font-semibold text-xs mt-0.5 ${buckets[b.key] > 0 ? clr.text : 'text-ink-4 opacity-30'}`}>
                        {buckets[b.key] > 0 ? fmt.currency(buckets[b.key]) : '—'}
                      </p>
                    </div>
                  )
                })}
              </div>

              {/* Overdue bill detail */}
              {bills.filter((b) => b.outstanding > 0 && b.days > 60).length > 0 && (
                <div className="mt-2 pt-2 border-t border-red-200 bg-danger-lt/50 rounded-b-xl -mx-4 -mb-4 px-4 pb-3">
                  <p className="text-danger text-xs font-semibold mb-1">Overdue Bills:</p>
                  {bills.filter((b) => b.outstanding > 0 && b.days > 60).map((bill, i) => (
                    <div key={i} className="flex items-center justify-between text-xs font-body">
                      <span className="text-ink-3">{fmt.date({ toDate: () => bill.date })}</span>
                      <span className="text-danger font-medium">{fmt.currency(bill.outstanding)} — {bill.days}d</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
