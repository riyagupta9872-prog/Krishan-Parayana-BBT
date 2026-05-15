import { useState } from 'react'
import Modal from '../common/Modal'
import { useAuth } from '../../context/AuthContext'
import { useApp } from '../../context/AppContext'
import { debtorService } from '../../services/debtorService'

const EMPTY = { name: '', phone: '', reference: '', teamName: '', openingBalance: '', creditLimit: '' }

export default function AddDebtorModal({ isOpen, onClose }) {
  const { user, isSuperAdmin } = useAuth()
  const { showToast } = useApp()
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(false)

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    if (!form.name.trim()) { showToast('Name required', 'error'); return }
    if (!form.phone.trim() || form.phone.trim().length !== 10) { showToast('Valid 10-digit phone required', 'error'); return }
    setLoading(true)
    try {
      await debtorService.add(form, user.uid)
      showToast(`${form.name} added`, 'success')
      setForm(EMPTY)
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
        <div>
          <label className="label">Phone * (10 digits)</label>
          <input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} className="input-field" placeholder="9876543210" />
        </div>
        <div>
          <label className="label">Reference</label>
          <input value={form.reference} onChange={(e) => set('reference', e.target.value)} className="input-field" placeholder="Referred by / relationship" />
        </div>
        <div>
          <label className="label">Team Name</label>
          <input value={form.teamName} onChange={(e) => set('teamName', e.target.value)} className="input-field" placeholder="e.g. Sakhi Sang, Youth Forum" />
        </div>
        {isSuperAdmin && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Opening Balance (₹)</label>
              <input type="number" value={form.openingBalance} onChange={(e) => set('openingBalance', e.target.value)} onFocus={(e) => e.target.select()} className="input-field" min={0} placeholder="0" />
            </div>
            <div>
              <label className="label">Credit Limit (₹) — 0 = no limit</label>
              <input type="number" value={form.creditLimit} onChange={(e) => set('creditLimit', e.target.value)} onFocus={(e) => e.target.select()} className="input-field" min={0} placeholder="0" />
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
