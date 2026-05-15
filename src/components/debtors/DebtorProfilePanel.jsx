import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { debtorService } from '../../services/debtorService'
import { lookupDevoteeByPhone } from '../../services/directoryService'
import { fmt } from '../../utils/formatters'
import { computeAgingForDebtor } from '../../utils/agingUtils'
import DevoteeDirectoryModal from './DevoteeDirectoryModal'
import ReceivePaymentModal from './ReceivePaymentModal'
import CallingLogModal from './CallingLogModal'

/* ── Ledger entry row ──────────────────────────────────────────────*/
function LedgerEntry({ entry }) {
  const isDebit = entry.type === 'debit' || entry.type === 'opening'
  const typeClr = {
    debit: 'text-danger', opening: 'text-warning', credit: 'text-success',
    'write-off': 'text-ink-3', gift: 'text-primary', adjustment: 'text-warning',
  }
  const billBadge = {
    'open':           'badge-red',
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
        <p className={`font-semibold text-sm ${typeClr[entry.type] || 'text-ink'}`}>
          {isDebit ? '+' : '−'}{fmt.currency(entry.amount)}
        </p>
        <p className="text-ink-4 text-xs">Bal: {fmt.currency(entry.runningBalance)}</p>
      </div>
    </div>
  )
}

/* ── Main panel ────────────────────────────────────────────────────*/
export default function DebtorProfilePanel({ debtor, onClose }) {
  const { isSuperAdmin } = useAuth()
  const [ledger,      setLedger]      = useState([])
  const [callingLogs, setCallingLogs] = useState([])
  const [dirProfile,  setDirProfile]  = useState(null)
  const [dirLoading,  setDirLoading]  = useState(true)
  const [section,     setSection]     = useState('ledger')
  const [showPay,     setShowPay]     = useState(false)
  const [showLog,     setShowLog]     = useState(false)
  const [showDir,     setShowDir]     = useState(false)

  useEffect(() => {
    if (!debtor) return
    const u1 = debtorService.subscribeLedger(debtor.id, setLedger)
    const u2 = debtorService.subscribeCallingLog(debtor.id, setCallingLogs)
    // Fetch from Sakhi Sang directory
    setDirLoading(true)
    lookupDevoteeByPhone(debtor.phone)
      .then(setDirProfile)
      .catch(() => setDirProfile(null))
      .finally(() => setDirLoading(false))
    return () => { u1(); u2() }
  }, [debtor?.id])

  if (!debtor) return null

  const { buckets } = computeAgingForDebtor(ledger)
  const hasOverdue  = (buckets.days90_120 || 0) + (buckets.days120plus || 0) > 0
  const balance     = debtor.currentBalance || 0
  const initials    = debtor.name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()

  const STATUS_CLR = { active: 'badge-blue', settled: 'badge-green', blocked: 'badge-red', credit: 'badge-amber' }

  return (
    <>
      <div className="fixed inset-0 z-40 flex justify-end">
        <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />

        <div className="relative w-full max-w-md h-full bg-white border-l border-border-lt shadow-modal flex flex-col animate-slide-in">

          {/* ── Panel header ─────────────────────────────────────── */}
          <div className="bg-gradient-to-br from-primary to-primary-dk px-4 pt-4 pb-3 shrink-0">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <button onClick={() => setShowDir(true)}
                  className="w-12 h-12 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center hover:bg-white/30 transition-all group relative"
                  title="View full devotee profile">
                  {dirProfile?.photo
                    ? <img src={dirProfile.photo} alt="" className="w-full h-full rounded-full object-cover" />
                    : <span className="font-display text-white font-bold text-sm">{initials}</span>
                  }
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center text-xs shadow-sm text-primary opacity-0 group-hover:opacity-100 transition-opacity">👤</span>
                </button>

                <div>
                  <h3 className="font-display text-white font-bold text-sm">{debtor.name}</h3>
                  {/* Directory info shown inline */}
                  {!dirLoading && dirProfile?.teamName && (
                    <span className="text-white/80 text-xs bg-white/15 px-2 py-0.5 rounded-pill mr-1">
                      {dirProfile.teamName}
                    </span>
                  )}
                  {!dirLoading && dirProfile?.devoteeStatus && (
                    <span className="text-white/70 text-xs">{dirProfile.devoteeStatus}</span>
                  )}
                  <span className={`badge text-xs mt-0.5 block ${STATUS_CLR[debtor.status] || 'badge-gray'}`} style={{display:'inline-block'}}>
                    {debtor.status}
                  </span>
                </div>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center text-sm font-bold">✕</button>
            </div>

            {/* Phone + reference row */}
            <div className="bg-white/10 rounded-xl px-3 py-2.5 space-y-1.5">
              <div className="flex items-center gap-3">
                <button onClick={() => window.open(`tel:${debtor.phone}`)}
                  className="w-8 h-8 rounded-full bg-white/20 hover:bg-green-400/40 flex items-center justify-center text-sm transition-all">📞</button>
                <button onClick={() => window.open(`https://wa.me/${debtor.whatsapp || debtor.phone}`)}
                  className="w-8 h-8 rounded-full bg-white/20 hover:bg-green-500/40 flex items-center justify-center text-sm transition-all">💬</button>
                <div>
                  <p className="text-white font-semibold text-sm">{fmt.phone(debtor.phone)}</p>
                  {debtor.whatsapp && debtor.whatsapp !== debtor.phone && (
                    <p className="text-white/60 text-xs">WA: {fmt.phone(debtor.whatsapp)}</p>
                  )}
                </div>
                {dirLoading && <div className="ml-auto w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin" />}
              </div>

              {/* Reference by — from directory */}
              {!dirLoading && dirProfile?.referenceBy && (
                <div className="flex items-center gap-2 pt-1 border-t border-white/10">
                  <span className="text-white/50 text-xs">Referred by:</span>
                  <span className="text-white text-xs font-semibold">{dirProfile.referenceBy}</span>
                </div>
              )}
              {!dirLoading && dirProfile?.facilitator && (
                <div className="flex items-center gap-2">
                  <span className="text-white/50 text-xs">Facilitator:</span>
                  <span className="text-white text-xs font-semibold">{dirProfile.facilitator}</span>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 mt-2.5">
              <button onClick={() => setShowPay(true)} className="flex-1 bg-white text-primary text-xs font-semibold py-2 rounded-lg hover:bg-white/90 transition-all">💰 Pay</button>
              <button onClick={() => setShowLog(true)} className="flex-1 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold py-2 rounded-lg transition-all">📝 Log Call</button>
              <button onClick={() => setShowDir(true)} className="flex-1 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold py-2 rounded-lg transition-all">👤 Profile</button>
            </div>

            {/* Balance bar */}
            <div className="mt-2.5 bg-white/10 rounded-xl px-3 py-2 flex items-center justify-between">
              <div>
                <p className="text-white/60 text-xs">Outstanding Balance</p>
                <p className={`font-bold text-lg ${balance > 0 ? 'text-red-200' : 'text-green-200'}`}>
                  {fmt.currency(Math.abs(balance))}
                  {balance < 0 && <span className="text-xs font-normal ml-1">(credit)</span>}
                </p>
              </div>
              <div className="text-right">
                <p className="text-white/60 text-xs">Last transaction</p>
                <p className="text-white text-xs font-medium">{fmt.date(debtor.lastTransactionDate)}</p>
              </div>
            </div>

            {hasOverdue && (
              <div className="mt-2 bg-red-500/30 border border-red-300/40 rounded-lg px-3 py-1.5">
                <p className="text-red-100 text-xs font-semibold">⛔ 90+ day overdue — credit sale blocked</p>
              </div>
            )}
          </div>

          {/* ── Section tabs ──────────────────────────────────────── */}
          <div className="flex border-b border-border-lt bg-white shrink-0">
            {[
              { id: 'ledger',  label: `Ledger (${ledger.length})` },
              { id: 'calls',   label: `Calls (${callingLogs.length})` },
              { id: 'info',    label: 'Info' },
            ].map(({ id, label }) => (
              <button key={id} onClick={() => setSection(id)}
                className={`flex-1 py-2.5 text-xs font-body font-semibold border-b-2 transition-all
                  ${section === id ? 'border-primary text-primary' : 'border-transparent text-ink-3 hover:text-ink'}`}>
                {label}
              </button>
            ))}
          </div>

          {/* ── Panel body ───────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto bg-panel-bg">
            {section === 'ledger' && (
              <div className="p-4">
                {ledger.length === 0
                  ? <div className="text-center py-10"><p className="text-3xl mb-2">📋</p><p className="text-ink-3 text-sm">No transactions yet</p></div>
                  : <div className="card">{[...ledger].reverse().map((e) => <LedgerEntry key={e.id} entry={e} />)}</div>
                }
              </div>
            )}

            {section === 'calls' && (
              <div className="p-4">
                {callingLogs.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-3xl mb-2">📞</p>
                    <p className="text-ink-3 text-sm mb-3">No calls logged</p>
                    <button onClick={() => setShowLog(true)} className="btn-primary text-sm inline-flex">Log Interaction</button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {callingLogs.map((log) => {
                      const STATUS_BADGE_CLR = {
                        'reached': 'badge-green', 'not-reachable': 'badge-gray',
                        'promised-payment': 'badge-blue', 'payment-arranged': 'badge-green',
                        'dispute-raised': 'badge-red', 'callback-later': 'badge-amber',
                      }
                      return (
                        <div key={log.id} className="card">
                          <div className="flex items-center justify-between">
                            <span className={`badge text-xs capitalize ${STATUS_BADGE_CLR[log.status] || 'badge-gray'}`}>
                              {log.status?.replace(/-/g, ' ')}
                            </span>
                            <span className="text-ink-4 text-xs">{fmt.dateTime(log.date)}</span>
                          </div>
                          <p className="text-ink text-xs mt-1.5">{log.notes || '—'}</p>
                          {log.followUpDate && <p className="text-primary text-xs mt-1 font-medium">↩ Follow-up: {log.followUpDate}</p>}
                          <p className="text-ink-4 text-xs mt-0.5 capitalize">via {log.method?.replace(/-/g, ' ')}</p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {section === 'info' && (
              <div className="p-4 space-y-3">
                {/* SCIAMS data */}
                <div className="card">
                  <h4 className="font-semibold text-ink-2 text-sm mb-3 flex items-center gap-2">💳 Account Info</h4>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between"><dt className="text-ink-3">Phone</dt><dd className="text-ink font-medium">{fmt.phone(debtor.phone)}</dd></div>
                    <div className="flex justify-between"><dt className="text-ink-3">WhatsApp</dt><dd className="text-ink font-medium">{fmt.phone(debtor.whatsapp || debtor.phone)}</dd></div>
                    {isSuperAdmin && <div className="flex justify-between"><dt className="text-ink-3">Credit Limit</dt><dd className="text-ink font-medium">{debtor.creditLimit > 0 ? fmt.currency(debtor.creditLimit) : 'No Limit'}</dd></div>}
                    {debtor.notes && <div><dt className="text-ink-3 block mb-0.5">Notes</dt><dd className="text-ink">{debtor.notes}</dd></div>}
                    <div className="flex justify-between"><dt className="text-ink-3">Added on</dt><dd className="text-ink">{fmt.date(debtor.createdAt)}</dd></div>
                  </dl>
                </div>

                {/* Directory quick-view */}
                {!dirLoading && dirProfile && (
                  <div className="card border-border-blue bg-primary-lt">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-primary text-sm flex items-center gap-2">📂 Directory Profile</h4>
                      <button onClick={() => setShowDir(true)} className="text-primary text-xs font-semibold underline">View Full →</button>
                    </div>
                    <dl className="space-y-1.5 text-sm">
                      {dirProfile.teamName      && <div className="flex justify-between"><dt className="text-ink-3">Team</dt><dd className="text-ink font-medium">{dirProfile.teamName}</dd></div>}
                      {dirProfile.devoteeStatus && <div className="flex justify-between"><dt className="text-ink-3">Status</dt><dd className="text-ink font-medium">{dirProfile.devoteeStatus}</dd></div>}
                      {dirProfile.referenceBy   && <div className="flex justify-between"><dt className="text-ink-3">Referred By</dt><dd className="text-primary font-semibold">{dirProfile.referenceBy}</dd></div>}
                      {dirProfile.facilitator   && <div className="flex justify-between"><dt className="text-ink-3">Facilitator</dt><dd className="text-ink font-medium">{dirProfile.facilitator}</dd></div>}
                      {dirProfile.chantingRounds > 0 && <div className="flex justify-between"><dt className="text-ink-3">Chanting</dt><dd className="text-ink font-medium">{dirProfile.chantingRounds} rounds</dd></div>}
                      {dirProfile.address       && <div><dt className="text-ink-3 block mb-0.5">Address</dt><dd className="text-ink">{dirProfile.address}</dd></div>}
                    </dl>
                  </div>
                )}
                {!dirLoading && !dirProfile && (
                  <div className="card border-dashed text-center py-4">
                    <p className="text-ink-4 text-xs">Not found in Sakhi Sang directory</p>
                    <button onClick={() => setShowDir(true)} className="text-primary text-xs font-semibold mt-1">Search again →</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sub-modals */}
      <ReceivePaymentModal   isOpen={showPay} onClose={() => setShowPay(false)} debtor={debtor} />
      <CallingLogModal       isOpen={showLog} onClose={() => setShowLog(false)} debtor={debtor} callingLogs={callingLogs} />
      {showDir && <DevoteeDirectoryModal phone={debtor.phone} name={debtor.name} onClose={() => setShowDir(false)} />}
    </>
  )
}
