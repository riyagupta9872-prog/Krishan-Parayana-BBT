import { useState, useEffect } from 'react'
import Modal from '../common/Modal'
import { useAuth } from '../../context/AuthContext'
import { useApp } from '../../context/AppContext'
import { inventoryService } from '../../services/inventoryService'

const GROUPS = [
  { id: 'apparel',     label: '👘 Apparel'     },
  { id: 'accessories', label: '📿 Accessories' },
  { id: 'books',       label: '📚 Books'        },
  { id: 'stationery',  label: '🃏 Stationery'   },
]

const EMPTY = {
  name: '', subVariant: '', productGroup: '', group: 'accessories',
  sellingPrice: '', costPrice: '', qty: 0, lowStockThreshold: 5,
  status: 'active', isGift: false,
}

export default function AddItemModal({ isOpen, onClose, editItem = null }) {
  const { user } = useAuth()
  const { showToast } = useApp()
  const isEdit = !!editItem

  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (editItem) {
      setForm({
        ...EMPTY, ...editItem,
        sellingPrice: editItem.sellingPrice ?? '',
        costPrice:    editItem.costPrice    ?? '',
        productGroup: editItem.productGroup || editItem.category || editItem.name || '',
        group:        editItem.group || 'accessories',
      })
    } else {
      setForm(EMPTY)
    }
  }, [editItem, isOpen])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.name.trim()) { showToast('Product name required', 'error'); return }
    if (!form.sellingPrice || Number(form.sellingPrice) <= 0) { showToast('Selling price must be > 0', 'error'); return }
    setLoading(true)
    try {
      const data = {
        ...form,
        sellingPrice: Number(form.sellingPrice),
        costPrice:    Number(form.costPrice || 0),
        qty:          Number(form.qty || 0),
        productGroup: form.productGroup.trim() || form.name.trim(),
        category:     form.productGroup.trim() || form.name.trim(),
      }
      if (isEdit) await inventoryService.update(editItem.id, data)
      else        await inventoryService.add(data, user.uid)
      showToast(isEdit ? 'Item updated' : 'Item added', 'success')
      onClose()
    } catch (err) { showToast(err.message || 'Failed', 'error') }
    finally { setLoading(false) }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Item' : 'Add New Item'} size="md"
      footer={<><button onClick={onClose} className="btn-secondary">Cancel</button><button onClick={handleSubmit} disabled={loading} className="btn-primary">{loading ? 'Saving…' : isEdit ? 'Update' : 'Add Item'}</button></>}>
      <div className="space-y-4">
        <div>
          <label className="label">Product Name *</label>
          <input value={form.name} onChange={(e) => set('name', e.target.value)} className="input-field" placeholder="e.g. Kurta, Kanthi Mala, Bhagavad Gita" autoFocus />
        </div>

        <div>
          <label className="label">Category Group *</label>
          <div className="grid grid-cols-4 gap-2">
            {GROUPS.map(g => (
              <button key={g.id} type="button" onClick={() => set('group', g.id)}
                className={`py-2 rounded-lg text-xs font-semibold border transition-all
                  ${form.group === g.id ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white border-border-lt text-ink-3 hover:border-primary'}`}>
                {g.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Sub-Variant <span className="text-ink-4 font-normal">(optional — e.g. Small, Medium, Blue)</span></label>
          <input value={form.subVariant} onChange={(e) => set('subVariant', e.target.value)} className="input-field" placeholder="Leave blank if no variant" />
        </div>

        <div>
          <label className="label">Product Group <span className="text-ink-4 font-normal">(groups variants together in sales)</span></label>
          <input value={form.productGroup} onChange={(e) => set('productGroup', e.target.value)} className="input-field"
            placeholder={form.name || 'auto-fills from Product Name'} />
          <p className="text-ink-4 text-xs mt-1">Leave blank to use product name as group.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Selling Price (₹) *</label>
            <input type="number" value={form.sellingPrice} onChange={(e) => set('sellingPrice', e.target.value)} onFocus={(e) => e.target.select()} className="input-field" min={0} />
          </div>
          <div>
            <label className="label">Cost Price (₹)</label>
            <input type="number" value={form.costPrice} onChange={(e) => set('costPrice', e.target.value)} onFocus={(e) => e.target.select()} className="input-field" min={0} />
          </div>
          <div>
            <label className="label">Qty</label>
            <input type="number" value={form.qty} onChange={(e) => set('qty', Number(e.target.value))} onFocus={(e) => e.target.select()} className="input-field" min={0} />
          </div>
          <div>
            <label className="label">Low-Stock Threshold</label>
            <input type="number" value={form.lowStockThreshold} onChange={(e) => set('lowStockThreshold', Number(e.target.value))} onFocus={(e) => e.target.select()} className="input-field" min={1} />
          </div>
        </div>

        <div className="flex items-center gap-4 pt-2 border-t border-border-lt flex-wrap">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isGift} onChange={(e) => set('isGift', e.target.checked)} className="w-4 h-4 accent-primary" />
            <span className="text-ink-3 text-xs font-body">Allow Gift / Free Distribution (₹0)</span>
          </label>
          {isEdit && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-ink-3 text-xs">Status:</span>
              <select value={form.status} onChange={(e) => set('status', e.target.value)} className="select-field text-xs py-1 w-auto">
                {['active', 'inactive', 'out-of-print'].map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
