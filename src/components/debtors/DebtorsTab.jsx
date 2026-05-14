import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useApp } from '../../context/AppContext'
import { debtorService } from '../../services/debtorService'
import { auditService } from '../../services/auditService'
import { useFirestoreSubscription } from '../../hooks/useFirestore'
import { fmt } from '../../utils/formatters'
import { PageLoader } from '../common/LoadingSpinner'
import FirestoreRulesAlert from '../common/FirestoreRulesAlert'
import AddDebtorModal from './AddDebtorModal'
import DebtorProfilePanel from './DebtorProfilePanel'

const STATUS_BADGE = {
  active: 'badge-blue', settled: 'badge-green', blocked: 'badge-red', credit: 'badge-amber',
}

function DebtorCard({ debtor, onView }) {
  const balance = debtor.currentBalance || 0
  const daysSince = debtor.lastTransactionDate ? fmt.daysSince(debtor.lastTransactionDate) : null
  const handleCall = (e) => { e.stopPropagation(); window.open(`tel:${debtor.phone}`) }
  const handleWA   = (e) => { e.stopPropagation(); window.open(`https://wa.me/${debtor.whatsapp||debtor.phone}`) }

  return (
    <div onClick={onView} className="card-hover active:scale-[0.99]">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-primary-md border-2 border-border-blue flex items-center justify-center shrink-0">
          <span className="font-body text-primary text-sm font-bold">{fmt.initials(debtor.name)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-ink font-semibold text-sm">{debtor.name}</span>
            <span className={`badge text-xs ${STATUS_BADGE[debtor.status]||'badge-gray'}`}>{debtor.status}</span>
          </div>
          <p className="text-ink-3 text-xs mt-0.5">{fmt.phone(debtor.phone)}</p>
          {daysSince !== null && <p className="text-ink-4 text-xs">Last txn {daysSince}d ago</p>}
        </div>
        <div className="text-right shrink-0">
          <p className={`font-bold text-base ${balance>0?'text-danger':balance<0?'text-success':'text-ink-3'}`}>
            {fmt.currency(Math.abs(balance))}
          </p>
          <p className="text-ink-4 text-xs">{balance<0?'credit':balance===0?'settled':'outstanding'}</p>
        </div>
      </div>
      <div className="flex gap-2 mt-3 pt-2.5 border-t border-border-lt">
        <button onClick={handleCall} className="flex-1 btn-secondary text-xs py-1.5 h-8 min-h-0">📞 Call</button>
        <button onClick={handleWA}   className="flex-1 btn-secondary text-xs py-1.5 h-8 min-h-0">💬 WA</button>
        <button onClick={onView}     className="flex-1 btn-primary  text-xs py-1.5 h-8 min-h-0">View →</button>
      </div>
    </div>
  )
}

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

  const { data: debtors, loading, error } = useFirestoreSubscription(
    (cb, e) => debtorService.subscribe(cb, e)
  )

  if (loading) return <PageLoader />

  let filtered = debtors.filter((d) => {
    const q = search.toLowerCase()
    return (!search || d.name.toLowerCase().includes(q) || d.phone?.includes(q)) &&
      (statusFilter === 'all' || d.status === statusFilter)
  })
  if      (sort==='balance') filtered.sort((a,b)=>(b.currentBalance||0)-(a.currentBalance||0))
  else if (sort==='name')    filtered.sort((a,b)=>a.name.localeCompare(b.name))
  else if (sort==='days')    filtered.sort((a,b)=>fmt.daysSince(b.lastTransactionDate||0)-fmt.daysSince(a.lastTransactionDate||0))

  const totalOutstanding = debtors.filter((d)=>(d.currentBalance||0)>0).reduce((s,d)=>s+(d.currentBalance||0),0)

  const handleBlock = async () => {
    if (!blockReason.trim()) { showToast('Reason required','error'); return }
    setBlockLoading(true)
    try {
      await debtorService.block(blockTarget.id, blockReason, user.uid)
      await auditService.log('BLOCK_DEBTOR', blockTarget.id, {status:blockTarget.status}, {status:'blocked',reason:blockReason}, user.uid)
      showToast(`${blockTarget.name} blocked`, 'success')
      setBlockTarget(null); setBlockReason('')
    } catch (err) { showToast(err.message,'error') }
    finally { setBlockLoading(false) }
  }

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-4">
      <FirestoreRulesAlert error={error} />

      <div className="flex items-center justify-between">
        <h2 className="page-title">Debtors</h2>
        <button onClick={()=>setShowAdd(true)} className="btn-primary text-sm px-4">+ Add Debtor</button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="card bg-primary-lt border-border-blue text-center">
          <p className="text-ink-3 text-xs">Active</p>
          <p className="font-bold text-primary text-xl">{debtors.filter(d=>d.status==='active').length}</p>
        </div>
        <div className="card border-red-200 text-center">
          <p className="text-ink-3 text-xs">Outstanding</p>
          <p className="font-bold text-danger text-xl">{fmt.currency(totalOutstanding)}</p>
        </div>
        <div className="card text-center">
          <p className="text-ink-3 text-xs">Total</p>
          <p className="font-bold text-ink text-xl">{debtors.length}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4">🔍</span>
          <input value={search} onChange={(e)=>setSearch(e.target.value)} className="input-field pl-9" placeholder="Search by name or phone…" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all','active','settled','blocked','credit'].map((s)=>(
            <button key={s} onClick={()=>setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all capitalize
                ${statusFilter===s?'bg-primary text-white border-primary':'bg-white border-border-lt text-ink-3 hover:border-border-blue'}`}>
              {s}
            </button>
          ))}
        </div>
        <select value={sort} onChange={(e)=>setSort(e.target.value)} className="select-field w-auto text-xs">
          <option value="balance">↓ Balance</option>
          <option value="name">A–Z Name</option>
          <option value="days">Days Overdue</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center py-14 border-dashed">
          <p className="text-4xl mb-3">👥</p>
          <p className="text-ink-3 text-sm mb-4">{debtors.length===0 ? 'No debtors yet.' : 'No debtors match filter.'}</p>
          {debtors.length===0 && <button onClick={()=>setShowAdd(true)} className="btn-primary text-sm inline-flex">Add First Debtor</button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((d) => (
            <div key={d.id} className="relative group">
              <DebtorCard debtor={d} onView={()=>setSelected(d)} />
              {isSuperAdmin && d.status!=='blocked' && (
                <button onClick={(e)=>{e.stopPropagation();setBlockTarget(d)}}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 btn-danger text-xs px-2 py-0.5 min-h-0 h-6 transition-opacity">
                  Block
                </button>
              )}
              {isSuperAdmin && d.status==='blocked' && (
                <button onClick={async(e)=>{e.stopPropagation();await debtorService.unblock(d.id);showToast('Unblocked','success')}}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 btn-success text-xs px-2 py-0.5 min-h-0 h-6 transition-opacity">
                  Unblock
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <AddDebtorModal isOpen={showAdd} onClose={()=>setShowAdd(false)} />
      {selected && <DebtorProfilePanel debtor={selected} onClose={()=>setSelected(null)} />}

      {blockTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm">
          <div className="bg-white rounded-modal shadow-modal border border-border-lt p-6 w-full max-w-sm animate-slide-up">
            <h3 className="font-semibold text-ink text-base mb-1">Block {blockTarget.name}?</h3>
            <p className="text-ink-3 text-sm mb-4">New credit sales will be prevented.</p>
            <div className="mb-4">
              <label className="label">Reason *</label>
              <textarea value={blockReason} onChange={(e)=>setBlockReason(e.target.value)} className="input-field resize-none" rows={2} />
            </div>
            <div className="flex gap-3">
              <button onClick={()=>setBlockTarget(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleBlock} disabled={blockLoading} className="btn-danger flex-1">{blockLoading?'Blocking…':'Block Debtor'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
