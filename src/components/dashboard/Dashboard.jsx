import { useAuth } from '../../context/AuthContext'
import { useApp } from '../../context/AppContext'
import { inventoryService } from '../../services/inventoryService'
import { debtorService } from '../../services/debtorService'
import { transactionService } from '../../services/transactionService'
import { useFirestoreSubscription } from '../../hooks/useFirestore'
import { fmt } from '../../utils/formatters'
import { PageLoader } from '../common/LoadingSpinner'
import FirestoreRulesAlert from '../common/FirestoreRulesAlert'

function KPICard({ label, value, sub, valueColor = 'text-ink', icon, onClick, accent }) {
  return (
    <div onClick={onClick}
      className={`card transition-all
        ${onClick ? 'cursor-pointer hover:shadow-card-hover hover:border-border-blue' : ''}
        ${accent === 'blue'  ? 'border-border-blue bg-primary-lt' : ''}
        ${accent === 'red'   ? 'border-red-200 bg-danger-lt' : ''}
        ${accent === 'green' ? 'border-green-200 bg-success-lt' : ''}
        ${accent === 'amber' ? 'border-amber-200 bg-warning-lt' : ''}
      `}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-ink-3 text-xs font-body mb-1 font-medium">{label}</p>
          <p className={`font-body font-bold text-xl leading-tight ${valueColor}`}>{value}</p>
          {sub && <p className="text-ink-4 text-xs mt-1">{sub}</p>}
        </div>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0
          ${accent === 'blue'  ? 'bg-primary/15' : ''}
          ${accent === 'red'   ? 'bg-danger/15'  : ''}
          ${accent === 'green' ? 'bg-success/15' : ''}
          ${accent === 'amber' ? 'bg-warning/15' : ''}
          ${!accent ? 'bg-slate-100' : ''}
        `}>{icon}</div>
      </div>
    </div>
  )
}

function ActivityItem({ txn }) {
  const type = txn.saleType
  const colors  = { cash: 'text-success', credit: 'text-primary', gift: 'text-warning' }
  const bgIcons = { cash: 'bg-success-lt', credit: 'bg-primary-lt', gift: 'bg-warning-lt' }
  const icons   = { cash: '💵', credit: '📋', gift: '🎁' }
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border-lt last:border-0">
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0 ${bgIcons[type] || 'bg-slate-100'}`}>
        {icons[type] || '💳'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-ink text-xs font-body font-medium truncate">
          {txn.items?.map((i) => `${i.name} ×${i.qty}`).join(', ') || 'Transaction'}
        </p>
        <p className="text-ink-4 text-xs">{fmt.shortDate(txn.date)}</p>
      </div>
      <div className="text-right shrink-0">
        <p className={`font-body text-sm font-bold ${colors[type] || 'text-ink'}`}>{fmt.currency(txn.totalAmount)}</p>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { isSuperAdmin } = useAuth()
  const { setActiveTab } = useApp()

  const { data: inventory, loading: l1 }   = useFirestoreSubscription((cb, e) => inventoryService.subscribe(cb, e))
  const { data: debtors,   loading: l2 }   = useFirestoreSubscription((cb, e) => debtorService.subscribe(cb, e))
  const { data: txns,      loading: l3, error } = useFirestoreSubscription((cb, e) => transactionService.subscribe(cb, e))

  const loading = l1 || l2 || l3
  if (loading) return <PageLoader />

  const active   = inventory.filter((i) => i.status === 'active')
  const lowStock = active.filter((i) => i.qty > 0 && i.qty <= (i.lowStockThreshold || 5))
  const outStock = active.filter((i) => i.qty === 0)
  const mrpValue  = active.reduce((s, i) => s + i.qty * (i.sellingPrice || 0), 0)
  const costValue = active.reduce((s, i) => s + i.qty * (i.costPrice  || 0), 0)

  const activeDebtors   = debtors.filter((d) => d.status === 'active' || d.status === 'credit')
  const totalOutstanding = debtors.reduce((s, d) => s + Math.max(0, d.currentBalance || 0), 0)

  const recentTxns = txns.slice(0, 20)
  const today = new Date(); today.setHours(0,0,0,0)
  const salesToday = recentTxns.filter((t) => t.date?.toDate?.()?.getTime?.() >= today.getTime() && t.status !== 'voided').reduce((s, t) => s + (t.totalAmount||0), 0)
  const month = new Date().getMonth()
  const salesMonth = recentTxns.filter((t) => t.date?.toDate?.()?.getMonth?.() === month && t.status !== 'voided').reduce((s, t) => s + (t.totalAmount||0), 0)

  // ── P&L (current month) ────────────────────────────────────────────
  // Revenue: cash + credit sales (not voided, not gift)
  // COGS: cost price × qty for all sold items (uses current inventory cost — approx)
  // Gift expense: cost price × qty for gift transactions (goods given free = expense)
  const inventoryMap = Object.fromEntries(inventory.map(i => [i.id, i]))
  let revenue = 0, cogs = 0, giftExpense = 0, giftUnits = 0

  txns.filter(t => t.status !== 'voided' && t.date?.toDate?.()?.getMonth?.() === month).forEach(t => {
    ;(t.items || []).forEach(item => {
      const cost = (inventoryMap[item.skuId]?.costPrice || 0) * item.qty
      if (t.saleType === 'gift') {
        giftExpense += cost
        giftUnits   += item.qty
      } else {
        revenue += item.lineTotal || (item.unitPrice * item.qty)
        cogs    += cost
      }
    })
  })
  const grossProfit = revenue - cogs
  const netProfit   = grossProfit - giftExpense
  const grossMarginPct = revenue > 0 ? Math.round((grossProfit / revenue) * 100) : 0

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-6">
      <FirestoreRulesAlert error={error} />

      <div>
        <h2 className="font-body text-ink font-bold text-base">Hare Krishna 🙏</h2>
        <p className="text-ink-3 text-xs mt-0.5">
          {new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
        </p>
      </div>

      <section>
        <h3 className="section-title mb-3">Today's Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KPICard label="Sales Today"       value={fmt.currency(salesToday)}       icon="💵" valueColor="text-success" accent="green" />
          <KPICard label="Sales This Month"  value={fmt.currency(salesMonth)}       icon="📈" valueColor="text-primary" accent="blue"  />
          <KPICard label="Active Debtors"    value={activeDebtors.length}           icon="👥" onClick={() => setActiveTab('debtors')} />
          <KPICard label="Total Outstanding" value={fmt.currency(totalOutstanding)} icon="📋" valueColor="text-danger" accent="red" onClick={() => setActiveTab('debtors')} />
        </div>
      </section>

      <section>
        <h3 className="section-title mb-3">Inventory Overview</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KPICard label="Total Stock Units"  value={active.reduce((s,i) => s+i.qty, 0)} icon="📦" />
          <KPICard label="Stock Value (MRP)"  value={fmt.currency(mrpValue)} icon="💰" accent="blue" />
          {isSuperAdmin && <KPICard label="Stock Value (Cost)"  value={fmt.currency(costValue)} icon="🏷️" />}
          {isSuperAdmin && <KPICard label="Gross Margin" value={fmt.currency(mrpValue-costValue)} icon="📊" valueColor="text-success" accent="green" />}
          <KPICard label="Low Stock Items" value={lowStock.length} sub="tap to view" icon="⚠️" valueColor="text-warning" accent="amber" onClick={() => setActiveTab('apparel')} />
          <KPICard label="Out of Stock" value={outStock.length} icon="❌" valueColor="text-danger" accent={outStock.length > 0 ? 'red' : undefined} onClick={() => setActiveTab('apparel')} />
        </div>
      </section>

      {/* ── P&L (Super Admin only — shows cost data) ─────────────── */}
      {isSuperAdmin && (
        <section>
          <h3 className="section-title mb-3">Profit & Loss — This Month</h3>
          <div className="card space-y-4">
            {/* Summary row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl bg-success-lt border border-green-200 p-3 text-center">
                <p className="text-ink-3 text-xs font-medium">Revenue</p>
                <p className="font-bold text-success text-lg">{fmt.currency(revenue)}</p>
                <p className="text-ink-4 text-xs">cash + credit</p>
              </div>
              <div className="rounded-xl bg-danger-lt border border-red-200 p-3 text-center">
                <p className="text-ink-3 text-xs font-medium">Cost of Goods</p>
                <p className="font-bold text-danger text-lg">{fmt.currency(cogs)}</p>
                <p className="text-ink-4 text-xs">approx. at current cost</p>
              </div>
              <div className={`rounded-xl border p-3 text-center ${grossProfit >= 0 ? 'bg-success-lt border-green-200' : 'bg-danger-lt border-red-200'}`}>
                <p className="text-ink-3 text-xs font-medium">Gross Profit</p>
                <p className={`font-bold text-lg ${grossProfit >= 0 ? 'text-success' : 'text-danger'}`}>{fmt.currency(grossProfit)}</p>
                <p className="text-ink-4 text-xs">{grossMarginPct}% margin</p>
              </div>
              <div className={`rounded-xl border p-3 text-center ${netProfit >= 0 ? 'bg-success-lt border-green-200' : 'bg-danger-lt border-red-200'}`}>
                <p className="text-ink-3 text-xs font-medium">Net Profit</p>
                <p className={`font-bold text-lg ${netProfit >= 0 ? 'text-success' : 'text-danger'}`}>{fmt.currency(netProfit)}</p>
                <p className="text-ink-4 text-xs">after gift expense</p>
              </div>
            </div>

            {/* Waterfall breakdown */}
            <div className="space-y-2 border-t border-border-lt pt-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-3 flex items-center gap-2">💵 Revenue (Cash + Credit Sales)</span>
                <span className="font-semibold text-success">+ {fmt.currency(revenue)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-3 flex items-center gap-2">📦 Cost of Goods Sold</span>
                <span className="font-semibold text-danger">− {fmt.currency(cogs)}</span>
              </div>
              <div className="flex items-center justify-between text-sm border-t border-dashed border-border-lt pt-2">
                <span className="text-ink font-semibold">Gross Profit</span>
                <span className={`font-bold ${grossProfit >= 0 ? 'text-success' : 'text-danger'}`}>{fmt.currency(grossProfit)}</span>
              </div>
              {giftExpense > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink-3 flex items-center gap-2">
                    🎁 Gift / Prasad Expense
                    <span className="badge badge-amber text-xs">{giftUnits} units gifted</span>
                  </span>
                  <span className="font-semibold text-warning">− {fmt.currency(giftExpense)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm border-t border-border-lt pt-2">
                <span className="text-ink font-bold">Net Profit</span>
                <span className={`font-bold text-base ${netProfit >= 0 ? 'text-success' : 'text-danger'}`}>{fmt.currency(netProfit)}</span>
              </div>
            </div>

            {cogs === 0 && (
              <p className="text-ink-4 text-xs text-center border-t border-border-lt pt-2">
                ℹ Cost prices not set for all items — add cost prices via Inventory → ✏ to see accurate P&L
              </p>
            )}
          </div>
        </section>
      )}

      <section>
        <h3 className="section-title mb-3">Recent Activity</h3>
        <div className="card">
          {recentTxns.length === 0
            ? <p className="text-ink-3 text-sm font-body text-center py-8">No transactions yet — start by adding inventory and making a sale.</p>
            : recentTxns.slice(0,15).map((txn) => <ActivityItem key={txn.id} txn={txn} />)
          }
        </div>
      </section>
    </div>
  )
}
