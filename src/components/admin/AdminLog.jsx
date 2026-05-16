import { useState, useEffect } from 'react'
import { auditService } from '../../services/auditService'
import { transactionService } from '../../services/transactionService'
import { debtorService } from '../../services/debtorService'
import { useFirestoreSubscription } from '../../hooks/useFirestore'
import { fmt } from '../../utils/formatters'
import { AGING_BUCKETS, computeAgingForDebtor } from '../../utils/agingUtils'
import { PageLoader } from '../common/LoadingSpinner'
import FirestoreRulesAlert from '../common/FirestoreRulesAlert'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../services/firebase'

/* ── User Management ─────────────────────────────────────────────── */
function UserManagement() {
  const [users,   setUsers]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDocs(collection(db, 'users'))
      .then((snap) => setUsers(snap.docs.map((d) => ({ ...d.data(), id: d.id }))))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="py-6 flex justify-center"><div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" /></div>

  return (
    <div className="space-y-4">
      <div className="card-blue text-xs text-ink-3">
        To promote/demote users between Super Admin and User roles, click the avatar icon in the top-right header to open the Account Panel → Users tab.
      </div>
      {users.length > 0 ? (
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="card flex items-center justify-between">
              <div><p className="text-ink font-semibold text-sm">{u.displayName || u.email}</p><p className="text-ink-3 text-xs">{u.email}</p></div>
              <span className={`badge ${u.superAdmin ? 'badge-blue' : 'badge-gray'}`}>{u.superAdmin ? '★ Super Admin' : 'User'}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-8 border-dashed"><p className="text-ink-3 text-sm">No users found.</p></div>
      )}
    </div>
  )
}

/* ── Financial Year Report ───────────────────────────────────────── */
function getFYOptions() {
  const now = new Date()
  const curFYStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
  const opts = []
  for (let y = curFYStart; y >= curFYStart - 2; y--) {
    opts.push({ label: `FY ${y}–${String(y + 1).slice(2)}`, value: y })
  }
  return opts
}

function FinancialYearReport() {
  const fyOpts = getFYOptions()
  const [fy,       setFy]       = useState(fyOpts[0].value)
  const [txns,     setTxns]     = useState(null)   // null = not loaded
  const [debtors,  setDebtors]  = useState([])
  const [ledgers,  setLedgers]  = useState({})
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)

  const loadReport = async (fyYear) => {
    setLoading(true); setError(null); setTxns(null)
    try {
      const [txnList, debtorList] = await Promise.all([
        transactionService.getForFY(fyYear),
        debtorService.getAll(),
      ])
      setTxns(txnList)
      setDebtors(debtorList)

      // Fetch ledgers for debtors with outstanding balance
      const activeDebtors = debtorList.filter((d) => (d.currentBalance || 0) > 0)
      const ledgerMap = {}
      await Promise.all(activeDebtors.map(async (d) => {
        try {
          ledgerMap[d.id] = await debtorService.getLedger(d.id)
        } catch { ledgerMap[d.id] = [] }
      }))
      setLedgers(ledgerMap)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadReport(fy) }, [fy])

  // ── Sales stats ──────────────────────────────────────────────────
  const validTxns = (txns || []).filter((t) => t.status !== 'voided')
  const cashTotal   = validTxns.filter((t) => t.saleType === 'cash').reduce((s, t) => s + (t.totalAmount || 0), 0)
  const creditTotal = validTxns.filter((t) => t.saleType === 'credit').reduce((s, t) => s + (t.totalAmount || 0), 0)
  const giftTotal   = validTxns.filter((t) => t.saleType === 'gift').reduce((s, t) => s + (t.totalAmount || 0), 0)
  const grandTotal  = cashTotal + creditTotal + giftTotal
  const cashCount   = validTxns.filter((t) => t.saleType === 'cash').length
  const creditCount = validTxns.filter((t) => t.saleType === 'credit').length
  const giftCount   = validTxns.filter((t) => t.saleType === 'gift').length
  const voidedCount = (txns || []).filter((t) => t.status === 'voided').length

  // ── Aging stats ──────────────────────────────────────────────────
  const agingTotals = {}
  AGING_BUCKETS.forEach((b) => { agingTotals[b.key] = { amount: 0, count: 0 } })
  let totalOutstanding = 0
  debtors.filter((d) => (d.currentBalance || 0) > 0).forEach((d) => {
    const entries = ledgers[d.id] || []
    const { buckets } = computeAgingForDebtor(entries)
    totalOutstanding += (d.currentBalance || 0)
    AGING_BUCKETS.forEach((b) => {
      if (buckets[b.key] > 0) {
        agingTotals[b.key].amount += buckets[b.key]
        agingTotals[b.key].count  += 1
      }
    })
  })

  return (
    <div className="space-y-6">
      {/* FY Selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-ink-3 text-sm font-medium">Financial Year:</span>
        <div className="flex gap-2">
          {fyOpts.map((o) => (
            <button key={o.value} onClick={() => setFy(o.value)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold border transition-all
                ${fy === o.value ? 'bg-primary text-white border-primary' : 'bg-white border-border-lt text-ink-3 hover:border-primary'}`}>
              {o.label}
            </button>
          ))}
        </div>
        {loading && <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />}
      </div>

      {error && <div className="card border-red-200 bg-danger-lt text-danger text-sm p-3">{error}</div>}

      {txns !== null && !loading && (
        <>
          {/* ── Sales Summary ── */}
          <section>
            <h3 className="font-body font-bold text-ink text-sm mb-3 flex items-center gap-2">💵 Sales Summary — {fyOpts.find(o => o.value === fy)?.label}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              <div className="card bg-success-lt border-green-200 text-center">
                <p className="text-ink-3 text-xs font-medium">Cash Sales</p>
                <p className="font-bold text-success text-xl">{fmt.currency(cashTotal)}</p>
                <p className="text-ink-4 text-xs">{cashCount} transactions</p>
              </div>
              <div className="card bg-primary-lt border-border-blue text-center">
                <p className="text-ink-3 text-xs font-medium">Credit Sales</p>
                <p className="font-bold text-primary text-xl">{fmt.currency(creditTotal)}</p>
                <p className="text-ink-4 text-xs">{creditCount} transactions</p>
              </div>
              <div className="card bg-warning-lt border-amber-200 text-center">
                <p className="text-ink-3 text-xs font-medium">Gift / Prasad</p>
                <p className="font-bold text-warning text-xl">{fmt.currency(giftTotal)}</p>
                <p className="text-ink-4 text-xs">{giftCount} transactions</p>
              </div>
              <div className="card text-center">
                <p className="text-ink-3 text-xs font-medium">Total Revenue</p>
                <p className="font-bold text-ink text-xl">{fmt.currency(grandTotal)}</p>
                <p className="text-ink-4 text-xs">{voidedCount} voided</p>
              </div>
            </div>

            {/* Month-wise breakdown */}
            {validTxns.length > 0 && (() => {
              const byMonth = {}
              validTxns.forEach((t) => {
                const d = t.date?.toDate?.()
                if (!d) return
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}`
                const label = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
                if (!byMonth[key]) byMonth[key] = { label, cash: 0, credit: 0, gift: 0 }
                byMonth[key][t.saleType] = (byMonth[key][t.saleType] || 0) + (t.totalAmount || 0)
              })
              const months = Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b))
              return (
                <div className="card overflow-hidden p-0">
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-border-lt">
                    <h4 className="text-xs font-semibold text-ink-3 uppercase tracking-wide">Month-wise Breakdown</h4>
                  </div>
                  <div className="hidden sm:grid grid-cols-5 gap-3 px-4 py-2 text-xs font-semibold text-ink-3 uppercase border-b border-border-lt">
                    <span>Month</span><span className="text-right">Cash</span><span className="text-right">Credit</span><span className="text-right">Gift</span><span className="text-right">Total</span>
                  </div>
                  {months.map(([key, m]) => (
                    <div key={key} className="grid grid-cols-2 sm:grid-cols-5 gap-3 px-4 py-2.5 border-b border-border-lt last:border-0 hover:bg-slate-50 text-sm">
                      <span className="font-semibold text-ink">{m.label}</span>
                      <span className="sm:text-right text-success">{fmt.currency(m.cash)}</span>
                      <span className="sm:text-right text-primary">{fmt.currency(m.credit)}</span>
                      <span className="sm:text-right text-warning">{fmt.currency(m.gift)}</span>
                      <span className="sm:text-right font-bold text-ink">{fmt.currency(m.cash + m.credit + m.gift)}</span>
                    </div>
                  ))}
                </div>
              )
            })()}

            {validTxns.length === 0 && (
              <div className="card text-center py-10 border-dashed">
                <p className="text-3xl mb-2">📊</p>
                <p className="text-ink-3 text-sm">No sales recorded in this financial year.</p>
              </div>
            )}
          </section>

          {/* ── Outstanding & Aging ── */}
          <section>
            <h3 className="font-body font-bold text-ink text-sm mb-3 flex items-center gap-2">📋 Outstanding & Aging Report (Current)</h3>
            <div className="card bg-danger-lt border-red-200 mb-3 text-center py-3">
              <p className="text-ink-3 text-xs font-medium">Total Outstanding (All Debtors)</p>
              <p className="font-bold text-danger text-2xl">{fmt.currency(totalOutstanding)}</p>
              <p className="text-ink-4 text-xs">{debtors.filter(d => (d.currentBalance||0) > 0).length} active debtors</p>
            </div>

            <div className="card overflow-hidden p-0">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-border-lt">
                <h4 className="text-xs font-semibold text-ink-3 uppercase tracking-wide">Aging Buckets</h4>
              </div>
              <div className="hidden sm:grid grid-cols-4 gap-3 px-4 py-2 text-xs font-semibold text-ink-3 uppercase border-b border-border-lt">
                <span>Age Bucket</span><span className="text-right">Debtors</span><span className="text-right">Amount</span><span className="text-right">% of Total</span>
              </div>
              {AGING_BUCKETS.map((b) => {
                const data = agingTotals[b.key]
                const pct = totalOutstanding > 0 ? Math.round((data.amount / totalOutstanding) * 100) : 0
                return (
                  <div key={b.key} className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-4 py-3 border-b border-border-lt last:border-0 hover:bg-slate-50">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: b.color }} />
                      <span className="text-ink font-medium text-sm">{b.label}</span>
                    </div>
                    <span className={`sm:text-right font-semibold text-sm ${b.textColor}`}>{data.count} debtors</span>
                    <span className={`sm:text-right font-bold text-sm ${b.textColor}`}>{fmt.currency(data.amount)}</span>
                    <div className="sm:text-right">
                      <span className="text-ink-3 text-xs">{pct}%</span>
                      <div className="h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: b.color }} />
                      </div>
                    </div>
                  </div>
                )
              })}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-4 py-3 bg-slate-50 border-t-2 border-border-lt">
                <span className="font-bold text-ink text-sm">Total</span>
                <span className="sm:text-right font-bold text-ink text-sm">{debtors.filter(d => (d.currentBalance||0) > 0).length}</span>
                <span className="sm:text-right font-bold text-danger text-sm">{fmt.currency(totalOutstanding)}</span>
                <span className="sm:text-right text-ink-4 text-xs">100%</span>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  )
}

/* ── Audit Log ───────────────────────────────────────────────────── */
const ACTION_COLORS = {
  VOID_TRANSACTION: 'badge-red', STOCK_ADJUST: 'badge-amber',
  PRICE_CHANGE: 'badge-blue', BLOCK_DEBTOR: 'bg-orange-100 text-orange-700',
  DELETE_TRANSACTION: 'badge-red',
}

export default function AdminLog() {
  const [view,   setView]   = useState('reports')
  const [filter, setFilter] = useState('all')

  const { data: auditLogs, loading, error } = useFirestoreSubscription(
    (cb, e) => auditService.subscribe(cb, e)
  )

  if (loading) return <PageLoader />

  const ACTION_TYPES = ['all', 'VOID_TRANSACTION', 'STOCK_ADJUST', 'PRICE_CHANGE', 'BLOCK_DEBTOR']
  const filtered = auditLogs.filter((l) => filter === 'all' || l.actionType === filter)

  const VIEWS = [
    { id: 'reports', l: '📊 Reports'   },
    { id: 'audit',   l: '🔍 Audit Log' },
    { id: 'users',   l: '👥 Users'     },
  ]

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-4">
      <FirestoreRulesAlert error={error} />

      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="page-title">Admin Controls</h2>
        <div className="flex gap-2">
          {VIEWS.map(({ id, l }) => (
            <button key={id} onClick={() => setView(id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
                ${view === id ? 'bg-primary text-white border-primary' : 'bg-white border-border-lt text-ink-3'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {view === 'users'   && <UserManagement />}
      {view === 'reports' && <FinancialYearReport />}
      {view === 'audit'   && (
        <>
          <div className="flex gap-2 flex-wrap">
            {ACTION_TYPES.map((t) => (
              <button key={t} onClick={() => setFilter(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
                  ${filter === t ? 'bg-primary text-white border-primary' : 'bg-white border-border-lt text-ink-3'}`}>
                {t === 'all' ? 'All Actions' : t.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
          {filtered.length === 0 ? (
            <div className="card text-center py-10 border-dashed"><p className="text-ink-3">No admin actions logged</p></div>
          ) : (
            <div className="space-y-2">
              {filtered.map((log) => {
                let after = {}
                try { after = JSON.parse(log.after || '{}') } catch {}
                return (
                  <div key={log.id} className="card hover:shadow-card-hover transition-shadow">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className={`badge text-xs ${ACTION_COLORS[log.actionType] || 'badge-gray'}`}>
                        {log.actionType?.replace(/_/g, ' ')}
                      </span>
                      <span className="text-ink-4 text-xs">{fmt.dateTime(log.timestamp)}</span>
                    </div>
                    <p className="text-ink-2 text-xs mt-1.5">Entity: <span className="font-mono text-ink-3">{log.entityId}</span></p>
                    <p className="text-ink-3 text-xs">Admin: <span className="font-mono">{log.adminUid?.slice(0, 12)}…</span></p>
                    {after.voidReason && <p className="text-danger text-xs mt-1 italic">Reason: "{after.voidReason}"</p>}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
