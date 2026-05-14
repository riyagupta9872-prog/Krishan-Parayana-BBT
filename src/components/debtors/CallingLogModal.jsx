import { useState } from 'react'
import Modal from '../common/Modal'
import { useAuth } from '../../context/AuthContext'
import { useApp } from '../../context/AppContext'
import { debtorService } from '../../services/debtorService'
import { fmt } from '../../utils/formatters'

const METHODS  = ['Call', 'WhatsApp', 'In-Person', 'SMS']
const STATUSES = ['Reached', 'Not Reachable', 'Call Back Later', 'Promised Payment', 'Payment Arranged', 'Dispute Raised']
const METHOD_ICON = { Call: '📞', WhatsApp: '💬', 'In-Person': '🤝', SMS: '💌' }

const STATUS_BADGE = {
  'reached': 'badge-green', 'not-reachable': 'badge-gray',
  'promised-payment': 'badge-blue', 'payment-arranged': 'badge-green',
  'dispute-raised': 'badge-red', 'callback-later': 'badge-amber',
}

export default function CallingLogModal({ isOpen, onClose, debtor, callingLogs = [] }) {
  const { user } = useAuth()
  const { showToast } = useApp()
  const [method,   setMethod]   = useState('Call')
  const [status,   setStatus]   = useState('Reached')
  const [notes,    setNotes]    = useState('')
  const [followUp, setFollowUp] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [view,     setView]     = useState('log')

  const handleSubmit = async () => {
    setLoading(true)
    try {
      await debtorService.addCallingLog(debtor.id, {
        method: method.toLowerCase().replace(' ', '-'),
        status: status.toLowerCase().replace(/ /g, '-'),
        notes, followUpDate: followUp || null,
      }, user.uid)
      showToast('Interaction logged', 'success')
      setNotes(''); setFollowUp(''); setView('history')
    } catch (err) { showToast(err.message, 'error') }
    finally { setLoading(false) }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Calling Log — ${debtor?.name}`} size="lg">
      <div className="space-y-4">
        {/* View switcher */}
        <div className="flex gap-1 bg-panel-bg rounded-xl p-1">
          {['log', 'history'].map((v) => (
            <button key={v} onClick={() => setView(v)}
              className={`flex-1 py-2 rounded-lg text-xs font-body font-semibold transition-all
                ${view === v ? 'bg-white text-primary shadow-sm border border-border-lt' : 'text-ink-3'}`}>
              {v === 'log' ? '+ Log New Interaction' : `History (${callingLogs.length})`}
            </button>
          ))}
        </div>

        {view === 'log' ? (
          <div className="space-y-3">
            <div>
              <label className="label">Contact Method</label>
              <div className="flex gap-2 flex-wrap">
                {METHODS.map((m) => (
                  <button key={m} onClick={() => setMethod(m)}
                    className={`flex-1 py-2 rounded-lg text-sm font-body font-medium border transition-all
                      ${method === m ? 'bg-primary text-white border-primary' : 'bg-white border-border-lt text-ink-3 hover:border-border-blue'}`}>
                    {METHOD_ICON[m]} {m}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Call Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="select-field">
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className="label">Notes (max 500 chars)</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value.slice(0, 500))} className="input-field resize-none" rows={3} placeholder="Summary of conversation…" />
              <p className="text-ink-4 text-xs mt-1 text-right">{notes.length}/500</p>
            </div>

            <div>
              <label className="label">Follow-up Date</label>
              <input type="date" value={followUp} onChange={(e) => setFollowUp(e.target.value)} className="input-field" />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button onClick={onClose} className="btn-secondary">Cancel</button>
              <button onClick={handleSubmit} disabled={loading} className="btn-primary">{loading ? 'Saving…' : 'Save Log'}</button>
            </div>
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {callingLogs.length === 0 ? (
              <p className="text-ink-3 text-sm text-center py-8">No interactions logged yet</p>
            ) : (
              callingLogs.map((log) => (
                <div key={log.id} className="card">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`badge text-xs ${STATUS_BADGE[log.status] || 'badge-gray'} capitalize`}>
                      {log.status?.replace(/-/g, ' ')}
                    </span>
                    <span className="text-ink-4 text-xs">{fmt.dateTime(log.date)}</span>
                  </div>
                  <p className="text-ink text-xs mt-1">{log.notes || '—'}</p>
                  {log.followUpDate && (
                    <p className="text-primary text-xs mt-1 font-medium">↩ Follow-up: {log.followUpDate}</p>
                  )}
                  <p className="text-ink-4 text-xs mt-0.5 capitalize">via {log.method?.replace(/-/g, ' ')}</p>
                </div>
              ))
            )}
            <div className="pt-2 flex justify-end">
              <button onClick={onClose} className="btn-secondary text-sm">Close</button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
