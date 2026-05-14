import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useApp } from '../../context/AppContext'
import { inventoryService } from '../../services/inventoryService'
import { auditService } from '../../services/auditService'
import { fmt } from '../../utils/formatters'
import { PageLoader } from '../common/LoadingSpinner'
import Modal from '../common/Modal'
import SellModal from './SellModal'
import AddItemModal from './AddItemModal'

function StockAdjustModal({ item, onClose }) {
  const { user } = useAuth()
  const { showToast } = useApp()
  const [delta, setDelta] = useState(0)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (delta === 0) { showToast('Enter a non-zero adjustment', 'error'); return }
    if (reason.trim().length < 10) { showToast('Reason must be at least 10 characters', 'error'); return }
    setLoading(true)
    try {
      await inventoryService.adjustStock(item.id, delta, reason, user.uid, item.qty)
      await auditService.log('STOCK_ADJUST', item.id, { qty: item.qty }, { qty: item.qty + delta, reason }, user.uid)
      showToast('Stock adjusted', 'success')
      onClose()
    } catch (err) { showToast(err.message, 'error') }
    finally { setLoading(false) }
  }

  return (
    <Modal isOpen onClose={onClose} title={`Adjust Stock — ${item.name}`} size="sm"
      footer={<><button onClick={onClose} className="btn-secondary">Cancel</button><button onClick={handleSubmit} disabled={loading} className="btn-primary">Apply</button></>}>
      <div className="space-y-3">
        <p className="text-ink-3 text-xs font-body">
          Current stock: <span className="text-ink font-bold">{item.qty}</span>
        </p>
        <div>
          <label className="label">Adjustment (+ to add, − to remove)</label>
          <input type="number" value={delta} onChange={(e) => setDelta(Number(e.target.value))} className="input-field" />
          {delta !== 0 && (
            <p className="text-xs font-body mt-1 text-ink-3">
              New qty: <span className={item.qty + delta < 0 ? 'text-danger font-bold' : 'text-success font-bold'}>{item.qty + delta}</span>
            </p>
          )}
        </div>
        <div>
          <label className="label">Reason (min 10 chars) *</label>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} className="input-field resize-none" rows={2} placeholder="Reason for adjustment…" />
        </div>
      </div>
    </Modal>
  )
}

function ItemCard({ item, isSuperAdmin, onSell, onEdit, onAdjust }) {
  const isLow = item.qty > 0 && item.qty <= (item.lowStockThreshold || 5)
  const isOut = item.qty === 0
  const margin = isSuperAdmin && item.costPrice > 0
    ? Math.round(((item.sellingPrice - item.costPrice) / item.sellingPrice) * 100)
    : null

  const stockBadge = isOut
    ? 'badge-red'
    : isLow
    ? 'badge-amber'
    : 'badge-green'

  const stockLabel = isOut ? 'Out of Stock' : `${item.qty} in stock${isLow ? ' ⚠' : ''}`

  return (
    <div className={`card transition-all hover:shadow-card-hover
      ${isOut ? 'border-red-200 bg-danger-lt/30' : isLow ? 'border-amber-200' : ''}`}>
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0
          ${item.category === 'Book' ? 'bg-violet-100 text-violet-600'
            : item.group === 'apparel' ? 'bg-blue-100 text-blue-600'
            : 'bg-sky-100 text-sky-600'}`}>
          {item.category === 'Book' ? '📚' : item.group === 'apparel' ? '👘' : '📿'}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-ink font-body font-semibold text-sm leading-tight truncate">{item.name}</p>
              <p className="text-ink-3 text-xs mt-0.5">{item.category}{item.subCategory ? ` · ${item.subCategory}` : ''}</p>
              {item.category === 'Book' && item.author && (
                <p className="text-ink-4 text-xs italic">{item.author}{item.edition ? ` · ${item.edition}` : ''}</p>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className="font-body font-bold text-primary text-sm">{fmt.currency(item.sellingPrice)}</p>
              {isSuperAdmin && item.costPrice > 0 && (
                <p className="text-ink-4 text-xs">{fmt.currency(item.costPrice)} cost</p>
              )}
              {isSuperAdmin && margin !== null && (
                <p className={`text-xs font-medium ${margin < 0 ? 'text-danger' : margin < 20 ? 'text-warning' : 'text-success'}`}>
                  {margin}% margin
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between mt-3 pt-2 border-t border-border-lt">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`badge text-xs ${stockBadge}`}>{stockLabel}</span>
              {item.status === 'inactive'    && <span className="badge badge-gray">Inactive</span>}
              {item.status === 'out-of-print' && <span className="badge badge-amber">Out of Print</span>}
            </div>

            <div className="flex gap-1.5 shrink-0">
              {isSuperAdmin && (
                <>
                  <button onClick={() => onAdjust(item)} className="btn-ghost text-xs px-2 py-1 min-h-0 h-8">± Qty</button>
                  <button onClick={() => onEdit(item)}   className="btn-ghost text-xs px-2 py-1 min-h-0 h-8">Edit</button>
                </>
              )}
              <button
                onClick={() => onSell(item)}
                disabled={isOut || item.status === 'inactive'}
                className="btn-primary text-xs px-3 py-1.5 min-h-0 h-8 disabled:opacity-40"
              >
                Sell
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const GROUP_CATEGORIES = {
  apparel:     ['Gopi Dress', 'Kurta', 'Dhoti'],
  accessories: ['Kanthi Mala', 'Japa Mala', 'Bead Bag', 'Hare Krishna Card', 'Gopi Chandan'],
  books:       ['Book'],
}

const TITLES = { apparel: 'Apparel', accessories: 'Accessories', books: 'Books' }

export default function InventoryTab({ tabGroup }) {
  const { isSuperAdmin } = useAuth()
  const [items,       setItems]       = useState([])
  const [loading,     setLoading]     = useState(true)
  const [search,      setSearch]      = useState('')
  const [filter,      setFilter]      = useState('all')
  const [sellItem,    setSellItem]    = useState(null)
  const [editItem,    setEditItem]    = useState(null)
  const [adjustItem,  setAdjustItem]  = useState(null)
  const [showAdd,     setShowAdd]     = useState(false)

  useEffect(() => {
    setLoading(true)
    const unsub = inventoryService.subscribe((all) => {
      const cats = GROUP_CATEGORIES[tabGroup] || []
      setItems(all.filter((i) => cats.includes(i.category)))
      setLoading(false)
    })
    return unsub
  }, [tabGroup])

  if (loading) return <PageLoader />

  const filtered = items.filter((i) => {
    const q = search.toLowerCase()
    const matchSearch = !search ||
      i.name.toLowerCase().includes(q) ||
      i.subCategory?.toLowerCase().includes(q) ||
      i.author?.toLowerCase().includes(q)
    const matchFilter =
      filter === 'all'    ||
      (filter === 'low'    && i.qty > 0 && i.qty <= (i.lowStockThreshold || 5)) ||
      (filter === 'out'    && i.qty === 0) ||
      (filter === 'active' && i.status === 'active')
    return matchSearch && matchFilter
  })

  const activeItems = items.filter((i) => i.status === 'active')

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="page-title">{TITLES[tabGroup]}</h2>
        {isSuperAdmin && (
          <button onClick={() => setShowAdd(true)} className="btn-primary text-sm px-4">
            + Add Item
          </button>
        )}
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center bg-primary-lt border-border-blue">
          <p className="text-ink-3 text-xs font-body">Total Active</p>
          <p className="font-body font-bold text-primary text-xl">{activeItems.length}</p>
        </div>
        <div className="card text-center border-amber-200">
          <p className="text-ink-3 text-xs font-body">Low Stock</p>
          <p className="font-body font-bold text-warning text-xl">{activeItems.filter((i) => i.qty > 0 && i.qty <= (i.lowStockThreshold || 5)).length}</p>
        </div>
        <div className="card text-center border-red-200">
          <p className="text-ink-3 text-xs font-body">Out of Stock</p>
          <p className="font-body font-bold text-danger text-xl">{activeItems.filter((i) => i.qty === 0).length}</p>
        </div>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4">🔍</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9"
            placeholder={`Search ${TITLES[tabGroup].toLowerCase()}…`}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { key: 'all',    label: 'All' },
            { key: 'active', label: 'Active' },
            { key: 'low',    label: '⚠ Low' },
            { key: 'out',    label: '❌ Out' },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-body font-medium border transition-all
                ${filter === key
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-white border-border-lt text-ink-3 hover:border-border-blue hover:text-ink'
                }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="card text-center py-14 border-dashed">
          <p className="text-4xl mb-3">📦</p>
          <p className="text-ink-3 font-body text-sm">No items found.</p>
          {isSuperAdmin && (
            <button onClick={() => setShowAdd(true)} className="btn-primary text-sm mt-4 inline-flex">
              + Add First Item
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((item) => (
            <ItemCard key={item.id} item={item} isSuperAdmin={isSuperAdmin}
              onSell={setSellItem} onEdit={setEditItem} onAdjust={setAdjustItem} />
          ))}
        </div>
      )}

      <SellModal isOpen={!!sellItem} onClose={() => setSellItem(null)} item={sellItem} />
      <AddItemModal isOpen={showAdd || !!editItem} onClose={() => { setShowAdd(false); setEditItem(null) }} editItem={editItem} />
      {adjustItem && <StockAdjustModal item={adjustItem} onClose={() => setAdjustItem(null)} />}
    </div>
  )
}
