import { useState } from 'react'
import Modal from '../common/Modal'
import { useAuth } from '../../context/AuthContext'
import { useApp } from '../../context/AppContext'
import { debtorService } from '../../services/debtorService'

export default function AddDebtorModal({ isOpen, onClose }) {
  const { user, isSuperAdmin } = useAuth()
  const { showToast } = useApp()
  const [form, setForm] = useState({ name: '', phone: '', whatsapp: '', notes: '', openingBalance: '', creditLimit: '' })
  const [loading, setLoading] = useState(false)

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.name.trim()) { showToast('Name required', 'error'); return }
    if (!form.phone.trim() || form.phone.trim().length !== 10) { showToast('Valid 10-digit phone required', 'error'); return }
    setLoading(true)
    try {
      await debtorService.add(form, user.uid)
      showToast(`${form.name} added`, 'success')
      setForm({ name: '', phone: '', whatsapp: '', notes: '', openingBalance: '', creditLimit: '' })
      onClose()
    } catch (err) { showToast(err.message || 'Failed', 'error') }
    finally { setLoading(false) }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Debtor" size="md"
      footer={<><button onClick={onClose} className="btn-secondary">Cancel</button><button onClick={handleSubmit} disabled={loading} className="btn-primary">{loading ? 'Adding…' : 'Add Debtor'}</button></>}>
      <div className="space-y-3">
        <div>
          <label className="label">Full Name *</label>
          <input value={form.name} onChange={(e) => set('name', e.target.value)} className="input-field" placeholder="Devotee's full name" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Phone * (10 digits)</label>
            <input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} className="input-field" placeholder="9876543210" />
          </div>
          <div>
            <label className="label">WhatsApp</label>
            <input type="tel" value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value.replace(/\D/g, '').slice(0, 10))} className="input-field" placeholder="Same as phone" />
          </div>
        </div>
        {isSuperAdmin && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Opening Balance (₹)</label>
              <input type="number" value={form.openingBalance} onChange={(e) => set('openingBalance', e.target.value)} className="input-field" min={0} />
            </div>
            <div>
              <label className="label">Credit Limit (₹) — 0 = no limit</label>
              <input type="number" value={form.creditLimit} onChange={(e) => set('creditLimit', e.target.value)} className="input-field" min={0} />
            </div>
          </div>
        )}
        <div>
          <label className="label">Notes / Relationship</label>
          <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} className="input-field resize-none" rows={2} placeholder="Optional notes…" />
        </div>
      </div>
    </Modal>
  )
}
