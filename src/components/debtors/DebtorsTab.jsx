import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useApp } from '../../context/AppContext'
import { debtorService } from '../../services/debtorService'
import { auditService } from '../../services/auditService'
import { lookupDevoteeByPhone } from '../../services/directoryService'
import { useFirestoreSubscription } from '../../hooks/useFirestore'
import { fmt } from '../../utils/formatters'
import { PageLoader } from '../common/LoadingSpinner'
import FirestoreRulesAlert from '../common/FirestoreRulesAlert'
import AddDebtorModal from './AddDebtorModal'
import DebtorProfilePanel from './DebtorProfilePanel'
import BulkImportDebtorsModal from './BulkImportDebtorsModal'

const STATUS_BADGE = {
  active: 'badge-blue', settled: 'badge-green', blocked: 'badge-red', credit: 'badge-amber',
}

// Compute status from balance (overrides stale stored status, except for 'blocked')
function effectiveStatus(debtor) {
  if (debtor.status === 'blocked') return 'blocked'
  const bal = debtor.currentBalance || 0
  if (bal < 0) return 'credit'
  if (bal === 0) return 'settled'
  return 'active'
}

/* ── Debtor card ─────────────────────────────────────────────────── */
function DebtorCard({ debtor, onView }) {
  const balance   = debtor.currentBalance || 0
  const daysSince = debtor.lastTransactionDate ? fmt.daysSince(debtor.lastTransactionDate) : null
  const initials  = debtor.name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()

  const handleCall = (e) => { e.stopPropagation(); window.open(`tel:${debtor.phone}`) }
  const handleWA   = (e) => { e.stopPropagation(); window.open(`https://wa.me/${debtor.whatsapp || debtor.phone}`) }

  return (
    <div onClick={onView} className="card-hover active:scale-[0.99] group">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-primary-dk flex items-center justify-center shrink-0 shadow-sm">
          <span className="font-body text-white text-sm font-bold">{initials}</span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-ink font-bold text-sm">{debtor.name}</span>
            <span className={`badge text-xs ${STATUS_BADGE[effectiveStatus(debtor)] || 'badge-gray'}`}>{effectiveStatus(debtor)}</span>
          </div>

          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-ink-3 text-xs">📞</span>
            <span className="text-ink-2 text-xs font-medium">{fmt.phone(debtor.phone)}</span>
          </div>

          {debtor.reference && (
            <p className="text-ink-4 text-xs mt-0.5 truncate">📌 {debtor.reference}</p>
          )}
          {debtor.teamName && (
            <p className="text-ink-4 text-xs mt-0.5 truncate">👥 {debtor.teamName}</p>
          )}
          {daysSince !== null && (
            <p className="text-ink-4 text-xs mt-0.5">Last txn {daysSince}d ago</p>
          )}
        </div>

        {/* Balance */}
        <div className="text-right shrink-0">
          <p className={`font-bold text-base leading-tight
            ${balance > 0 ? 'text-danger' : balance < 0 ? 'text-success' : 'text-ink-3'}`}>
            {fmt.currency(Math.abs(balance))}
          </p>
          <p className="text-ink-4 text-xs">
            {balance < 0 ? 'credit' : balance === 0 ? 'settled' : 'outstanding'}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-3 pt-2.5 border-t border-border-lt">
        <button onClick={handleCall} className="flex-1 btn-secondary text-xs py-1.5 h-8 min-h-0 gap-1">📞 Call</button>
        <button onClick={handleWA}   className="flex-1 btn-secondary text-xs py-1.5 h-8 min-h-0 gap-1">💬 WA</button>
        <button onClick={onView}     className="flex-1 btn-primary  text-xs py-1.5 h-8 min-h-0 gap-1">View →</button>
      </div>
    </div>
  )
}

/* ── Main tab ────────────────────────────────────────────────────── */
export default function DebtorsTab() {
  const { isSuperAdmin, user } = useAuth()
  const { showToast } = useApp()
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sort,         setSort]         = useState('balance')
  const [selected,     setSelected]     = useState(null)
  const [showAdd,      setShowAdd]      = useState(false)
  const [blockTarget,  setBlockTarget]  = useState(null)
  const [blockReason,  setBlockReason]  = useState('')
  const [blockLoading, setBlockLoading] = useState(false)
  const [dirResult,    setDirResult]    = useState(null)
  const [dirSearching, setDirSearching] = useState(false)
  const [showImport,   setShowImport]   = useState(false)

  const { data: debtors, loading, error } = useFirestoreSubscription(
    (cb, e) => debtorService.subscribe(cb, e)
  )

  // If search looks like a phone number, also lookup in directory
  useEffect(() => {
    const q = search.replace(/\D/g, '')
    if (q.length === 10) {
      setDirSearching(true)
      lookupDevoteeByPhone(q)
        .then(setDirResult)
        .catch(() => setDirResult(null))
        .finally(() => setDirSearching(false))
    } else {
      setDirResult(null)
    }
  }, [search])

  if (loading) return <PageLoader />

  let filtered = debtors.filter((d) => {
    const q = search.toLowerCase()
    return (!search || d.name.toLowerCase().includes(q) ||
      d.phone?.includes(search.replace(/\D/g, '')) ||
      d.reference?.toLowerCase().includes(q) ||
      d.teamName?.toLowerCase().includes(q)) &&
      (statusFilter === 'all' || effectiveStatus(d) === statusFilter)
  })
  if      (sort === 'balance') filtered.sort((a, b) => (b.currentBalance||0) - (a.currentBalance||0))
  else if (sort === 'name')    filtered.sort((a, b) => a.name.localeCompare(b.name))
  else if (sort === 'days')    filtered.sort((a, b) => fmt.daysSince(b.lastTransactionDate||0) - fmt.daysSince(a.lastTransactionDate||0))

  const totalOutstanding = debtors.filter((d) => (d.currentBalance||0) > 0).reduce((s,d) => s + (d.currentBalance||0), 0)

  const handleBlock = async () => {
    if (!blockReason.trim()) { showToast('Reason required', 'error'); return }
    setBlockLoading(true)
    try {
      await debtorService.block(blockTarget.id, blockReason, user.uid)
      await auditService.log('BLOCK_DEBTOR', blockTarget.id, { status: blockTarget.status }, { status: 'blocked', reason: blockReason }, user.uid)
      showToast(`${blockTarget.name} blocked`, 'success')
      setBlockTarget(null); setBlockReason('')
    } catch (err) { showToast(err.message, 'error') }
    finally { setBlockLoading(false) }
  }

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-4">
      <FirestoreRulesAlert error={error} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="page-title text-lg">Debtors</h2>
          <p className="text-ink-3 text-xs mt-0.5">
            {debtors.filter(d => effectiveStatus(d) === 'active').length} active · {fmt.currency(totalOutstanding)} outstanding
          </p>
        </div>
        <div className="flex gap-2">
          {isSuperAdmin && <button onClick={() => setShowImport(true)} className="btn-secondary text-sm px-3">⬆ Import</button>}
          <button onClick={() => setShowAdd(true)} className="btn-primary text-sm px-4">+ Add Debtor</button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card bg-primary-lt border-border-blue text-center">
          <p className="text-ink-3 text-xs font-medium">Active</p>
          <p className="font-bold text-primary text-xl">{debtors.filter(d=>effectiveStatus(d)==='active').length}</p>
        </div>
        <div className="card border-red-200 text-center">
          <p className="text-ink-3 text-xs font-medium">Outstanding</p>
          <p className="font-bold text-danger text-lg">{fmt.currency(totalOutstanding)}</p>
        </div>
        <div className="card text-center">
          <p className="text-ink-3 text-xs font-medium">Total</p>
          <p className="font-bold text-ink text-xl">{debtors.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4 text-sm">🔍</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-9"
            placeholder="Search by name or phone number…" />
          {dirSearching && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border border-primary/20 border-t-primary rounded-full animate-spin" />}
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all','active','settled','blocked','credit'].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all capitalize
                ${statusFilter===s?'bg-primary text-white border-primary':'bg-white border-border-lt text-ink-3 hover:border-border-blue'}`}>
              {s}
            </button>
          ))}
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="select-field w-auto text-xs">
          <option value="balance">↓ Balance</option>
          <option value="name">A–Z Name</option>
          <option value="days">Days Overdue</option>
        </select>
      </div>

      {/* Directory lookup result when searching by phone */}
      {dirResult && !filtered.find(d => d.phone === dirResult.mobile) && (
        <div className="card border-border-blue bg-primary-lt">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-ink font-semibold text-sm">📂 Found in Devotee Directory</p>
              <p className="text-primary font-bold">{dirResult.name}</p>
              <p className="text-ink-3 text-xs">{fmt.phone(dirResult.mobile)} {dirResult.teamName ? `· ${dirResult.teamName}` : ''}</p>
              {dirResult.referenceBy && <p className="text-ink-3 text-xs">Referred by: <span className="text-ink font-semibold">{dirResult.referenceBy}</span></p>}
            </div>
            <button onClick={() => setShowAdd(true)} className="btn-primary text-xs px-3">+ Add as Debtor</button>
          </div>
        </div>
      )}

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="card text-center py-14 border-dashed">
          <p className="text-4xl mb-3">👥</p>
          <p className="text-ink-3 text-sm mb-4">{debtors.length === 0 ? 'No debtors yet.' : 'No debtors match filter.'}</p>
          {debtors.length === 0 && <button onClick={() => setShowAdd(true)} className="btn-primary text-sm inline-flex">Add First Debtor</button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((d) => (
            <div key={d.id} className="relative group">
              <DebtorCard debtor={d} onView={() => setSelected(d)} />
              {isSuperAdmin && effectiveStatus(d) !== 'blocked' && (
                <button onClick={(e) => { e.stopPropagation(); setBlockTarget(d) }}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 btn-danger text-xs px-2 py-0.5 min-h-0 h-6 transition-opacity">Block</button>
              )}
              {isSuperAdmin && effectiveStatus(d) === 'blocked' && (
                <button onClick={async (e) => { e.stopPropagation(); await debtorService.unblock(d.id); showToast('Unblocked', 'success') }}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 btn-success text-xs px-2 py-0.5 min-h-0 h-6 transition-opacity">Unblock</button>
              )}
            </div>
          ))}
        </div>
      )}

      <AddDebtorModal isOpen={showAdd} onClose={() => setShowAdd(false)} />
      {showImport && <BulkImportDebtorsModal isOpen={showImport} onClose={() => setShowImport(false)} />}
      {selected && <DebtorProfilePanel debtor={selected} onClose={() => setSelected(null)} />}

      {/* Block dialog */}
      {blockTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm">
          <div className="bg-white rounded-modal shadow-modal border border-border-lt p-6 w-full max-w-sm animate-slide-up">
            <h3 className="font-semibold text-ink text-base mb-1">Block {blockTarget.name}?</h3>
            <p className="text-ink-3 text-sm mb-4">New credit sales will be prevented.</p>
            <div className="mb-4">
              <label className="label">Reason *</label>
              <textarea value={blockReason} onChange={(e) => setBlockReason(e.target.value)} className="input-field resize-none" rows={2} />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setBlockTarget(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleBlock} disabled={blockLoading} className="btn-danger flex-1">{blockLoading ? 'Blocking…' : 'Block Debtor'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
