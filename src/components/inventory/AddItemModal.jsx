import { useState, useEffect } from 'react'
import Modal from '../common/Modal'
import { useAuth } from '../../context/AuthContext'
import { useApp } from '../../context/AppContext'
import { inventoryService, ALL_CATEGORIES } from '../../services/inventoryService'

const GROUPS = {
  apparel:     ['Gopi Dress', 'Kurta', 'Dhoti'],
  accessories: ['Kanthi Mala', 'Japa Mala', 'Bead Bag', 'Gopi Chandan', 'Hare Krishna Card'],
  books:       ['Book'],
}

export default function AddItemModal({ isOpen, onClose, editItem = null }) {
  const { user } = useAuth()
  const { showToast } = useApp()
  const isEdit = !!editItem

  const [form, setForm] = useState({
    name: '', category: 'Kurta', subCategory: '', group: 'apparel',
    sellingPrice: '', costPrice: '', qty: 0, lowStockThreshold: 5,
    status: 'active', isGift: false,
    author: '', publisher: '', language: 'English', edition: '', bookType: 'paperback', isbn: '',
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (editItem) setForm({ ...editItem, sellingPrice: editItem.sellingPrice || '', costPrice: editItem.costPrice || '' })
    else setForm((f) => ({ ...f, name: '', sellingPrice: '', costPrice: '', qty: 0 }))
  }, [editItem, isOpen])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleCategoryChange = (cat) => {
    const group = Object.entries(GROUPS).find(([, cats]) => cats.includes(cat))?.[0] || 'accessories'
    set('category', cat); set('group', group)
  }

  const handleSubmit = async () => {
    if (!form.name.trim()) { showToast('Item name required', 'error'); return }
    if (!form.sellingPrice || Number(form.sellingPrice) <= 0) { showToast('Selling price must be > 0', 'error'); return }
    setLoading(true)
    try {
      const data = { ...form, sellingPrice: Number(form.sellingPrice), costPrice: Number(form.costPrice || 0), qty: Number(form.qty || 0) }
      if (isEdit) await inventoryService.update(editItem.id, data)
      else await inventoryService.add(data, user.uid)
      showToast(isEdit ? 'Item updated' : 'Item added', 'success')
      onClose()
    } catch (err) { showToast(err.message || 'Failed', 'error') }
    finally { setLoading(false) }
  }

  const isBook = form.category === 'Book'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Item' : 'Add New Item'} size="lg"
      footer={<><button onClick={onClose} className="btn-secondary">Cancel</button><button onClick={handleSubmit} disabled={loading} className="btn-primary">{loading ? 'Saving…' : isEdit ? 'Update' : 'Add Item'}</button></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="label">Item Name *</label>
            <input value={form.name} onChange={(e) => set('name', e.target.value)} className="input-field" placeholder="e.g. Kurta Plain Medium" />
          </div>
          <div>
            <label className="label">Category *</label>
            <select value={form.category} onChange={(e) => handleCategoryChange(e.target.value)} className="select-field">
              {ALL_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Sub-Category / Variant</label>
            <input value={form.subCategory} onChange={(e) => set('subCategory', e.target.value)} className="input-field" placeholder="e.g. Plain, S/M/L" />
          </div>
          <div>
            <label className="label">Selling Price (₹) *</label>
            <input type="number" value={form.sellingPrice} onChange={(e) => set('sellingPrice', e.target.value)} className="input-field" min={0} />
          </div>
          <div>
            <label className="label">Cost Price (₹)</label>
            <input type="number" value={form.costPrice} onChange={(e) => set('costPrice', e.target.value)} className="input-field" min={0} />
          </div>
          <div>
            <label className="label">{isEdit ? 'Current Qty (read-only)' : 'Opening Qty'}</label>
            <input type="number" value={form.qty} onChange={(e) => set('qty', Number(e.target.value))} className="input-field" min={0} disabled={isEdit} />
          </div>
          <div>
            <label className="label">Low-Stock Threshold</label>
            <input type="number" value={form.lowStockThreshold} onChange={(e) => set('lowStockThreshold', Number(e.target.value))} className="input-field" min={1} />
          </div>
        </div>

        {isBook && (
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border-lt">
            <h4 className="col-span-2 font-body font-semibold text-ink-2 text-sm">Book Details</h4>
            <div><label className="label">Author</label><input value={form.author} onChange={(e) => set('author', e.target.value)} className="input-field" /></div>
            <div><label className="label">Publisher</label><input value={form.publisher} onChange={(e) => set('publisher', e.target.value)} className="input-field" /></div>
            <div>
              <label className="label">Language</label>
              <select value={form.language} onChange={(e) => set('language', e.target.value)} className="select-field">
                {['English', 'Hindi', 'Bengali', 'Sanskrit', 'Gujarati', 'Other'].map((l) => <option key={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Type</label>
              <select value={form.bookType} onChange={(e) => set('bookType', e.target.value)} className="select-field">
                {['hardcover', 'paperback', 'magazine', 'set'].map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div><label className="label">Edition</label><input value={form.edition} onChange={(e) => set('edition', e.target.value)} className="input-field" /></div>
            <div><label className="label">ISBN (optional)</label><input value={form.isbn} onChange={(e) => set('isbn', e.target.value)} className="input-field" /></div>
          </div>
        )}

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
