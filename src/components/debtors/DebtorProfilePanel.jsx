import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { debtorService } from '../../services/debtorService'
import { directoryApiService } from '../../services/directoryApiService'
import { fmt } from '../../utils/formatters'
import { computeAgingForDebtor } from '../../utils/agingUtils'
import ReceivePaymentModal from './ReceivePaymentModal'
import CallingLogModal from './CallingLogModal'

function LedgerEntry({ entry }) {
  const isDebit = entry.type === 'debit' || entry.type === 'opening'
  const typeClr = {
    debit: 'text-danger', opening: 'text-warning', credit: 'text-success',
    'write-off': 'text-ink-3', gift: 'text-primary', adjustment: 'text-warning',
  }
  const billBadge = {
    open:             'badge-red',
    'partially-paid': 'badge-amber',
    'fully-paid':     'badge-green',
  }

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border-lt last:border-0">
      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${isDebit ? 'bg-danger' : 'bg-success'}`} />
      <div className="flex-1 min-w-0">
        <p className="text-ink text-xs font-body">{entry.description}</p>
        <p className="text-ink-4 text-xs">{fmt.dateTime(entry.date)}</p>
        {entry.billStatus && (
          <span className={`badge text-xs mt-0.5 ${billBadge[entry.billStatus] || 'badge-gray'}`}>
            {entry.billStatus.replace('-', ' ')}
          </span>
        )}
      </div>
      <div className="text-right shrink-0">
        <p className={`font-body font-semibold text-sm ${typeClr[entry.type] || 'text-ink'}`}>
          {isDebit ? '+' : '−'}{fmt.currency(entry.amount)}
        </p>
        <p className="text-ink-4 text-xs">Bal: {fmt.currency(entry.runningBalance)}</p>
      </div>
    </div>
  )
}

export default function DebtorProfilePanel({ debtor, onClose }) {
  const { isSuperAdmin } = useAuth()
  const [ledger,     setLedger]     = useState([])
  const [callingLogs,setCallingLogs]= useState([])
  const [dirProfile, setDirProfile] = useState(null)
  const [dirLoading, setDirLoading] = useState(false)
  const [dirOffline, setDirOffline] = useState(false)
  const [section,    setSection]    = useState('ledger')
  const [showPay,    setShowPay]    = useState(false)
  const [showLog,    setShowLog]    = useState(false)

  useEffect(() => {
    if (!debtor) return
    const u1 = debtorService.subscribeLedger(debtor.id, setLedger)
    const u2 = debtorService.subscribeCallingLog(debtor.id, setCallingLogs)
    fetchDir()
    return () => { u1(); u2() }
  }, [debtor?.id])

  async function fetchDir() {
    if (!debtor) return
    setDirLoading(true)
    try {
      const p = await directoryApiService.lookup(debtor.name, debtor.phone)
      if (p) { setDirProfile(p); debtorService.updateDirectoryCache(debtor.id, p) }
      else if (debtor.directoryCache) { setDirProfile(debtor.directoryCache); setDirOffline(true) }
    } catch {
      if (debtor.directoryCache) { setDirProfile(debtor.directoryCache); setDirOffline(true) }
    } finally { setDirLoading(false) }
  }

  if (!debtor) return null

  const { buckets } = computeAgingForDebtor(ledger)
  const hasOverdue = (buckets.days90_120 || 0) + (buckets.days120plus || 0) > 0
  const balance = debtor.currentBalance || 0

  const STATUS_COLORS = { active: 'badge-blue', settled: 'badge-green', blocked: 'badge-red', credit: 'badge-amber' }

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-40 flex justify-end">
        <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />

        <div className="relative w-full max-w-md h-full bg-white border-l border-border-lt shadow-modal flex flex-col animate-slide-in">
          {/* Panel header */}
          <div className="px-4 pt-4 pb-3 border-b border-border-lt bg-white">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary-md border-2 border-primary/30 flex items-center justify-center overflow-hidden">
                  {dirProfile?.photo
                    ? <img src={dirProfile.photo} alt="" className="w-full h-full object-cover" />
                    : <span className="font-body text-primary font-bold text-sm">{fmt.initials(debtor.name)}</span>
                  }
                </div>
                <div>
                  <h3 className="font-body text-ink font-bold text-sm">{debtor.name}</h3>
                  {dirProfile?.initiationName && <p className="text-primary text-xs italic">{dirProfile.initiationName}</p>}
                  <span className={`badge text-xs mt-0.5 ${STATUS_COLORS[debtor.status] || 'badge-gray'}`}>{debtor.status}</span>
                </div>
              </div>
              <button onClick={onClose} className="btn-icon">✕</button>
            </div>

            {/* Quick actions */}
            <div className="flex gap-2 mt-3">
              <button onClick={() => window.open(`tel:${debtor.phone}`)}        className="flex-1 btn-secondary text-xs py-1.5 h-9 min-h-0 gap-1">📞 Call</button>
              <button onClick={() => window.open(`https://wa.me/${debtor.whatsapp || debtor.phone}`)} className="flex-1 btn-secondary text-xs py-1.5 h-9 min-h-0 gap-1">💬 WA</button>
              <button onClick={() => setShowPay(true)} className="flex-1 btn-success  text-xs py-1.5 h-9 min-h-0 gap-1">💰 Pay</button>
              <button onClick={() => setShowLog(true)} className="flex-1 btn-ghost   text-xs py-1.5 h-9 min-h-0 gap-1 border border-border-lt">📝 Log</button>
            </div>

            {/* Balance summary */}
            <div className="mt-3 bg-panel-bg border border-border-lt rounded-xl px-3 py-2.5 flex items-center justify-between">
              <div>
                <p className="text-ink-3 text-xs font-medium">Outstanding</p>
                <p className={`font-body font-bold text-lg ${balance > 0 ? 'text-danger' : 'text-success'}`}>
                  {fmt.currency(Math.max(0, balance))}
                </p>
              </div>
              <div className="text-right">
                <p className="text-ink-3 text-xs">Last transaction</p>
                <p className="text-ink text-xs font-medium">{fmt.date(debtor.lastTransactionDate)}</p>
              </div>
            </div>

            {/* Aging alert */}
            {hasOverdue && (
              <div className="mt-2 bg-danger-lt border border-red-200 rounded-lg px-3 py-2 text-xs text-danger font-body font-medium">
                ⛔ Overdue balance in 90+ day bucket — credit sale blocked
              </div>
            )}
          </div>

          {/* Section tabs */}
          <div className="flex border-b border-border-lt px-4 bg-white">
            {[
              { id: 'ledger',  label: `Ledger (${ledger.length})` },
              { id: 'profile', label: 'Profile' },
              { id: 'calls',   label: `Calls (${callingLogs.length})` },
            ].map(({ id, label }) => (
              <button key={id} onClick={() => setSection(id)}
                className={`px-3 py-2.5 text-xs font-body border-b-2 mr-2 transition-all font-medium
                  ${section === id ? 'border-primary text-primary' : 'border-transparent text-ink-3 hover:text-ink'}`}>
                {label}
              </button>
            ))}
          </div>

          {/* Panel body */}
          <div className="flex-1 overflow-y-auto bg-panel-bg">
            {section === 'ledger' && (
              <div className="p-4">
                {ledger.length === 0
                  ? <p className="text-ink-3 text-sm text-center py-10">No transactions yet</p>
                  : <div className="card">{[...ledger].reverse().map((e) => <LedgerEntry key={e.id} entry={e} />)}</div>
                }
              </div>
            )}

            {section === 'profile' && (
              <div className="p-4 space-y-3">
                <div className="card">
                  <h4 className="font-body font-semibold text-ink-2 text-sm mb-3">Contact Details</h4>
                  <dl className="space-y-2 text-sm font-body">
                    <div className="flex justify-between"><dt className="text-ink-3">Phone</dt><dd className="text-ink font-medium">{fmt.phone(debtor.phone)}</dd></div>
                    <div className="flex justify-between"><dt className="text-ink-3">WhatsApp</dt><dd className="text-ink font-medium">{fmt.phone(debtor.whatsapp || debtor.phone)}</dd></div>
                    {debtor.notes && <div><dt className="text-ink-3 block mb-0.5">Notes</dt><dd className="text-ink">{debtor.notes}</dd></div>}
                  </dl>
                </div>

                {(dirProfile || dirLoading) && (
                  <div className="card">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-body font-semibold text-ink-2 text-sm">Devotee Directory</h4>
                      {dirOffline && <span className="badge badge-amber text-xs">Cached</span>}
                    </div>
                    {dirLoading
                      ? <p className="text-ink-3 text-xs">Fetching profile…</p>
                      : dirProfile ? (
                        <dl className="space-y-1.5 text-sm font-body">
                          {dirProfile.initiationName   && <div className="flex justify-between"><dt className="text-ink-3">Initiation Name</dt><dd className="text-ink italic">{dirProfile.initiationName}</dd></div>}
                          {dirProfile.spiritualMaster  && <div className="flex justify-between"><dt className="text-ink-3">Spiritual Master</dt><dd className="text-ink">{dirProfile.spiritualMaster}</dd></div>}
                          {dirProfile.seva             && <div className="flex justify-between"><dt className="text-ink-3">Seva</dt><dd className="text-ink">{dirProfile.seva}</dd></div>}
                          {dirProfile.address          && <div><dt className="text-ink-3 block mb-0.5">Address</dt><dd className="text-ink">{dirProfile.address}</dd></div>}
                        </dl>
                      ) : <p className="text-ink-3 text-xs">Not found in directory</p>
                    }
                  </div>
                )}

                {isSuperAdmin && (
                  <div className="card">
                    <h4 className="font-body font-semibold text-ink-2 text-sm mb-2">Admin Info</h4>
                    <p className="text-ink-3 text-xs">Credit Limit: <span className="text-ink font-medium">{debtor.creditLimit > 0 ? fmt.currency(debtor.creditLimit) : 'No Limit'}</span></p>
                    <p className="text-ink-3 text-xs mt-1">Created: <span className="text-ink font-medium">{fmt.date(debtor.createdAt)}</span></p>
                  </div>
                )}
              </div>
            )}

            {section === 'calls' && (
              <div className="p-4">
                {callingLogs.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-ink-3 text-sm mb-3">No interactions logged</p>
                    <button onClick={() => setShowLog(true)} className="btn-primary text-sm inline-flex">Log Interaction</button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {callingLogs.map((log) => (
                      <div key={log.id} className="card">
                        <div className="flex items-center justify-between">
                          <span className="badge badge-blue text-xs capitalize">{log.status?.replace(/-/g, ' ')}</span>
                          <span className="text-ink-4 text-xs">{fmt.dateTime(log.date)}</span>
                        </div>
                        <p className="text-ink text-xs mt-1.5">{log.notes || '—'}</p>
                        {log.followUpDate && <p className="text-primary text-xs mt-1 font-medium">↩ Follow-up: {log.followUpDate}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <ReceivePaymentModal isOpen={showPay} onClose={() => setShowPay(false)} debtor={debtor} />
      <CallingLogModal    isOpen={showLog} onClose={() => setShowLog(false)} debtor={debtor} callingLogs={callingLogs} />
    </>
  )
}
