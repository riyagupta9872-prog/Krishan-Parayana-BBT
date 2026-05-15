import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useApp } from '../../context/AppContext'
import { inventoryService, ALL_CATEGORIES, CATEGORIES } from '../../services/inventoryService'
import { receivingService } from '../../services/receivingService'
import { auditService } from '../../services/auditService'
import { useFirestoreSubscription } from '../../hooks/useFirestore'
import { fmt } from '../../utils/formatters'
import { PageLoader } from '../common/LoadingSpinner'
import FirestoreRulesAlert from '../common/FirestoreRulesAlert'
import Modal from '../common/Modal'
import AddItemModal from './AddItemModal'

/* ─── Sub-tab constants ──────────────────────────────────────────── */
const SUB_TABS = [
  { id: 'catalog',    label: 'Catalog',      icon: '📋' },
  { id: 'stockin',    label: 'Stock In',     icon: '📥' },
  { id: 'audit',      label: 'Audit',        icon: '🔍' },
  { id: 'valuation',  label: 'Valuation',    icon: '💰' },
]

const CAT_GROUPS = {
  All:        null,
  Apparel:    CATEGORIES.APPAREL,
  Accessories: CATEGORIES.ACCESSORIES,
  Books:      CATEGORIES.BOOKS,
}

/* ─── Catalog sub-tab ────────────────────────────────────────────── */
function CatalogTab({ items, isSuperAdmin, onEdit, onAdjust }) {
  const [search,  setSearch]  = useState('')
  const [catGrp,  setCatGrp]  = useState('All')
  const [sort,    setSort]    = useState('name')
  const [showAdd, setShowAdd] = useState(false)
  const [editItem, setEditItem] = useState(null)

  const SORT_FNS = {
    name:      (a, b) => a.name.localeCompare(b.name),
    qty_desc:  (a, b) => b.qty - a.qty,
    qty_asc:   (a, b) => a.qty - b.qty,
    value_desc:(a, b) => (b.qty * b.sellingPrice) - (a.qty * a.sellingPrice),
    price_desc:(a, b) => b.sellingPrice - a.sellingPrice,
  }

  const catList = CAT_GROUPS[catGrp]
  const filtered = items
    .filter((i) => i.status !== 'inactive' || isSuperAdmin)
    .filter((i) => !catList || catList.includes(i.category))
    .filter((i) => !search || i.name.toLowerCase().includes(search.toLowerCase()) || i.subCategory?.toLowerCase().includes(search.toLowerCase()) || i.author?.toLowerCase().includes(search.toLowerCase()))
    .sort(SORT_FNS[sort] || SORT_FNS.name)

  const active   = items.filter((i) => i.status === 'active')
  const lowStock = active.filter((i) => i.qty > 0 && i.qty <= (i.lowStockThreshold || 5))
  const outStock = active.filter((i) => i.qty === 0)
  const totalMRP = active.reduce((s, i) => s + i.qty * (i.sellingPrice || 0), 0)

  const CAT_ICON = { Apparel: '👘', Accessories: '📿', Books: '📚', Stationery: '📄' }

  return (
    <div className="space-y-4">
      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card bg-primary-lt border-border-blue text-center">
          <p className="text-ink-3 text-xs font-medium">Total SKUs</p>
          <p className="font-bold text-primary text-2xl">{active.length}</p>
        </div>
        <div className="card border-amber-200 bg-warning-lt text-center">
          <p className="text-ink-3 text-xs font-medium">Low Stock</p>
          <p className="font-bold text-warning text-2xl">{lowStock.length}</p>
        </div>
        <div className="card border-red-200 bg-danger-lt text-center">
          <p className="text-ink-3 text-xs font-medium">Out of Stock</p>
          <p className="font-bold text-danger text-2xl">{outStock.length}</p>
        </div>
        <div className="card text-center">
          <p className="text-ink-3 text-xs font-medium">Stock Value (MRP)</p>
          <p className="font-bold text-ink text-lg">{fmt.currency(totalMRP)}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4 text-sm">🔍</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9" placeholder="Search by name, variant, author…" />
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="select-field w-auto text-xs">
          <option value="name">Sort: Name A–Z</option>
          <option value="qty_desc">Sort: Qty ↓ High</option>
          <option value="qty_asc">Sort: Qty ↑ Low</option>
          <option value="value_desc">Sort: Value ↓</option>
          <option value="price_desc">Sort: Price ↓</option>
        </select>
        {isSuperAdmin && (
          <button onClick={() => setShowAdd(true)} className="btn-primary text-sm px-4 shrink-0">
            + Add Product
          </button>
        )}
      </div>

      {/* Category filter chips */}
      <div className="flex gap-2 flex-wrap">
        {Object.keys(CAT_GROUPS).map((g) => (
          <button key={g} onClick={() => setCatGrp(g)}
            className={`px-4 py-1.5 rounded-pill text-xs font-body font-semibold border transition-all
              ${catGrp === g ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white border-border-lt text-ink-3 hover:border-border-blue'}`}>
            {g === 'All' ? 'All Categories' : g}
          </button>
        ))}
      </div>

      {/* Product table / grid */}
      {filtered.length === 0 ? (
        <div className="card text-center py-16 border-dashed">
          <p className="text-3xl mb-3">📦</p>
          <p className="text-ink-3 text-sm">{active.length === 0 ? 'No products yet.' : 'No products match your filters.'}</p>
          {isSuperAdmin && active.length === 0 && (
            <button onClick={() => setShowAdd(true)} className="btn-primary text-sm mt-4 inline-flex">+ Add First Product</button>
          )}
        </div>
      ) : (
        /* Table-style layout */
        <div className="card overflow-hidden p-0">
          {/* Header row */}
          <div className="hidden sm:grid grid-cols-[2fr_1fr_80px_80px_90px_100px] gap-3 px-4 py-2.5 bg-slate-50 border-b border-border-lt text-xs font-semibold text-ink-3 uppercase tracking-wide">
            <span>Product</span><span>Category</span>
            <span className="text-center">Qty</span>
            <span className="text-right">Price</span>
            <span className="text-right">Value</span>
            <span />
          </div>

          {filtered.map((item, idx) => {
            const isLow = item.qty > 0 && item.qty <= (item.lowStockThreshold || 5)
            const isOut = item.qty === 0
            const value = item.qty * (item.sellingPrice || 0)

            return (
              <div key={item.id}
                className={`px-4 py-3 border-b border-border-lt last:border-0 transition-colors hover:bg-slate-50
                  ${isOut ? 'bg-red-50/40' : isLow ? 'bg-amber-50/40' : ''}`}>

                {/* Mobile layout */}
                <div className="sm:hidden flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0
                    ${item.category==='Book'?'bg-violet-100':CATEGORIES.APPAREL.includes(item.category)?'bg-blue-100':'bg-sky-100'}`}>
                    {CAT_ICON[item.category === 'Book' ? 'Books' : CATEGORIES.APPAREL.includes(item.category) ? 'Apparel' : 'Accessories'] || '📦'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-ink font-semibold text-sm">{item.name}</p>
                    <p className="text-ink-3 text-xs">{item.category}{item.subCategory ? ` · ${item.subCategory}` : ''}</p>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className={`badge text-xs ${isOut ? 'badge-red' : isLow ? 'badge-amber' : 'badge-green'}`}>
                        {isOut ? 'Out of Stock' : `${item.qty} units${isLow ? ' ⚠' : ''}`}
                      </span>
                      <span className="text-ink-3 text-xs">{fmt.currency(item.sellingPrice)}</span>
                      <span className="text-primary text-xs font-semibold">Value: {fmt.currency(value)}</span>
                    </div>
                  </div>
                  {isSuperAdmin && (
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => onAdjust(item)} className="btn-ghost text-xs px-2 py-1 min-h-0 h-7">±</button>
                      <button onClick={() => { setEditItem(item) }} className="btn-ghost text-xs px-2 py-1 min-h-0 h-7">✏</button>
                    </div>
                  )}
                </div>

                {/* Desktop table row */}
                <div className="hidden sm:grid grid-cols-[2fr_1fr_80px_80px_90px_100px] gap-3 items-center">
                  <div className="min-w-0">
                    <p className="text-ink font-semibold text-sm truncate">{item.name}</p>
                    {item.subCategory && <p className="text-ink-4 text-xs">{item.subCategory}</p>}
                    {item.author && <p className="text-ink-4 text-xs italic">{item.author}</p>}
                  </div>
                  <div>
                    <span className="text-ink-3 text-xs">{item.category}</span>
                    {item.status !== 'active' && <span className="badge badge-gray text-xs ml-1 capitalize">{item.status}</span>}
                  </div>
                  <div className="text-center">
                    <span className={`badge text-xs ${isOut ? 'badge-red' : isLow ? 'badge-amber' : 'badge-green'}`}>
                      {isOut ? '0' : item.qty}{isLow && !isOut ? ' ⚠' : ''}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-ink font-semibold text-sm">{fmt.currency(item.sellingPrice)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-primary font-semibold text-sm">{fmt.currency(value)}</p>
                  </div>
                  <div className="flex gap-1 justify-end">
                    {isSuperAdmin && (
                      <>
                        <button onClick={() => onAdjust(item)} className="btn-ghost text-xs px-2 py-1 min-h-0 h-7 text-warning">± Adj</button>
                        <button onClick={() => setEditItem(item)} className="btn-ghost text-xs px-2 py-1 min-h-0 h-7">Edit</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <AddItemModal isOpen={showAdd || !!editItem} onClose={() => { setShowAdd(false); setEditItem(null) }} editItem={editItem} />
    </div>
  )
}

/* ─── Stock In sub-tab ───────────────────────────────────────────── */
function StockInTab({ items, isSuperAdmin }) {
  const { user } = useAuth()
  const { showToast } = useApp()
  const [showForm, setShowForm] = useState(false)
  const [itemId,      setItemId]      = useState('')
  const [qty,         setQty]         = useState('')
  const [costPerUnit, setCostPerUnit] = useState('')
  const [supplier,    setSupplier]    = useState('')
  const [invoiceRef,  setInvoiceRef]  = useState('')
  const [notes,       setNotes]       = useState('')
  const [loading,     setLoading]     = useState(false)

  const { data: entries } = useFirestoreSubscription((cb, e) => receivingService.subscribe(cb, e))
  const selectedItem = items.find((i) => i.id === itemId)

  const handleSubmit = async () => {
    if (!itemId) { showToast('Select a product', 'error'); return }
    if (!qty || Number(qty) <= 0) { showToast('Enter valid quantity', 'error'); return }
    setLoading(true)
    try {
      await receivingService.record({
        itemId, itemName: selectedItem.name,
        qtyReceived: Number(qty),
        costPerUnit: isSuperAdmin ? Number(costPerUnit || 0) : 0,
        supplier, invoiceRef, notes,
      }, user.uid, user.displayName || user.email)
      showToast(`✓ ${qty} × ${selectedItem.name} received`, 'success')
      setItemId(''); setQty(''); setCostPerUnit(''); setSupplier(''); setInvoiceRef(''); setNotes('')
      setShowForm(false)
    } catch (err) { showToast(err.message, 'error') }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card bg-primary-lt border-border-blue text-center">
          <p className="text-ink-3 text-xs font-medium">Total Receivings</p>
          <p className="font-bold text-primary text-2xl">{entries.length}</p>
        </div>
        <div className="card text-center">
          <p className="text-ink-3 text-xs font-medium">Units Received (Total)</p>
          <p className="font-bold text-ink text-2xl">{entries.reduce((s, e) => s + (e.qtyReceived || 0), 0)}</p>
        </div>
      </div>

      <button onClick={() => setShowForm(!showForm)} className="btn-primary w-full sm:w-auto">
        {showForm ? '✕ Cancel' : '+ Record Stock Received'}
      </button>

      {/* Inline form */}
      {showForm && (
        <div className="card border-border-blue bg-primary-lt space-y-3">
          <h3 className="font-body font-semibold text-ink text-sm">Record New Stock</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="label">Product *</label>
              <select value={itemId} onChange={(e) => { setItemId(e.target.value); const it = items.find(i=>i.id===e.target.value); if(it&&isSuperAdmin) setCostPerUnit(it.costPrice||'') }} className="select-field">
                <option value="">— Select Product —</option>
                {items.filter(i=>i.status!=='out-of-print').map(i=>(
                  <option key={i.id} value={i.id}>{i.name} ({i.category}) — {i.qty} in stock</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Qty Received *</label>
              <input type="number" value={qty} onChange={(e)=>setQty(e.target.value)} className="input-field" min={1} placeholder="0" />
            </div>
            {isSuperAdmin && (
              <div>
                <label className="label">Cost Per Unit (₹)</label>
                <input type="number" value={costPerUnit} onChange={(e)=>setCostPerUnit(e.target.value)} className="input-field" min={0} />
                {selectedItem && Number(costPerUnit) > selectedItem.sellingPrice && (
                  <p className="text-danger text-xs mt-1">⚠ Cost exceeds selling price!</p>
                )}
              </div>
            )}
            <div>
              <label className="label">Supplier Name</label>
              <input value={supplier} onChange={(e)=>setSupplier(e.target.value)} className="input-field" placeholder="Optional" />
            </div>
            <div>
              <label className="label">Invoice / Challan No.</label>
              <input value={invoiceRef} onChange={(e)=>setInvoiceRef(e.target.value)} className="input-field" placeholder="Optional" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Notes</label>
              <input value={notes} onChange={(e)=>setNotes(e.target.value)} className="input-field" placeholder="Optional remarks" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleSubmit} disabled={loading} className="btn-primary">
              {loading ? 'Saving…' : '✓ Confirm Receipt'}
            </button>
          </div>
        </div>
      )}

      {/* Receiving log */}
      {entries.length === 0 ? (
        <div className="card text-center py-12 border-dashed">
          <p className="text-3xl mb-2">📥</p>
          <p className="text-ink-3 text-sm">No receiving entries yet.</p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="px-4 py-2.5 bg-slate-50 border-b border-border-lt">
            <h3 className="font-body font-semibold text-ink-2 text-sm">Receiving History</h3>
          </div>
          {entries.map((e) => (
            <div key={e.id} className="flex items-start gap-3 px-4 py-3 border-b border-border-lt last:border-0 hover:bg-slate-50">
              <div className="w-9 h-9 rounded-xl bg-primary-lt border border-border-blue flex items-center justify-center text-lg shrink-0">📥</div>
              <div className="flex-1 min-w-0">
                <p className="text-ink font-semibold text-sm">{e.itemName}</p>
                <p className="text-ink-3 text-xs">{fmt.date(e.date)}{e.supplier ? ` · ${e.supplier}` : ''}{e.invoiceRef ? ` · #${e.invoiceRef}` : ''}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-success">+{e.qtyReceived} units</p>
                {isSuperAdmin && e.costPerUnit > 0 && <p className="text-ink-3 text-xs">{fmt.currency(e.costPerUnit)}/unit · {fmt.currency(e.totalCost)}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Audit sub-tab ──────────────────────────────────────────────── */
function AuditTab({ items, isSuperAdmin }) {
  const { user } = useAuth()
  const { showToast } = useApp()
  const [adjustments, setAdjustments] = useState({}) // itemId → {physical, reason}
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState({})

  const setAdj = (id, field, val) =>
    setAdjustments((prev) => ({ ...prev, [id]: { ...prev[id], [field]: val } }))

  const handleSingleAdjust = async (item) => {
    const adj = adjustments[item.id]
    if (!adj?.physical && adj?.physical !== 0) { showToast('Enter physical count', 'error'); return }
    if (!adj?.reason || adj.reason.trim().length < 5) { showToast('Reason required (min 5 chars)', 'error'); return }
    const delta = Number(adj.physical) - item.qty
    if (delta === 0) { showToast('No variance — count matches system qty', 'info'); return }
    setLoading(item.id)
    try {
      await inventoryService.adjustStock(item.id, delta, adj.reason, user.uid, item.qty)
      await auditService.log('STOCK_AUDIT', item.id, { qty: item.qty }, { qty: Number(adj.physical), reason: adj.reason }, user.uid)
      showToast(`✓ ${item.name} adjusted by ${delta > 0 ? '+' : ''}${delta}`, 'success')
      setSaved((p) => ({ ...p, [item.id]: true }))
      setAdjustments((p) => { const n = { ...p }; delete n[item.id]; return n })
      setTimeout(() => setSaved((p) => { const n = { ...p }; delete n[item.id]; return n }), 3000)
    } catch (err) { showToast(err.message, 'error') }
    finally { setLoading(null) }
  }

  const activeItems = items.filter((i) => i.status === 'active')

  return (
    <div className="space-y-4">
      <div className="card-blue text-sm text-ink-2 font-body">
        <p className="font-semibold text-ink mb-1">📋 How to use Stock Audit</p>
        <p>Enter the <strong>physical count</strong> for any item where the quantity differs from the system. Add a reason, then click <strong>Save</strong>. Only enter rows with discrepancies.</p>
      </div>

      {!isSuperAdmin && (
        <div className="card border-amber-200 bg-warning-lt text-sm text-warning font-body font-medium">
          ⚠ Stock adjustments require Super Admin access.
        </div>
      )}

      <div className="card overflow-hidden p-0">
        {/* Header */}
        <div className="hidden sm:grid grid-cols-[2fr_80px_100px_1fr_100px] gap-3 px-4 py-2.5 bg-slate-50 border-b border-border-lt text-xs font-semibold text-ink-3 uppercase tracking-wide">
          <span>Product</span><span className="text-center">System Qty</span>
          <span className="text-center">Physical Count</span>
          <span>Reason</span><span />
        </div>

        {activeItems.map((item) => {
          const adj = adjustments[item.id] || {}
          const physical = adj.physical !== undefined ? Number(adj.physical) : null
          const variance = physical !== null ? physical - item.qty : null
          const hasSaved = saved[item.id]

          return (
            <div key={item.id} className={`px-4 py-3 border-b border-border-lt last:border-0 ${hasSaved ? 'bg-success-lt' : ''}`}>
              {/* Mobile */}
              <div className="sm:hidden space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-ink font-semibold text-sm">{item.name}</p>
                  <span className="badge badge-blue text-xs">{item.qty} in system</span>
                </div>
                {hasSaved ? <p className="text-success text-xs font-semibold">✓ Saved</p> : isSuperAdmin && (
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" value={adj.physical ?? ''} onChange={(e)=>setAdj(item.id,'physical',e.target.value)}
                      className="input-field text-sm" placeholder="Physical count" min={0} />
                    <input value={adj.reason||''} onChange={(e)=>setAdj(item.id,'reason',e.target.value)}
                      className="input-field text-sm" placeholder="Reason" />
                    {variance !== null && variance !== 0 && (
                      <p className={`col-span-2 text-xs font-semibold ${variance>0?'text-success':'text-danger'}`}>
                        Variance: {variance>0?'+':''}{variance} units
                      </p>
                    )}
                    <button onClick={()=>handleSingleAdjust(item)} disabled={loading===item.id}
                      className="col-span-2 btn-primary text-xs py-2">
                      {loading===item.id?'Saving…':'Save Adjustment'}
                    </button>
                  </div>
                )}
              </div>

              {/* Desktop */}
              <div className="hidden sm:grid grid-cols-[2fr_80px_100px_1fr_100px] gap-3 items-center">
                <div>
                  <p className="text-ink font-medium text-sm">{item.name}</p>
                  <p className="text-ink-4 text-xs">{item.category}{item.subCategory?` · ${item.subCategory}`:''}</p>
                </div>
                <div className="text-center"><span className="badge badge-blue">{item.qty}</span></div>
                <div>
                  {hasSaved ? <span className="text-success text-sm font-semibold">✓ Saved</span> : isSuperAdmin ? (
                    <input type="number" value={adj.physical??''} onChange={(e)=>setAdj(item.id,'physical',e.target.value)}
                      className="input-field text-sm text-center" placeholder="Enter count" min={0} />
                  ) : <span className="text-ink-4 text-xs">—</span>}
                </div>
                <div>
                  {!hasSaved && isSuperAdmin && (
                    <>
                      <input value={adj.reason||''} onChange={(e)=>setAdj(item.id,'reason',e.target.value)}
                        className="input-field text-sm" placeholder="Reason for variance" />
                      {variance !== null && variance !== 0 && (
                        <p className={`text-xs mt-0.5 font-semibold ${variance>0?'text-success':'text-danger'}`}>
                          Δ {variance>0?'+':''}{variance}
                        </p>
                      )}
                    </>
                  )}
                </div>
                <div className="flex justify-end">
                  {!hasSaved && isSuperAdmin && (adj.physical !== undefined) && (
                    <button onClick={()=>handleSingleAdjust(item)} disabled={loading===item.id}
                      className="btn-primary text-xs px-3 py-1.5 min-h-0 h-8">
                      {loading===item.id?'…':'Save'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Valuation sub-tab ──────────────────────────────────────────── */
function ValuationTab({ items, isSuperAdmin }) {
  const active = items.filter((i) => i.status === 'active' && i.qty > 0)
  const totalMRP  = active.reduce((s, i) => s + i.qty * (i.sellingPrice || 0), 0)
  const totalCost = active.reduce((s, i) => s + i.qty * (i.costPrice   || 0), 0)

  const byCategory = {}
  active.forEach((i) => {
    const grp = CATEGORIES.APPAREL.includes(i.category) ? 'Apparel'
      : CATEGORIES.BOOKS.includes(i.category) ? 'Books' : 'Accessories'
    if (!byCategory[grp]) byCategory[grp] = { mrp: 0, cost: 0, units: 0, items: 0 }
    byCategory[grp].mrp   += i.qty * (i.sellingPrice || 0)
    byCategory[grp].cost  += i.qty * (i.costPrice    || 0)
    byCategory[grp].units += i.qty
    byCategory[grp].items += 1
  })

  return (
    <div className="space-y-4">
      {/* Grand total */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="card bg-primary-lt border-border-blue">
          <p className="text-ink-3 text-xs font-medium">Total Stock Value (MRP)</p>
          <p className="font-bold text-primary text-xl mt-1">{fmt.currency(totalMRP)}</p>
          <p className="text-ink-4 text-xs mt-0.5">{active.length} SKUs · {active.reduce((s,i)=>s+i.qty,0)} units</p>
        </div>
        {isSuperAdmin && (
          <>
            <div className="card">
              <p className="text-ink-3 text-xs font-medium">Total Stock Value (Cost)</p>
              <p className="font-bold text-ink text-xl mt-1">{fmt.currency(totalCost)}</p>
            </div>
            <div className="card bg-success-lt border-green-200">
              <p className="text-ink-3 text-xs font-medium">Gross Potential Margin</p>
              <p className="font-bold text-success text-xl mt-1">{fmt.currency(totalMRP - totalCost)}</p>
              <p className="text-success/70 text-xs mt-0.5">
                {totalMRP > 0 ? Math.round(((totalMRP - totalCost) / totalMRP) * 100) : 0}% of MRP
              </p>
            </div>
          </>
        )}
      </div>

      {/* Category breakdown */}
      <div className="card overflow-hidden p-0">
        <div className="px-4 py-2.5 bg-slate-50 border-b border-border-lt">
          <h3 className="font-body font-semibold text-ink-2 text-sm">Category-wise Breakdown</h3>
        </div>
        {Object.entries(byCategory).map(([grp, data]) => {
          const ICONS = { Apparel: '👘', Accessories: '📿', Books: '📚' }
          const pct = totalMRP > 0 ? Math.round((data.mrp / totalMRP) * 100) : 0
          return (
            <div key={grp} className="px-4 py-3.5 border-b border-border-lt last:border-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{ICONS[grp]}</span>
                  <span className="font-semibold text-ink text-sm">{grp}</span>
                  <span className="badge badge-gray text-xs">{data.items} SKUs · {data.units} units</span>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary text-sm">{fmt.currency(data.mrp)}</p>
                  {isSuperAdmin && <p className="text-ink-4 text-xs">Cost: {fmt.currency(data.cost)}</p>}
                </div>
              </div>
              {/* Progress bar */}
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-ink-4 text-xs mt-1">{pct}% of total MRP value</p>
            </div>
          )
        })}
      </div>

      {/* Item-level value table */}
      <div className="card overflow-hidden p-0">
        <div className="px-4 py-2.5 bg-slate-50 border-b border-border-lt flex items-center justify-between">
          <h3 className="font-body font-semibold text-ink-2 text-sm">All Products — Value Breakdown</h3>
        </div>
        <div className="hidden sm:grid grid-cols-[2fr_80px_80px_90px] gap-3 px-4 py-2 bg-white border-b border-border-lt text-xs font-semibold text-ink-3 uppercase">
          <span>Product</span><span className="text-center">Qty</span><span className="text-right">Price</span><span className="text-right">Value</span>
        </div>
        {active.sort((a,b)=>(b.qty*b.sellingPrice)-(a.qty*a.sellingPrice)).map((item) => (
          <div key={item.id} className="px-4 py-2.5 border-b border-border-lt last:border-0 hover:bg-slate-50">
            <div className="flex items-center justify-between sm:hidden">
              <div><p className="text-ink text-sm font-medium">{item.name}</p><p className="text-ink-4 text-xs">{item.qty} × {fmt.currency(item.sellingPrice)}</p></div>
              <p className="font-bold text-primary text-sm">{fmt.currency(item.qty * item.sellingPrice)}</p>
            </div>
            <div className="hidden sm:grid grid-cols-[2fr_80px_80px_90px] gap-3 items-center">
              <div><p className="text-ink text-sm font-medium">{item.name}</p><p className="text-ink-4 text-xs">{item.category}</p></div>
              <p className="text-center text-ink text-sm">{item.qty}</p>
              <p className="text-right text-ink-3 text-sm">{fmt.currency(item.sellingPrice)}</p>
              <p className="text-right font-bold text-primary text-sm">{fmt.currency(item.qty * item.sellingPrice)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Main component ─────────────────────────────────────────────── */
export default function InventoryManagement() {
  const { isSuperAdmin } = useAuth()
  const [subTab, setSubTab] = useState('catalog')
  const [adjustItem, setAdjustItem] = useState(null)

  const { data: items, loading, error } = useFirestoreSubscription(
    (cb, e) => inventoryService.subscribe(cb, e)
  )

  if (loading) return <PageLoader />

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-4">
      <FirestoreRulesAlert error={error} />

      {/* Page title */}
      <div>
        <h2 className="page-title text-lg">Inventory Management</h2>
        <p className="text-ink-3 text-xs mt-0.5">
          {items.filter(i=>i.status==='active').length} active products ·{' '}
          {items.filter(i=>i.status==='active').reduce((s,i)=>s+i.qty,0)} total units
        </p>
      </div>

      {/* Sub-tab bar */}
      <div className="flex gap-1 bg-panel-bg border border-border-lt rounded-xl p-1 overflow-x-auto scrollbar-none">
        {SUB_TABS.map((tab) => (
          <button key={tab.id} onClick={() => setSubTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-body font-semibold whitespace-nowrap flex-1 justify-center transition-all
              ${subTab === tab.id
                ? 'bg-white text-primary shadow-card border border-border-lt'
                : 'text-ink-3 hover:text-ink'
              }`}>
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Sub-tab content */}
      {subTab === 'catalog'   && <CatalogTab   items={items} isSuperAdmin={isSuperAdmin} onEdit={setAdjustItem} onAdjust={setAdjustItem} />}
      {subTab === 'stockin'   && <StockInTab   items={items} isSuperAdmin={isSuperAdmin} />}
      {subTab === 'audit'     && <AuditTab     items={items} isSuperAdmin={isSuperAdmin} />}
      {subTab === 'valuation' && <ValuationTab items={items} isSuperAdmin={isSuperAdmin} />}
    </div>
  )
}
