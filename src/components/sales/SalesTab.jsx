import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useApp } from '../../context/AppContext'
import { inventoryService } from '../../services/inventoryService'
import { debtorService } from '../../services/debtorService'
import { transactionService } from '../../services/transactionService'
import { useFirestoreSubscription } from '../../hooks/useFirestore'
import { fmt, saleTypeBadge } from '../../utils/formatters'
import AddDebtorModal from '../debtors/AddDebtorModal'
import { lookupDevoteeByPhone } from '../../services/directoryService'
import { computeAgingForDebtor } from '../../utils/agingUtils'
import { PageLoader } from '../common/LoadingSpinner'
import FirestoreRulesAlert from '../common/FirestoreRulesAlert'

/* ─── Basket item row ────────────────────────────────────────────── */
function BasketRow({ entry, items, onUpdate, onRemove }) {
  const item = items.find((i) => i.id === entry.skuId)
  if (!item) return null
  const lineTotal = entry.qty * item.sellingPrice

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border-lt last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-ink font-medium text-sm truncate">{item.name}</p>
        <p className="text-ink-3 text-xs">{item.category} · {fmt.currency(item.sellingPrice)}/unit</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button onClick={() => onUpdate(entry.skuId, entry.qty - 1)} className="w-7 h-7 rounded-lg border border-border-lt text-ink-3 hover:border-primary hover:text-primary transition-all text-sm flex items-center justify-center">−</button>
        <span className="w-8 text-center font-bold text-ink text-sm">{entry.qty}</span>
        <button onClick={() => onUpdate(entry.skuId, entry.qty + 1)} disabled={entry.qty >= item.qty}
          className="w-7 h-7 rounded-lg border border-border-lt text-ink-3 hover:border-primary hover:text-primary transition-all text-sm flex items-center justify-center disabled:opacity-30">+</button>
      </div>
      <p className="font-bold text-primary text-sm w-20 text-right shrink-0">{fmt.currency(lineTotal)}</p>
      <button onClick={() => onRemove(entry.skuId)} className="text-ink-4 hover:text-danger transition-colors text-base shrink-0">✕</button>
    </div>
  )
}

/* ─── Product picker ─────────────────────────────────────────────── */
function ProductPicker({ items, basket, onAdd }) {
  const [search,       setSearch]       = useState('')
  const [variantGroup, setVariantGroup] = useState(null)

  // Show ALL active items (including 0-stock) so user can see what's available
  const active = items.filter((i) => i.status === 'active')
  const filtered = active.filter((i) => {
    if (!search) return true
    const q = search.toLowerCase()
    return i.name.toLowerCase().includes(q) ||
      i.subVariant?.toLowerCase().includes(q) ||
      (i.productGroup || i.category || '').toLowerCase().includes(q)
  })

  // Group by productGroup
  const groupMap = {}
  filtered.forEach((item) => {
    const key = item.productGroup || item.category || item.name
    if (!groupMap[key]) groupMap[key] = []
    groupMap[key].push(item)
  })
  const groups = Object.entries(groupMap).sort(([a], [b]) => a.localeCompare(b))

  const basketQtyForGroup = (grpItems) =>
    grpItems.reduce((s, i) => s + (basket.find((b) => b.skuId === i.id)?.qty || 0), 0)

  const handleGroupClick = (grpName, grpItems) => {
    const available = grpItems.filter(i => i.qty > 0)
    if (available.length === 0) return // all out of stock
    if (available.length === 1 && grpItems.length === 1) {
      onAdd(available[0])
    } else {
      setVariantGroup({ name: grpName, items: grpItems })
    }
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4 text-sm">🔍</span>
        <input value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-9 text-sm" placeholder="Search product…" autoFocus />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
        {groups.length === 0 && <p className="col-span-2 text-ink-3 text-sm text-center py-6">No products found.</p>}
        {groups.map(([grpName, grpItems]) => {
          const hasVariants = grpItems.length > 1
          const firstItem   = grpItems[0]
          const inBasketQty = basketQtyForGroup(grpItems)
          const totalStock  = grpItems.reduce((s, i) => s + i.qty, 0)
          const isOut       = totalStock === 0
          const isLow       = !isOut && totalStock <= (firstItem.lowStockThreshold || 5)
          return (
            <button key={grpName}
              onClick={() => handleGroupClick(grpName, grpItems)}
              disabled={isOut}
              className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all
                ${isOut ? 'border-border-lt bg-slate-50 opacity-60 cursor-not-allowed' :
                  inBasketQty > 0 ? 'border-primary bg-primary-lt' :
                  'border-border-lt bg-white hover:border-primary hover:shadow-sm'}`}>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0
                ${isOut ? 'bg-slate-100' : 'bg-sky-100'}`}>
                {hasVariants ? '📦' : '🏷️'}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-semibold text-xs truncate ${isOut ? 'text-ink-4' : 'text-ink'}`}>{grpName}</p>
                {isOut
                  ? <p className="text-danger text-xs font-medium">Stock Out</p>
                  : hasVariants
                    ? <p className="text-ink-3 text-xs">{grpItems.length} variants · tap to choose</p>
                    : <p className="text-ink-3 text-xs">{fmt.currency(firstItem.sellingPrice)}{firstItem.subVariant ? ` · ${firstItem.subVariant}` : ''}</p>
                }
              </div>
              <div className="text-right shrink-0">
                <span className={`badge text-xs ${isOut ? 'badge-red' : isLow ? 'badge-amber' : 'badge-green'}`}>
                  {totalStock}
                </span>
                {inBasketQty > 0 && <p className="text-primary text-xs font-bold mt-0.5">×{inBasketQty}</p>}
              </div>
            </button>
          )
        })}
      </div>

      {/* Variant chooser — modal overlay so it doesn't shift the grid */}
      {variantGroup && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-ink/40 backdrop-blur-sm"
          onClick={() => setVariantGroup(null)}>
          <div className="bg-white w-full sm:max-w-sm rounded-t-modal sm:rounded-modal shadow-modal p-5 space-y-3 animate-slide-up"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="font-body font-semibold text-ink text-base">Select variant — <span className="text-primary">{variantGroup.name}</span></p>
              <button onClick={() => setVariantGroup(null)} className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-ink-3 text-sm">✕</button>
            </div>
            <div className="space-y-2">
              {variantGroup.items.map((item) => {
                const inB   = basket.find((b) => b.skuId === item.id)
                const isOut = item.qty === 0
                const isLow = !isOut && item.qty <= (item.lowStockThreshold || 5)
                return (
                  <button key={item.id}
                    onClick={() => { if (!isOut) { onAdd(item); setVariantGroup(null) } }}
                    disabled={isOut}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all
                      ${isOut ? 'border-border-lt bg-slate-50 opacity-50 cursor-not-allowed' :
                        inB ? 'border-primary bg-primary-lt' :
                        'border-border-lt bg-white hover:border-primary hover:bg-primary-lt'}`}>
                    <div>
                      <p className={`font-semibold text-sm ${isOut ? 'text-ink-4' : 'text-ink'}`}>{item.subVariant || item.name}</p>
                      <p className="text-ink-3 text-xs">{isOut ? 'Stock Out' : fmt.currency(item.sellingPrice)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`badge text-xs ${isOut ? 'badge-red' : isLow ? 'badge-amber' : 'badge-green'}`}>{item.qty}</span>
                      {inB && <p className="text-primary text-xs font-bold mt-0.5">×{inB.qty} in basket</p>}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

/* ─── Debtor Picker (searchable) ────────────────────────────────── */
function DebtorPicker({ debtors, value, onChange, onAddNew }) {
  const [query,      setQuery]      = useState('')
  const [open,       setOpen]       = useState(false)
  const [dirResult,  setDirResult]  = useState(null)
  const [dirSearching, setDirSearching] = useState(false)

  const selected = debtors.find(d => d.id === value)

  const filtered = query.trim()
    ? debtors.filter(d =>
        d.name.toLowerCase().includes(query.toLowerCase()) ||
        d.phone?.includes(query.replace(/\D/g, ''))
      )
    : debtors

  // Directory lookup if query looks like a phone number
  useEffect(() => {
    const q = query.replace(/\D/g, '')
    if (q.length === 10) {
      setDirSearching(true)
      lookupDevoteeByPhone(q)
        .then(setDirResult).catch(() => setDirResult(null))
        .finally(() => setDirSearching(false))
    } else { setDirResult(null) }
  }, [query])

  const select = (debtor) => { onChange(debtor.id); setQuery(''); setOpen(false) }
  const clear  = () => { onChange(''); setQuery(''); setOpen(false) }

  return (
    <div className="relative">
      {/* Input */}
      <div className={`flex items-center gap-2 input-field cursor-text ${open ? 'ring-2 ring-primary/30 border-primary' : ''}`}
        onClick={() => setOpen(true)}>
        {selected && !open ? (
          <div className="flex items-center justify-between w-full">
            <div>
              <p className="text-ink font-semibold text-sm">{selected.name}</p>
              <p className="text-ink-4 text-xs">{fmt.phone(selected.phone)} · {fmt.currency(selected.currentBalance || 0)} outstanding</p>
            </div>
            <button onClick={(e) => { e.stopPropagation(); clear() }} className="text-ink-4 hover:text-danger text-sm ml-2">✕</button>
          </div>
        ) : (
          <input
            autoFocus={open}
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
            placeholder="Type name or phone to search…"
            className="flex-1 outline-none bg-transparent text-sm text-ink placeholder:text-ink-4"
          />
        )}
        {dirSearching && <div className="w-4 h-4 border border-primary/20 border-t-primary rounded-full animate-spin shrink-0" />}
      </div>

      {/* Dropdown */}
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 w-full mt-1 bg-white border border-border-lt rounded-xl shadow-modal max-h-64 overflow-y-auto">

            {filtered.length === 0 && !dirResult && !dirSearching && (
              <p className="text-ink-3 text-xs text-center py-4">No debtors match "{query}"</p>
            )}

            {filtered.map(d => (
              <button key={d.id} onClick={() => select(d)}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-primary-lt text-left border-b border-border-lt last:border-0">
                <div>
                  <p className="text-ink font-semibold text-sm">{d.name}</p>
                  <p className="text-ink-4 text-xs">{fmt.phone(d.phone)}</p>
                </div>
                <span className={`text-xs font-semibold ${(d.currentBalance||0) > 0 ? 'text-danger' : 'text-ink-3'}`}>
                  {fmt.currency(d.currentBalance || 0)}
                </span>
              </button>
            ))}

            {/* Directory result */}
            {dirResult && !debtors.find(d => d.phone === dirResult.mobile) && (
              <div className="px-4 py-2.5 bg-primary-lt border-t border-border-blue">
                <p className="text-ink-4 text-xs font-medium mb-1">📂 Found in Sakhi Sang Directory</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-primary font-bold text-sm">{dirResult.name}</p>
                    <p className="text-ink-3 text-xs">{fmt.phone(dirResult.mobile)}{dirResult.teamName ? ` · ${dirResult.teamName}` : ''}</p>
                  </div>
                  <button onClick={() => { setOpen(false); onAddNew('directory', dirResult) }}
                    className="btn-primary text-xs px-3 py-1.5 min-h-0 h-7">+ Add</button>
                </div>
              </div>
            )}

            {/* Add new */}
            <button onClick={() => { setOpen(false); onAddNew('manual') }}
              className="w-full text-center px-4 py-2.5 text-primary text-xs font-semibold hover:bg-primary-lt border-t border-border-lt">
              + Add New Debtor{query ? ` "${query}"` : ''}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

/* ─── Main SalesTab ──────────────────────────────────────────────── */
export default function SalesTab() {
  const { user, isSuperAdmin } = useAuth()
  const { showToast } = useApp()

  // Mode: 'history' or 'new'
  const [mode,     setMode]     = useState('history')
  const [basket,   setBasket]   = useState([])
  const [saleType, setSaleType] = useState('cash')
  const [debtorId, setDebtorId] = useState('')
  const [debtors,  setDebtors]  = useState([])
  const [warning,  setWarning]  = useState(null)
  const [notes,    setNotes]    = useState('')
  const [loading,          setLoading]          = useState(false)
  const [histFilter,       setHistFilter]       = useState('all')
  const [showAddDebtor,    setShowAddDebtor]    = useState(false)
  const [addDebtorPrefill, setAddDebtorPrefill] = useState(null)

  // Date range
  const todayStr = () => new Date().toISOString().slice(0, 10)
  const [period,   setPeriod]   = useState('today')
  const [dateFrom, setDateFrom] = useState(todayStr)
  const [dateTo,   setDateTo]   = useState(todayStr)

  const applyPreset = (p) => {
    const now = new Date()
    const today = now.toISOString().slice(0, 10)
    if (p === 'today') {
      setDateFrom(today); setDateTo(today)
    } else if (p === 'week') {
      const d = new Date(now); d.setDate(d.getDate() - d.getDay()) // Sunday
      setDateFrom(d.toISOString().slice(0, 10)); setDateTo(today)
    } else if (p === 'month') {
      setDateFrom(`${today.slice(0,7)}-01`); setDateTo(today)
    }
    setPeriod(p)
  }

  const { data: items,    loading: l1 }       = useFirestoreSubscription((cb,e) => inventoryService.subscribe(cb,e))
  const { data: txns,     loading: l2, error } = useFirestoreSubscription((cb,e) => transactionService.subscribe(cb,e))

  useEffect(() => {
    if (saleType === 'credit') {
      debtorService.getAll().then((list) => setDebtors(list.filter((d) => d.status !== 'blocked' || isSuperAdmin)))
    }
  }, [saleType, isSuperAdmin])

  useEffect(() => {
    if (debtorId && saleType === 'credit') checkDebtor(debtorId)
    else setWarning(null)
  }, [debtorId])

  async function checkDebtor(id) {
    const ledger = await debtorService.getLedger(id)
    const { buckets } = computeAgingForDebtor(ledger)
    const over90 = (buckets.days90_120 || 0) + (buckets.days120plus || 0)
    if (over90 > 0) setWarning({ type: 'block', msg: `⛔ Overdue ${fmt.currency(over90)} (90+ days). ${isSuperAdmin ? 'Override active.' : 'Credit blocked.'}` })
    else if (buckets.days60_90 > 0) setWarning({ type: 'orange', msg: `⚠ ${fmt.currency(buckets.days60_90)} overdue 60–90 days.` })
    else if (buckets.days30_60 > 0) setWarning({ type: 'yellow', msg: `⚠ ${fmt.currency(buckets.days30_60)} overdue 30–60 days.` })
    else setWarning(null)
  }

  const addToBasket = (item) => {
    setBasket((prev) => {
      const existing = prev.find((b) => b.skuId === item.id)
      if (existing) {
        if (existing.qty >= item.qty) { showToast('Maximum stock reached', 'warning'); return prev }
        return prev.map((b) => b.skuId === item.id ? { ...b, qty: b.qty + 1 } : b)
      }
      return [...prev, { skuId: item.id, name: item.name, qty: 1, unitPrice: item.sellingPrice, lineTotal: item.sellingPrice }]
    })
  }

  const updateBasket = (skuId, newQty) => {
    if (newQty <= 0) { removeFromBasket(skuId); return }
    const item = items.find((i) => i.id === skuId)
    if (item && newQty > item.qty) { showToast('Exceeds available stock', 'warning'); return }
    setBasket((prev) => prev.map((b) => b.skuId === skuId ? { ...b, qty: newQty, lineTotal: newQty * b.unitPrice } : b))
  }

  const removeFromBasket = (skuId) => setBasket((prev) => prev.filter((b) => b.skuId !== skuId))

  const totalAmount = basket.reduce((s, b) => s + b.qty * (items.find(i=>i.id===b.skuId)?.sellingPrice||0), 0)

  const handleConfirmSale = async () => {
    if (basket.length === 0) { showToast('Add at least one product', 'error'); return }
    if (saleType === 'credit' && !debtorId) { showToast('Select a debtor for credit sale', 'error'); return }
    if (warning?.type === 'block' && !isSuperAdmin) { showToast('Credit sale blocked — overdue balance', 'error'); return }
    setLoading(true)
    try {
      const saleItems = basket.map((b) => {
        const item = items.find((i) => i.id === b.skuId)
        return { skuId: b.skuId, name: b.name, qty: b.qty, unitPrice: item.sellingPrice, lineTotal: b.qty * item.sellingPrice }
      })
      await transactionService.confirmSale({
        items: saleItems, totalAmount, saleType,
        debtorId: saleType === 'credit' ? debtorId : null, notes,
      }, user.uid, user.displayName || user.email)
      showToast(`✓ Sale confirmed — ${fmt.currency(totalAmount)}`, 'success')
      setBasket([]); setSaleType('cash'); setDebtorId(''); setNotes(''); setWarning(null)
      setMode('history')
    } catch (err) { showToast(err.message || 'Sale failed', 'error') }
    finally { setLoading(false) }
  }

  if (l1 || l2) return <PageLoader />

  // Date-range filter helpers
  const fromDate = new Date(dateFrom + 'T00:00:00')
  const toDate   = new Date(dateTo   + 'T23:59:59')

  const inRange = (t) => {
    const d = t.date?.toDate?.()
    return d && d >= fromDate && d <= toDate
  }

  const periodTxns  = txns.filter((t) => inRange(t) && t.status !== 'voided')
  const filteredTxns = txns.filter((t) => inRange(t) && (histFilter === 'all' || t.saleType === histFilter))

  const periodTotal = periodTxns.reduce((s, t) => s + (t.totalAmount || 0), 0)

  const todayTotal = txns.filter((t) => {
    const d = t.date?.toDate?.(); if (!d) return false
    const today = new Date(); today.setHours(0,0,0,0)
    return d >= today && t.status !== 'voided'
  }).reduce((s, t) => s + (t.totalAmount || 0), 0)

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-4">
      <FirestoreRulesAlert error={error} />

      {/* Header + mode toggle */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="page-title text-lg">Sales</h2>
          <p className="text-ink-3 text-xs mt-0.5">Today: <span className="font-semibold text-success">{fmt.currency(todayTotal)}</span></p>
        </div>
        <button
          onClick={() => { setMode(mode === 'new' ? 'history' : 'new'); setBasket([]) }}
          className={mode === 'new' ? 'btn-secondary' : 'btn-primary'}>
          {mode === 'new' ? '✕ Cancel Sale' : '+ New Sale'}
        </button>
      </div>

      {/* ── NEW SALE flow ──────────────────────────────────────────── */}
      {mode === 'new' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left: Product picker */}
          <div className="card space-y-3">
            <h3 className="font-body font-semibold text-ink text-sm border-b border-border-lt pb-2">Select Products</h3>
            <ProductPicker items={items} basket={basket} onAdd={addToBasket} />
          </div>

          {/* Right: Basket + checkout */}
          <div className="space-y-3">
            {/* Basket */}
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-body font-semibold text-ink text-sm">Basket ({basket.length} items)</h3>
                {basket.length > 0 && <button onClick={() => setBasket([])} className="text-danger text-xs hover:underline">Clear all</button>}
              </div>
              {basket.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-border-lt rounded-xl">
                  <p className="text-3xl mb-2">🛒</p>
                  <p className="text-ink-3 text-sm">Tap a product to add it</p>
                </div>
              ) : (
                <>
                  {basket.map((b) => (
                    <BasketRow key={b.skuId} entry={b} items={items} onUpdate={updateBasket} onRemove={removeFromBasket} />
                  ))}
                  <div className="flex items-center justify-between pt-3 border-t border-border-lt mt-2">
                    <span className="font-body font-semibold text-ink">Total</span>
                    <span className="font-display font-bold text-primary text-xl">{fmt.currency(totalAmount)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Payment type */}
            {basket.length > 0 && (
              <div className="card space-y-3">
                <h3 className="font-body font-semibold text-ink text-sm">Payment</h3>
                <div className="grid grid-cols-3 gap-2">
                  {[{k:'cash',l:'💵 Cash'},{k:'credit',l:'📋 Credit'},{k:'gift',l:'🎁 Gift'}].map(({k,l})=>(
                    <button key={k} onClick={()=>setSaleType(k)}
                      className={`py-2.5 rounded-xl text-sm font-semibold border transition-all
                        ${saleType===k?'bg-primary text-white border-primary shadow-sm':'bg-white border-border-lt text-ink-3 hover:border-primary'}`}>
                      {l}
                    </button>
                  ))}
                </div>

                {saleType === 'credit' && (
                  <div>
                    <label className="label">Assign to Debtor *</label>
                    <DebtorPicker
                      debtors={debtors}
                      value={debtorId}
                      onChange={setDebtorId}
                      onAddNew={(mode, prefill) => {
                        setAddDebtorPrefill(prefill || null)
                        setShowAddDebtor(true)
                      }}
                    />
                    {warning && (
                      <div className={`mt-2 p-2.5 rounded-lg text-xs font-body font-medium
                        ${warning.type==='block'?'bg-danger-lt border border-red-200 text-danger':
                          warning.type==='orange'?'bg-orange-50 border border-orange-200 text-orange-700':
                          'bg-warning-lt border border-amber-200 text-warning'}`}>
                        {warning.msg}
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="label">Notes (optional)</label>
                  <input value={notes} onChange={(e)=>setNotes(e.target.value)} className="input-field text-sm" placeholder="Remarks…" />
                </div>

                <button
                  onClick={handleConfirmSale}
                  disabled={loading || basket.length===0 || (warning?.type==='block' && !isSuperAdmin)}
                  className="btn-primary w-full py-3 text-base font-bold disabled:opacity-50">
                  {loading ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Processing…</>
                  ) : (
                    `✓ Confirm Sale — ${fmt.currency(totalAmount)}`
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── SALES HISTORY ─────────────────────────────────────────── */}
      {mode === 'history' && (
        <div className="space-y-3">

          {/* ── Period picker ── */}
          <div className="card space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex gap-1.5 flex-wrap">
                {[{id:'today',l:'Today'},{id:'week',l:'This Week'},{id:'month',l:'This Month'},{id:'custom',l:'Custom'}].map(({id,l})=>(
                  <button key={id} onClick={() => applyPreset(id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all
                      ${period===id?'bg-primary text-white border-primary':'bg-white border-border-lt text-ink-3 hover:border-primary'}`}>
                    {l}
                  </button>
                ))}
              </div>
              <p className="text-ink-3 text-xs font-medium">{fmt.currency(periodTotal)} · {periodTxns.length} sales</p>
            </div>

            {/* Custom date inputs */}
            <div className="flex items-center gap-2 flex-wrap">
              <input type="date" value={dateFrom} max={dateTo}
                onChange={(e) => { setDateFrom(e.target.value); setPeriod('custom') }}
                className="input-field text-sm py-1.5 w-auto" />
              <span className="text-ink-3 text-xs font-medium">to</span>
              <input type="date" value={dateTo} min={dateFrom} max={todayStr()}
                onChange={(e) => { setDateTo(e.target.value); setPeriod('custom') }}
                className="input-field text-sm py-1.5 w-auto" />
            </div>

            {/* Period summary chips */}
            <div className="grid grid-cols-3 gap-2">
              {['cash','credit','gift'].map((type) => {
                const t = periodTxns.filter(t => t.saleType === type)
                const total = t.reduce((s, t) => s + (t.totalAmount || 0), 0)
                const colors = { cash:'bg-success-lt border-green-200 text-success', credit:'bg-primary-lt border-border-blue text-primary', gift:'bg-warning-lt border-amber-200 text-warning' }
                const icons  = { cash:'💵', credit:'📋', gift:'🎁' }
                return (
                  <div key={type} className={`rounded-xl border p-2 text-center ${colors[type]}`}>
                    <p className="text-xs font-medium opacity-70">{icons[type]} {type}</p>
                    <p className="font-bold text-sm">{fmt.currency(total)}</p>
                    <p className="text-xs opacity-60">{t.length} sales</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Type filter */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex gap-2">
              {['all','cash','credit','gift'].map((f) => (
                <button key={f} onClick={() => setHistFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all capitalize
                    ${histFilter===f?'bg-primary text-white border-primary':'bg-white border-border-lt text-ink-3'}`}>
                  {f === 'all' ? 'All' : f}
                </button>
              ))}
            </div>
            <p className="text-ink-3 text-xs ml-auto">{filteredTxns.length} transactions</p>
          </div>

          {/* Transaction list */}
          {filteredTxns.length === 0 ? (
            <div className="card text-center py-14 border-dashed">
              <p className="text-3xl mb-3">🧾</p>
              <p className="text-ink-3 text-sm">No sales yet. Click <strong>+ New Sale</strong> to get started.</p>
            </div>
          ) : (
            <div className="card overflow-hidden p-0">
              {filteredTxns.map((txn) => {
                const colors = {cash:'text-success',credit:'text-primary',gift:'text-warning'}
                const bgColors = {cash:'bg-success-lt',credit:'bg-primary-lt',gift:'bg-warning-lt'}
                const icons = {cash:'💵',credit:'📋',gift:'🎁'}
                const isVoided = txn.status === 'voided'
                return (
                  <div key={txn.id} className={`flex items-start gap-3 px-4 py-3.5 border-b border-border-lt last:border-0 hover:bg-slate-50 ${isVoided?'opacity-50':''}`}>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xl shrink-0 ${bgColors[txn.saleType]||'bg-slate-100'}`}>
                      {icons[txn.saleType]||'💳'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-ink font-semibold text-sm truncate">
                        {txn.items?.map((i)=>`${i.name} ×${i.qty}`)?.join(', ') || '—'}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-ink-4 text-xs">{fmt.dateTime(txn.date)}</span>
                        {isVoided && <span className="badge badge-red text-xs">Voided</span>}
                        {txn.saleType==='credit' && txn.debtorId && (
                          <span className="text-primary text-xs">Credit sale</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`font-bold text-sm ${isVoided?'text-ink-3 line-through':colors[txn.saleType]}`}>
                        {fmt.currency(txn.totalAmount)}
                      </p>
                      {isSuperAdmin && !isVoided && (
                        <button onClick={async()=>{
                          const reason = window.prompt('Void reason:')
                          if(!reason) return
                          try{ await transactionService.voidTransaction(txn.id, reason, user.uid, user.displayName); showToast('Transaction voided','success') }
                          catch(e){ showToast(e.message,'error') }
                        }} className="text-danger text-xs hover:underline mt-0.5">void</button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      <AddDebtorModal
        isOpen={showAddDebtor}
        prefill={addDebtorPrefill}
        onClose={() => {
          setShowAddDebtor(false)
          setAddDebtorPrefill(null)
          if (saleType === 'credit') debtorService.getAll().then(list => setDebtors(list.filter(d => d.status !== 'blocked' || isSuperAdmin)))
        }}
      />
    </div>
  )
}
