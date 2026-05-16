import { useState, useEffect } from 'react'
import Modal from '../common/Modal'
import { useAuth } from '../../context/AuthContext'
import { useApp } from '../../context/AppContext'
import { debtorService } from '../../services/debtorService'
import { lookupDevoteeByPhone, lookupDevoteesByName } from '../../services/directoryService'
import { fmt } from '../../utils/formatters'

const EMPTY = { name: '', phone: '', reference: '', teamName: '', openingBalance: '', creditLimit: '' }

function prefillFromProfile(profile, fallbackPhone = '') {
  return {
    name:           profile.name        || '',
    phone:          profile.mobile      || fallbackPhone,
    reference:      profile.referenceBy || '',
    teamName:       profile.teamName    || '',
    openingBalance: '',
    creditLimit:    '',
  }
}

export default function AddDebtorModal({ isOpen, onClose, prefill = null }) {
  const { user, isSuperAdmin } = useAuth()
  const { showToast } = useApp()

  const [mode,         setMode]         = useState('manual')
  const [query,        setQuery]        = useState('')
  const [searching,    setSearching]    = useState(false)
  const [results,      setResults]      = useState([])   // array for name search
  const [dirFound,     setDirFound]     = useState(null) // single selected profile
  const [form,         setForm]         = useState(EMPTY)
  const [loading,      setLoading]      = useState(false)

  useEffect(() => {
    if (isOpen && prefill) {
      setDirFound(prefill)
      setMode('directory')
      setForm(prefillFromProfile(prefill))
    }
  }, [isOpen, prefill])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const isPhoneQuery = (q) => q.replace(/\D/g, '').length >= 10

  const handleSearch = async () => {
    const q = query.trim()
    if (!q) return
    setSearching(true)
    setResults([])
    setDirFound(null)

    try {
      if (isPhoneQuery(q)) {
        // Phone lookup — single result
        const phone = q.replace(/\D/g, '').slice(-10)
        const profile = await lookupDevoteeByPhone(phone)
        if (profile) {
          setDirFound(profile)
          setForm(prefillFromProfile(profile, phone))
          showToast(`Found: ${profile.name}`, 'success')
        } else {
          showToast('Not found in directory — fill manually', 'warning')
        }
      } else {
        // Name search — multiple results
        const list = await lookupDevoteesByName(q)
        if (list.length === 0) {
          showToast('No matches found — try a different spelling or use phone', 'warning')
        } else if (list.length === 1) {
          setDirFound(list[0])
          setForm(prefillFromProfile(list[0]))
          showToast(`Found: ${list[0].name}`, 'success')
        } else {
          setResults(list)
        }
      }
    } catch { showToast('Directory lookup failed', 'error') }
    finally { setSearching(false) }
  }

  const selectResult = (profile) => {
    setDirFound(profile)
    setResults([])
    setForm(prefillFromProfile(profile))
  }

  const handleSubmit = async () => {
    if (!form.name.trim()) { showToast('Name required', 'error'); return }
    if (!form.phone.trim() || form.phone.replace(/\D/g, '').length !== 10) {
      showToast('Valid 10-digit phone required', 'error'); return
    }
    setLoading(true)
    try {
      await debtorService.add(form, user.uid)
      showToast(`${form.name} added`, 'success')
      setForm(EMPTY); setQuery(''); setResults([]); setDirFound(null); setMode('manual')
      onClose()
    } catch (err) { showToast(err.message || 'Failed', 'error') }
    finally { setLoading(false) }
  }

  const handleClose = () => {
    setForm(EMPTY); setQuery(''); setResults([]); setDirFound(null); setMode('manual')
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add New Debtor" size="md"
      footer={
        <>
          <button onClick={handleClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSubmit} disabled={loading} className="btn-primary">
            {loading ? 'Adding…' : 'Add Debtor'}
          </button>
        </>
      }>
      <div className="space-y-4">

        {/* Mode toggle */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
          {[
            { id: 'directory', icon: '📂', label: 'From Directory' },
            { id: 'manual',    icon: '✍️', label: 'Manual'         },
          ].map(({ id, icon, label }) => (
            <button key={id} onClick={() => { setMode(id); setResults([]); setDirFound(null) }}
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
                value={query}
                onChange={(e) => { setQuery(e.target.value); setResults([]); setDirFound(null) }}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="input-field flex-1"
                placeholder="Name or 10-digit phone number"
                autoFocus
              />
              <button onClick={handleSearch} disabled={searching || !query.trim()} className="btn-primary shrink-0 px-4">
                {searching
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                  : '🔍 Search'}
              </button>
            </div>

            <p className="text-ink-4 text-xs">
              {isPhoneQuery(query) ? '📞 Phone search — exact match' : query.length >= 2 ? '🔤 Name search — prefix match' : 'Type a name or 10-digit phone to search'}
            </p>

            {/* Multiple name results */}
            {results.length > 0 && (
              <div className="border border-border-lt rounded-xl overflow-hidden">
                <p className="text-ink-3 text-xs px-3 py-2 bg-slate-50 border-b border-border-lt">
                  {results.length} match{results.length > 1 ? 'es' : ''} found — tap to select
                </p>
                {results.map((profile) => (
                  <button key={profile.id} onClick={() => selectResult(profile)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 border-b border-border-lt last:border-0 hover:bg-primary-lt text-left transition-colors">
                    <div className="w-8 h-8 rounded-full bg-primary-md flex items-center justify-center shrink-0">
                      <span className="text-primary text-xs font-bold">
                        {profile.name?.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-ink font-semibold text-sm truncate">{profile.name}</p>
                      <p className="text-ink-4 text-xs">
                        {fmt.phone(profile.mobile)}
                        {profile.teamName ? ` · ${profile.teamName}` : ''}
                      </p>
                    </div>
                    <span className="text-primary text-xs">Select →</span>
                  </button>
                ))}
              </div>
            )}

            {/* Selected profile card */}
            {dirFound && results.length === 0 && (
              <div className="card border-border-blue bg-primary-lt">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-primary font-bold text-sm">{dirFound.name}</p>
                    <p className="text-ink-3 text-xs">{fmt.phone(dirFound.mobile)}{dirFound.teamName ? ` · ${dirFound.teamName}` : ''}</p>
                    {dirFound.referenceBy && <p className="text-ink-3 text-xs">Ref: <span className="text-ink font-medium">{dirFound.referenceBy}</span></p>}
                  </div>
                  <button onClick={() => { setDirFound(null); setForm(EMPTY) }}
                    className="text-ink-4 hover:text-ink text-xs">✕</button>
                </div>
                <p className="text-success text-xs mt-1.5 font-medium">✓ Form pre-filled below — review and save</p>
              </div>
            )}
          </div>
        )}

        {/* Form fields (always visible) */}
        <div className="space-y-3">
          <div>
            <label className="label">Full Name *</label>
            <input value={form.name} onChange={(e) => set('name', e.target.value)}
              className="input-field" placeholder="Devotee's full name" />
          </div>
          <div>
            <label className="label">Phone * (10 digits)</label>
            <input type="tel" value={form.phone}
              onChange={(e) => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
              className="input-field" placeholder="9876543210" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Reference</label>
              <input value={form.reference} onChange={(e) => set('reference', e.target.value)}
                className="input-field" placeholder="Referred by" />
            </div>
            <div>
              <label className="label">Team Name</label>
              <input value={form.teamName} onChange={(e) => set('teamName', e.target.value)}
                className="input-field" placeholder="e.g. Sakhi Sang" />
            </div>
          </div>
          {isSuperAdmin && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Opening Balance (₹)</label>
                <input type="number" value={form.openingBalance}
                  onChange={(e) => set('openingBalance', e.target.value)}
                  onFocus={(e) => e.target.select()} className="input-field" min={0} placeholder="0" />
              </div>
              <div>
                <label className="label">Credit Limit (₹)</label>
                <input type="number" value={form.creditLimit}
                  onChange={(e) => set('creditLimit', e.target.value)}
                  onFocus={(e) => e.target.select()} className="input-field" min={0} placeholder="0 = no limit" />
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
