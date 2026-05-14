import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useApp } from '../../context/AppContext'
import { inventoryService } from '../../services/inventoryService'
import { auditService } from '../../services/auditService'
import { fmt } from '../../utils/formatters'
import { PageLoader } from '../common/LoadingSpinner'
import Modal from '../common/Modal'

function EditPriceModal({ item, onClose }) {
  const { user } = useAuth()
  const { showToast } = useApp()
  const [sellingPrice, setSellingPrice] = useState(item.sellingPrice || '')
  const [costPrice,    setCostPrice]    = useState(item.costPrice || '')
  const [reason,       setReason]       = useState('')
  const [loading,      setLoading]      = useState(false)

  const margin = sellingPrice && costPrice
    ? Math.round(((sellingPrice - costPrice) / sellingPrice) * 100) : null

  const handleSave = async () => {
    if (!sellingPrice || Number(sellingPrice) <= 0) { showToast('Selling price must be > 0', 'error'); return }
    if (reason.trim().length < 10) { showToast('Reason must be at least 10 characters', 'error'); return }
    setLoading(true)
    try {
      await inventoryService.update(item.id, { sellingPrice: Number(sellingPrice), costPrice: Number(costPrice || 0) })
      await auditService.logPriceChange(item.id, item.name, item.sellingPrice, Number(sellingPrice), reason, user.uid)
      showToast('Price updated', 'success'); onClose()
    } catch (err) { showToast(err.message, 'error') }
    finally { setLoading(false) }
  }

  return (
    <Modal isOpen onClose={onClose} title={`Edit Price — ${item.name}`} size="sm"
      footer={<><button onClick={onClose} className="btn-secondary">Cancel</button><button onClick={handleSave} disabled={loading} className="btn-primary">{loading ? 'Saving…' : 'Update Price'}</button></>}>
      <div className="space-y-3">
        <div className="card-blue text-sm font-body">
          <span className="text-ink-3">Current selling price: </span>
          <span className="text-primary font-bold">{fmt.currency(item.sellingPrice)}</span>
        </div>
        <div>
          <label className="label">New Selling Price (₹) *</label>
          <input type="number" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} className="input-field" min={0.01} step={0.01} />
        </div>
        <div>
          <label className="label">Cost Price (₹)</label>
          <input type="number" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} className="input-field" min={0} />
          {margin !== null && (
            <p className={`text-xs mt-1 font-body font-medium ${margin < 0 ? 'text-danger' : margin < 20 ? 'text-warning' : 'text-success'}`}>
              Gross Margin: {margin}%
            </p>
          )}
        </div>
        <div>
          <label className="label">Change Reason * (min 10 chars)</label>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} className="input-field resize-none" rows={2} placeholder="Reason for price change…" />
          <p className="text-ink-4 text-xs mt-1 text-right">{reason.length}/200</p>
        </div>
      </div>
    </Modal>
  )
}

export default function RatesTab() {
  const [inventory,  setInventory]  = useState([])
  const [priceAudit, setPriceAudit] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [editItem,   setEditItem]   = useState(null)
  const [view,       setView]       = useState('catalog')
  const [search,     setSearch]     = useState('')
  const [catFilter,  setCatFilter]  = useState('all')

  useEffect(() => {
    setLoading(true)
    const u1 = inventoryService.subscribe((d) => { setInventory(d); setLoading(false) })
    const u2 = auditService.subscribePriceAudit(setPriceAudit)
    return () => { u1(); u2() }
  }, [])

  if (loading) return <PageLoader />

  const categories = ['all', ...new Set(inventory.map((i) => i.category))]

  const filtered = inventory.filter((i) => {
    const q = search.toLowerCase()
    return (!search || i.name.toLowerCase().includes(q)) &&
      (catFilter === 'all' || i.category === catFilter)
  })

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="page-title">Rates & Pricing</h2>
        <div className="flex gap-2">
          {[{ id: 'catalog', label: '📋 Price List' }, { id: 'audit', label: '🕐 Audit Log' }].map(({ id, label }) => (
            <button key={id} onClick={() => setView(id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-body font-medium border transition-all
                ${view === id ? 'bg-primary text-white border-primary' : 'bg-white border-border-lt text-ink-3'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {view === 'catalog' ? (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4">🔍</span>
              <input value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-9" placeholder="Search items…" />
            </div>
            <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="select-field w-auto">
              {categories.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            {filtered.map((item) => {
              const margin = item.costPrice > 0 ? Math.round(((item.sellingPrice - item.costPrice) / item.sellingPrice) * 100) : null
              return (
                <div key={item.id} className="card hover:shadow-card-hover transition-shadow flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-ink font-body font-semibold text-sm">{item.name}</p>
                    <p className="text-ink-3 text-xs">{item.category}{item.subCategory ? ` · ${item.subCategory}` : ''}</p>
                    {item.status !== 'active' && <span className="badge badge-gray text-xs mt-0.5 capitalize">{item.status}</span>}
                  </div>
                  <div className="text-center hidden sm:block">
                    <p className="text-ink-4 text-xs">Cost</p>
                    <p className="font-body text-ink-3 text-sm">{item.costPrice > 0 ? fmt.currency(item.costPrice) : '—'}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-ink-4 text-xs">MRP</p>
                    <p className="font-body font-bold text-primary text-sm">{fmt.currency(item.sellingPrice)}</p>
                  </div>
                  <div className="text-center w-16">
                    <p className="text-ink-4 text-xs">Margin</p>
                    <p className={`font-body font-semibold text-sm ${
                      margin === null ? 'text-ink-4' : margin < 0 ? 'text-danger' : margin < 20 ? 'text-warning' : 'text-success'
                    }`}>
                      {margin !== null ? `${margin}%` : '—'}
                    </p>
                  </div>
                  <button onClick={() => setEditItem(item)} className="btn-secondary text-xs px-3 py-1.5 h-8 min-h-0">Edit</button>
                </div>
              )
            })}
          </div>
        </>
      ) : (
        <div className="space-y-2">
          {priceAudit.length === 0
            ? <div className="card text-center py-10"><p className="text-ink-3 font-body">No price changes recorded yet</p></div>
            : priceAudit.map((entry) => (
              <div key={entry.id} className="card hover:shadow-card-hover transition-shadow">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="text-ink font-body font-semibold text-sm">{entry.itemName}</p>
                  <p className="text-ink-4 text-xs">{fmt.dateTime(entry.timestamp)}</p>
                </div>
                <div className="flex items-center gap-3 mt-1.5 text-sm font-body">
                  <span className="text-ink-3">{fmt.currency(entry.oldPrice)}</span>
                  <span className="text-ink-4">→</span>
                  <span className="text-primary font-bold">{fmt.currency(entry.newPrice)}</span>
                  <span className={`badge text-xs ${entry.newPrice > entry.oldPrice ? 'badge-red' : 'badge-green'}`}>
                    {entry.newPrice > entry.oldPrice ? '↑' : '↓'} {Math.round(Math.abs(entry.newPrice - entry.oldPrice) / (entry.oldPrice || 1) * 100)}%
                  </span>
                </div>
                <p className="text-ink-3 text-xs mt-1.5 italic">"{entry.reason}"</p>
              </div>
            ))
          }
        </div>
      )}

      {editItem && <EditPriceModal item={editItem} onClose={() => setEditItem(null)} />}
    </div>
  )
}
