import { useState } from 'react'
import Modal from '../common/Modal'
import { useAuth } from '../../context/AuthContext'
import { useApp } from '../../context/AppContext'
import { debtorService } from '../../services/debtorService'
import { lookupDevoteeByPhone } from '../../services/directoryService'
import { fmt } from '../../utils/formatters'

const EMPTY = { name: '', phone: '', reference: '', teamName: '', openingBalance: '', creditLimit: '' }

export default function AddDebtorModal({ isOpen, onClose }) {
  const { user, isSuperAdmin } = useAuth()
  const { showToast } = useApp()

  const [mode,        setMode]        = useState('manual') // 'manual' | 'directory'
  const [dirPhone,    setDirPhone]    = useState('')
  const [dirSearching,setDirSearching]= useState(false)
  const [dirFound,    setDirFound]    = useState(null)
  const [form,        setForm]        = useState(EMPTY)
  const [loading,     setLoading]     = useState(false)

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleDirectorySearch = async () => {
    const q = dirPhone.replace(/\D/g, '').slice(-10)
    if (q.length !== 10) { showToast('Enter a valid 10-digit number', 'error'); return }
    setDirSearching(true)
    try {
      const profile = await lookupDevoteeByPhone(q)
      if (profile) {
        setDirFound(profile)
        setForm({
          name:           profile.name        || '',
          phone:          profile.mobile      || q,
          reference:      profile.referenceBy || '',
          teamName:       profile.teamName    || '',
          openingBalance: '',
          creditLimit:    '',
        })
        showToast(`Found: ${profile.name}`, 'success')
      } else {
        setDirFound(null)
        showToast('Not found in directory — fill manually', 'warning')
      }
    } catch { showToast('Directory lookup failed', 'error') }
    finally { setDirSearching(false) }
  }

  const handleSubmit = async () => {
    if (!form.name.trim()) { showToast('Name required', 'error'); return }
    if (!form.phone.trim() || form.phone.replace(/\D/g,'').length !== 10) { showToast('Valid 10-digit phone required', 'error'); return }
    setLoading(true)
    try {
      await debtorService.add(form, user.uid)
      showToast(`${form.name} added`, 'success')
      setForm(EMPTY); setDirPhone(''); setDirFound(null); setMode('manual')
      onClose()
    } catch (err) { showToast(err.message || 'Failed', 'error') }
    finally { setLoading(false) }
  }

  const handleClose = () => {
    setForm(EMPTY); setDirPhone(''); setDirFound(null); setMode('manual')
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add New Debtor" size="md"
      footer={<><button onClick={handleClose} className="btn-secondary">Cancel</button><button onClick={handleSubmit} disabled={loading} className="btn-primary">{loading ? 'Adding…' : 'Add Debtor'}</button></>}>
      <div className="space-y-4">

        {/* Mode toggle */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
          {[
            { id: 'directory', icon: '📂', label: 'From Directory' },
            { id: 'manual',    icon: '✍️', label: 'Manual'         },
          ].map(({ id, icon, label }) => (
            <button key={id} onClick={() => setMode(id)}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all
                ${mode === id ? 'bg-white text-primary shadow-sm' : 'text-ink-3 hover:text-ink'}`}>
              {icon} {label}
            </button>
          ))}
        </div>

        {/* Directory search */}
        {mode === 'directory' && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="tel"
                value={dirPhone}
                onChange={(e) => setDirPhone(e.target.value.replace(/\D/g,'').slice(0,10))}
                onKeyDown={(e) => e.key === 'Enter' && handleDirectorySearch()}
                className="input-field flex-1"
                placeholder="Enter 10-digit mobile number"
              />
              <button onClick={handleDirectorySearch} disabled={dirSearching} className="btn-primary shrink-0 px-4">
                {dirSearching ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" /> : '🔍 Search'}
              </button>
            </div>
            {dirFound && (
              <div className="card border-border-blue bg-primary-lt">
                <p className="text-primary font-bold text-sm">{dirFound.name}</p>
                <p className="text-ink-3 text-xs">{fmt.phone(dirFound.mobile)} {dirFound.teamName ? `· ${dirFound.teamName}` : ''}</p>
                {dirFound.referenceBy && <p className="text-ink-3 text-xs">Ref: <span className="text-ink font-medium">{dirFound.referenceBy}</span></p>}
                <p className="text-success text-xs mt-1 font-medium">✓ Form pre-filled below — review and save</p>
              </div>
            )}
          </div>
        )}

        {/* Form (always visible) */}
        <div className="space-y-3">
          <div>
            <label className="label">Full Name *</label>
            <input value={form.name} onChange={(e) => set('name', e.target.value)} className="input-field" placeholder="Devotee's full name" />
          </div>
          <div>
            <label className="label">Phone * (10 digits)</label>
            <input type="tel" value={form.phone}
              onChange={(e) => set('phone', e.target.value.replace(/\D/g,'').slice(0,10))}
              className="input-field" placeholder="9876543210" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Reference</label>
              <input value={form.reference} onChange={(e) => set('reference', e.target.value)} className="input-field" placeholder="Referred by" />
            </div>
            <div>
              <label className="label">Team Name</label>
              <input value={form.teamName} onChange={(e) => set('teamName', e.target.value)} className="input-field" placeholder="e.g. Sakhi Sang" />
            </div>
          </div>
          {isSuperAdmin && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Opening Balance (₹)</label>
                <input type="number" value={form.openingBalance} onChange={(e) => set('openingBalance', e.target.value)} onFocus={(e) => e.target.select()} className="input-field" min={0} placeholder="0" />
              </div>
              <div>
                <label className="label">Credit Limit (₹)</label>
                <input type="number" value={form.creditLimit} onChange={(e) => set('creditLimit', e.target.value)} onFocus={(e) => e.target.select()} className="input-field" min={0} placeholder="0 = no limit" />
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
