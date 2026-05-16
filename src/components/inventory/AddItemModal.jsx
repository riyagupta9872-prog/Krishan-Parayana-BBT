import { useState, useEffect } from 'react'
import Modal from '../common/Modal'
import { useAuth } from '../../context/AuthContext'
import { useApp } from '../../context/AppContext'
import { inventoryService } from '../../services/inventoryService'

const GROUPS = [
  { id: 'apparel',     label: '👘 Apparel'     },
  { id: 'accessories', label: '📿 Accessories' },
  { id: 'books',       label: '📚 Books'        },
]

// Quick-select product chips per category
const SUGGESTIONS = {
  apparel:     ['Kurta', 'Gopi Dress', 'Dhoti', 'Dupatta'],
  accessories: ['Kanthi Mala', 'Chanting Mala', 'Bead Bag', 'Counter', 'Gopi Chandan', 'HK Card', 'Tilak Stand'],
  books:       [],
}

const EMPTY = {
  productGroup: '', subVariant: '', group: 'accessories',
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
        // Resolve productGroup: prefer stored productGroup, fall back to name
        productGroup: editItem.productGroup || editItem.name || '',
        subVariant:   editItem.subVariant || '',
        group:        editItem.group === 'stationery' ? 'accessories' : (editItem.group || 'accessories'),
      })
    } else {
      setForm(EMPTY)
    }
  }, [editItem, isOpen])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const setGroup = (g) => setForm((f) => ({
    ...f, group: g,
    // Reset product selection when switching category (unless it's a custom/book entry)
    productGroup: SUGGESTIONS[g]?.includes(f.productGroup) ? '' : f.productGroup,
  }))

  // Display name is auto-computed from product + subVariant
  const computedName = form.subVariant.trim()
    ? `${form.productGroup.trim()} - ${form.subVariant.trim()}`
    : form.productGroup.trim()

  const handleSubmit = async () => {
    if (!form.productGroup.trim()) { showToast('Product name required', 'error'); return }
    if (!form.sellingPrice || Number(form.sellingPrice) <= 0) { showToast('Selling price must be > 0', 'error'); return }
    setLoading(true)
    try {
      const data = {
        ...form,
        name:         computedName,
        sellingPrice: Number(form.sellingPrice),
        costPrice:    Number(form.costPrice || 0),
        qty:          Number(form.qty || 0),
        productGroup: form.productGroup.trim(),
        category:     form.productGroup.trim(),
      }
      if (isEdit) await inventoryService.update(editItem.id, data)
      else        await inventoryService.add(data, user.uid)
      showToast(isEdit ? 'Item updated' : 'Item added', 'success')
      onClose()
    } catch (err) { showToast(err.message || 'Failed', 'error') }
    finally { setLoading(false) }
  }

  const suggestions = SUGGESTIONS[form.group] || []

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Item' : 'Add New Item'} size="md"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSubmit} disabled={loading} className="btn-primary">
            {loading ? 'Saving…' : isEdit ? 'Update' : 'Add Item'}
          </button>
        </>
      }>
      <div className="space-y-5">

        {/* ── 1. Category ── */}
        <div>
          <label className="label">Category *</label>
          <div className="grid grid-cols-3 gap-2">
            {GROUPS.map((g) => (
              <button key={g.id} type="button" onClick={() => setGroup(g.id)}
                className={`py-2.5 rounded-lg text-xs font-semibold border transition-all
                  ${form.group === g.id
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'bg-white border-border-lt text-ink-3 hover:border-primary hover:text-primary'}`}>
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── 2. Product ── */}
        <div>
          <label className="label">Product *</label>

          {/* Quick-select chips for Apparel & Accessories */}
          {suggestions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {suggestions.map((s) => (
                <button key={s} type="button" onClick={() => set('productGroup', s)}
                  className={`px-3 py-1 rounded-pill text-xs font-semibold border transition-all
                    ${form.productGroup === s
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : 'bg-white border-border-lt text-ink-3 hover:border-primary hover:text-primary'}`}>
                  {s}
                </button>
              ))}
            </div>
          )}

          <input
            value={form.productGroup}
            onChange={(e) => set('productGroup', e.target.value)}
            className="input-field"
            placeholder={
              form.group === 'books'
                ? 'e.g. Bhagavad Gita, Nectar of Devotion'
                : suggestions.length > 0
                  ? 'Select above or type a custom product name'
                  : 'Enter product name'
            }
          />
        </div>

        {/* ── 3. Sub-Variant ── */}
        <div>
          <label className="label">
            Sub-Variant
            <span className="text-ink-4 font-normal ml-1">(optional)</span>
          </label>
          <input
            value={form.subVariant}
            onChange={(e) => set('subVariant', e.target.value)}
            className="input-field"
            placeholder={
              form.group === 'apparel' ? 'e.g. Small, Medium, Large, XL'
                : form.group === 'accessories' ? 'e.g. Double Zipper Printed, Plain, 10 beads'
                : 'e.g. Hindi, English, Deluxe edition'
            }
          />
          <p className="text-ink-4 text-xs mt-1">
            Leave blank if there is only one version of this product.
          </p>
        </div>

        {/* ── Name preview ── */}
        {computedName && (
          <div className="bg-primary-lt border border-border-blue rounded-lg px-3 py-2.5 flex items-center gap-2">
            <span className="text-primary text-xs font-semibold shrink-0">Display name:</span>
            <span className="text-ink font-bold text-sm">{computedName}</span>
          </div>
        )}

        {/* ── Prices + Qty ── */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Selling Price (₹) *</label>
            <input type="number" value={form.sellingPrice} onChange={(e) => set('sellingPrice', e.target.value)}
              onFocus={(e) => e.target.select()} className="input-field" min={0} />
          </div>
          <div>
            <label className="label">Cost Price (₹)</label>
            <input type="number" value={form.costPrice} onChange={(e) => set('costPrice', e.target.value)}
              onFocus={(e) => e.target.select()} className="input-field" min={0} />
          </div>
          <div>
            <label className="label">Opening Qty</label>
            <input type="number" value={form.qty} onChange={(e) => set('qty', Number(e.target.value))}
              onFocus={(e) => e.target.select()} className="input-field" min={0} />
          </div>
          <div>
            <label className="label">Low-Stock Alert</label>
            <input type="number" value={form.lowStockThreshold} onChange={(e) => set('lowStockThreshold', Number(e.target.value))}
              onFocus={(e) => e.target.select()} className="input-field" min={1} />
          </div>
        </div>

        {/* ── Options ── */}
        <div className="flex items-center gap-4 pt-1 border-t border-border-lt flex-wrap">
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
