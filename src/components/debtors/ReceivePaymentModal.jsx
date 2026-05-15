import { useState } from 'react'
import Modal from '../common/Modal'
import { useAuth } from '../../context/AuthContext'
import { useApp } from '../../context/AppContext'
import { debtorService } from '../../services/debtorService'
import { fmt } from '../../utils/formatters'

const MODES = ['Cash', 'UPI', 'Bank Transfer', 'Other']
const MODE_ICONS = { Cash: '💵', UPI: '📱', 'Bank Transfer': '🏦', Other: '💳' }

export default function ReceivePaymentModal({ isOpen, onClose, debtor }) {
  const { user } = useAuth()
  const { showToast } = useApp()
  const [amount,    setAmount]    = useState('')
  const [mode,      setMode]      = useState('Cash')
  const [reference, setReference] = useState('')
  const [loading,   setLoading]   = useState(false)

  const outstanding = debtor?.currentBalance || 0
  const needsRef = mode === 'UPI' || mode === 'Bank Transfer'

  const handleConfirm = async () => {
    if (!amount || Number(amount) <= 0) { showToast('Enter a valid amount', 'error'); return }
    if (needsRef && !reference.trim()) { showToast(`Reference required for ${mode}`, 'error'); return }
    setLoading(true)
    try {
      await debtorService.receivePayment(debtor.id, { amount: Number(amount), mode, reference }, user.uid)
      const msg = `🙏 Hare Krishna!\n\nPayment Received\nDevotee: ${debtor.name}\nAmount: ${fmt.currency(amount)}\nMode: ${mode}${reference ? `\nRef: ${reference}` : ''}\nDate: ${new Date().toLocaleDateString('en-IN')}\n\nRemaining Balance: ${fmt.currency(Math.max(0, outstanding - Number(amount)))}\n\nDas ka das 🙏`
      showToast('Payment recorded', 'success')
      window.open(`https://wa.me/6280263642?text=${encodeURIComponent(msg)}`, '_blank')
      setAmount(''); setMode('Cash'); setReference(''); onClose()
    } catch (err) { showToast(err.message || 'Failed', 'error') }
    finally { setLoading(false) }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Receive Payment" size="md"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleConfirm} disabled={loading} className="btn-success">
            {loading ? 'Processing…' : 'Record Payment'}
          </button>
        </>
      }>
      {debtor && (
        <div className="space-y-4">
          {/* Debtor info */}
          <div className="card-blue">
            <p className="text-ink font-body font-semibold">{debtor.name}</p>
            <p className="text-ink-3 text-sm">{fmt.phone(debtor.phone)}</p>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="text-ink-3 text-sm">Outstanding:</span>
              <span className="font-body font-bold text-danger text-lg">{fmt.currency(outstanding)}</span>
            </div>
          </div>

          <div>
            <label className="label">Amount Received (₹) *</label>
            <input
              type="number" value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onFocus={(e) => e.target.select()}
              className="input-field text-lg font-semibold" placeholder="0"
              min={1}
            />
            {amount && Number(amount) > outstanding && (
              <p className="text-warning text-xs mt-1 font-body">⚠ Amount exceeds outstanding — will create credit balance</p>
            )}
          </div>

          <div>
            <label className="label">Payment Mode *</label>
            <div className="grid grid-cols-2 gap-2">
              {MODES.map((m) => (
                <button key={m} onClick={() => setMode(m)}
                  className={`py-2.5 rounded-lg text-sm font-body font-medium border transition-all flex items-center justify-center gap-2
                    ${mode === m ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white border-border-lt text-ink-3 hover:border-border-blue'}`}>
                  {MODE_ICONS[m]} {m}
                </button>
              ))}
            </div>
          </div>

          {needsRef && (
            <div>
              <label className="label">Reference / UTR Number *</label>
              <input value={reference} onChange={(e) => setReference(e.target.value)} className="input-field"
                placeholder={mode === 'UPI' ? '12-digit UTR' : 'Transaction reference'} />
            </div>
          )}

          <div className="card-blue text-xs text-ink-3 font-body">
            After confirming, a pre-filled WhatsApp message will open to notify the admin. Please tap <strong>Send</strong> manually.
          </div>
        </div>
      )}
    </Modal>
  )
}
