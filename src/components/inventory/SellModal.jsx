import { useState, useEffect } from 'react'
import Modal from '../common/Modal'
import { useAuth } from '../../context/AuthContext'
import { useApp } from '../../context/AppContext'
import { transactionService } from '../../services/transactionService'
import { debtorService } from '../../services/debtorService'
import { fmt } from '../../utils/formatters'
import { computeAgingForDebtor } from '../../utils/agingUtils'

export default function SellModal({ isOpen, onClose, item }) {
  const { user, isSuperAdmin } = useAuth()
  const { showToast } = useApp()
  const [qty, setQty] = useState(1)
  const [saleType, setSaleType] = useState('cash')
  const [debtorId, setDebtorId] = useState('')
  const [debtors, setDebtors] = useState([])
  const [debtorWarning, setDebtorWarning] = useState(null)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) { setQty(1); setSaleType('cash'); setDebtorId(''); setNotes(''); setDebtorWarning(null) }
  }, [isOpen])

  useEffect(() => {
    if (saleType === 'credit') {
      debtorService.getAll().then((list) =>
        setDebtors(list.filter((d) => d.status !== 'blocked' || isSuperAdmin))
      )
    }
  }, [saleType, isSuperAdmin])

  useEffect(() => {
    if (debtorId && saleType === 'credit') checkDebtorAging(debtorId)
    else setDebtorWarning(null)
  }, [debtorId])

  async function checkDebtorAging(id) {
    const ledger = await debtorService.getLedger(id)
    const { buckets } = computeAgingForDebtor(ledger)
    const over90 = (buckets.days90_120 || 0) + (buckets.days120plus || 0)
    if (over90 > 0) setDebtorWarning({ type: 'block', amount: over90 })
    else if (buckets.days60_90 > 0) setDebtorWarning({ type: 'orange', amount: buckets.days60_90 })
    else if (buckets.days30_60 > 0) setDebtorWarning({ type: 'yellow', amount: buckets.days30_60 })
    else setDebtorWarning(null)
  }

  const unitPrice = item?.sellingPrice || 0
  const lineTotal = unitPrice * qty

  const handleConfirm = async () => {
    if (!item) return
    if (qty < 1 || qty > item.qty) { showToast('Invalid quantity', 'error'); return }
    if (saleType === 'credit' && !debtorId) { showToast('Please select a debtor', 'error'); return }
    if (debtorWarning?.type === 'block' && !isSuperAdmin) { showToast('Credit sale blocked — 90+ day overdue balance', 'error'); return }
    setLoading(true)
    try {
      await transactionService.confirmSale({
        items: [{ skuId: item.id, name: item.name, qty, unitPrice, lineTotal }],
        totalAmount: lineTotal, saleType,
        debtorId: saleType === 'credit' ? debtorId : null, notes,
      }, user.uid, user.displayName || user.email)
      showToast(`Sale confirmed — ${item.name} ×${qty}`, 'success')
      onClose()
    } catch (err) { showToast(err.message || 'Sale failed', 'error') }
    finally { setLoading(false) }
  }

  if (!item) return null
  const isOut  = item.qty === 0
  const isLow  = item.qty <= (item.lowStockThreshold || 5)

  const SALE_TYPES = [
    { key: 'cash',   label: '💵 Cash',   cls: 'text-success' },
    { key: 'credit', label: '📋 Credit', cls: 'text-primary' },
    { key: 'gift',   label: '🎁 Gift',   cls: 'text-warning' },
  ]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Sell Item" size="md"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button
            onClick={handleConfirm}
            disabled={loading || isOut || (debtorWarning?.type === 'block' && !isSuperAdmin)}
            className="btn-primary"
          >
            {loading ? 'Processing…' : `Confirm — ${fmt.currency(lineTotal)}`}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Item info */}
        <div className="card-blue flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0
            ${item.category === 'Book' ? 'bg-violet-100' : item.group === 'apparel' ? 'bg-blue-100' : 'bg-sky-100'}`}>
            {item.category === 'Book' ? '📚' : item.group === 'apparel' ? '👘' : '📿'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-ink font-body font-semibold text-sm">{item.name}</p>
            <p className="text-ink-3 text-xs">{item.category} · {item.subCategory}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="font-body font-bold text-primary">{fmt.currency(item.sellingPrice)}</p>
            <p className={`text-xs font-body font-medium ${isOut ? 'text-danger' : isLow ? 'text-warning' : 'text-success'}`}>
              {isOut ? 'Out of Stock' : `${item.qty} available`}
            </p>
          </div>
        </div>

        {isOut && (
          <div className="bg-danger-lt border border-red-200 rounded-lg p-3">
            <p className="text-danger text-sm font-body font-semibold">This item is out of stock.</p>
          </div>
        )}

        {/* Qty picker */}
        <div>
          <label className="label">Quantity</label>
          <div className="flex items-center gap-3">
            <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="btn-secondary w-10 h-10 p-0 text-lg rounded-lg">−</button>
            <input
              type="number" value={qty}
              onChange={(e) => setQty(Math.max(1, Math.min(item.qty, Number(e.target.value))))}
              className="input-field text-center w-20 text-lg font-bold"
              min={1} max={item.qty}
            />
            <button onClick={() => setQty((q) => Math.min(item.qty, q + 1))} className="btn-secondary w-10 h-10 p-0 text-lg rounded-lg">+</button>
            <div className="flex-1 text-right">
              <p className="text-ink-3 text-xs">Total</p>
              <p className="font-body font-bold text-primary text-lg">{fmt.currency(lineTotal)}</p>
            </div>
          </div>
        </div>

        {/* Sale type */}
        <div>
          <label className="label">Payment Type</label>
          <div className="flex gap-2">
            {SALE_TYPES.map(({ key, label, cls }) => (
              <button key={key} onClick={() => setSaleType(key)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-body font-medium border transition-all
                  ${saleType === key
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'bg-white border-border-lt text-ink-3 hover:border-border-blue'
                  }`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Debtor selector */}
        {saleType === 'credit' && (
          <div>
            <label className="label">Assign to Debtor</label>
            <select value={debtorId} onChange={(e) => setDebtorId(e.target.value)} className="select-field">
              <option value="">— Select Debtor —</option>
              {debtors.map((d) => (
                <option key={d.id} value={d.id}>{d.name} — {fmt.currency(d.currentBalance || 0)} outstanding</option>
              ))}
            </select>
            {debtorWarning && (
              <div className={`mt-2 p-3 rounded-lg border text-sm font-body
                ${debtorWarning.type === 'block'  ? 'bg-danger-lt border-red-200 text-danger' :
                  debtorWarning.type === 'orange' ? 'bg-orange-50 border-orange-200 text-orange-700' :
                  'bg-warning-lt border-amber-200 text-warning'}`}>
                {debtorWarning.type === 'block'
                  ? `⛔ Overdue ${fmt.currency(debtorWarning.amount)} (90+ days). ${isSuperAdmin ? 'Override active.' : 'Credit sale blocked.'}`
                  : `⚠ ${fmt.currency(debtorWarning.amount)} overdue. Follow up recommended.`
                }
              </div>
            )}
          </div>
        )}

        <div>
          <label className="label">Notes (Optional)</label>
          <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className="input-field" placeholder="Optional remarks" />
        </div>
      </div>
    </Modal>
  )
}
