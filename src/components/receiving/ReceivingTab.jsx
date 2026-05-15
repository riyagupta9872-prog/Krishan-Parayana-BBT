import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useApp } from '../../context/AppContext'
import { receivingService } from '../../services/receivingService'
import { inventoryService } from '../../services/inventoryService'
import { useFirestoreSubscription } from '../../hooks/useFirestore'
import { fmt } from '../../utils/formatters'
import { PageLoader } from '../common/LoadingSpinner'
import FirestoreRulesAlert from '../common/FirestoreRulesAlert'
import Modal from '../common/Modal'

function RecordReceivingModal({ isOpen, onClose, inventory, isSuperAdmin }) {
  const { user } = useAuth()
  const { showToast } = useApp()
  const [itemId,      setItemId]      = useState('')
  const [qty,         setQty]         = useState('')
  const [costPerUnit, setCostPerUnit] = useState('')
  const [supplier,    setSupplier]    = useState('')
  const [invoiceRef,  setInvoiceRef]  = useState('')
  const [notes,       setNotes]       = useState('')
  const [loading,     setLoading]     = useState(false)

  const selectedItem = inventory.find((i) => i.id === itemId)

  const handleSubmit = async () => {
    if (!itemId) { showToast('Select an item', 'error'); return }
    if (!qty || Number(qty) <= 0) { showToast('Enter valid quantity', 'error'); return }
    setLoading(true)
    try {
      await receivingService.record({
        itemId, itemName: selectedItem.name,
        qtyReceived: Number(qty),
        costPerUnit: isSuperAdmin ? Number(costPerUnit || 0) : 0,
        supplier, invoiceRef, notes,
      }, user.uid, user.displayName || user.email)
      showToast(`Received ${qty} × ${selectedItem.name}`, 'success')
      setItemId(''); setQty(''); setCostPerUnit(''); setSupplier(''); setInvoiceRef(''); setNotes('')
      onClose()
    } catch (err) { showToast(err.message || 'Failed', 'error') }
    finally { setLoading(false) }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Stock Receiving" size="md"
      footer={<><button onClick={onClose} className="btn-secondary">Cancel</button><button onClick={handleSubmit} disabled={loading} className="btn-primary">{loading?'Saving…':'Record Receiving'}</button></>}>
      <div className="space-y-3">
        <div>
          <label className="label">Item *</label>
          <select value={itemId} onChange={(e)=>setItemId(e.target.value)} className="select-field">
            <option value="">— Select Item —</option>
            {inventory.filter(i=>i.status!=='out-of-print').map(i=>(
              <option key={i.id} value={i.id}>{i.name} (stock: {i.qty})</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Qty Received *</label>
            <input type="number" value={qty} onChange={(e)=>setQty(e.target.value)} onFocus={(e)=>e.target.select()} className="input-field" min={1} />
          </div>
          {isSuperAdmin && (
            <div>
              <label className="label">Cost Per Unit (₹)</label>
              <input type="number" value={costPerUnit} onChange={(e)=>setCostPerUnit(e.target.value)} onFocus={(e)=>e.target.select()} className="input-field" min={0} />
              {selectedItem && Number(costPerUnit) > selectedItem.sellingPrice && (
                <p className="text-danger text-xs mt-1">⚠ Cost exceeds selling price</p>
              )}
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Supplier</label><input value={supplier} onChange={(e)=>setSupplier(e.target.value)} className="input-field" /></div>
          <div><label className="label">Invoice / Challan No.</label><input value={invoiceRef} onChange={(e)=>setInvoiceRef(e.target.value)} className="input-field" /></div>
        </div>
        <div><label className="label">Notes</label><input value={notes} onChange={(e)=>setNotes(e.target.value)} className="input-field" /></div>
      </div>
    </Modal>
  )
}

export default function ReceivingTab() {
  const { isSuperAdmin } = useAuth()
  const [showAdd, setShowAdd] = useState(false)

  const { data: entries,   loading: l1, error  } = useFirestoreSubscription((cb,e) => receivingService.subscribe(cb,e))
  const { data: inventory, loading: l2 }          = useFirestoreSubscription((cb,e) => inventoryService.subscribe(cb,e))

  if (l1 || l2) return <PageLoader />

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-4">
      <FirestoreRulesAlert error={error} />

      <div className="flex items-center justify-between">
        <h2 className="page-title">Stock Receiving</h2>
        <button onClick={()=>setShowAdd(true)} className="btn-primary text-sm px-4">+ Record Receiving</button>
      </div>

      {entries.length === 0 ? (
        <div className="card text-center py-14 border-dashed">
          <p className="text-4xl mb-3">📦</p>
          <p className="text-ink-3 text-sm">No receiving entries yet.</p>
          <button onClick={()=>setShowAdd(true)} className="btn-primary text-sm mt-4 inline-flex">Record First Entry</button>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((e) => (
            <div key={e.id} className="card hover:shadow-card-hover transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-lt border border-border-blue flex items-center justify-center text-xl shrink-0">📦</div>
                  <div>
                    <p className="text-ink font-semibold text-sm">{e.itemName}</p>
                    <p className="text-ink-3 text-xs">{fmt.date(e.date)}</p>
                    {e.supplier   && <p className="text-ink-4 text-xs">Supplier: {e.supplier}</p>}
                    {e.invoiceRef && <p className="text-ink-4 text-xs">Invoice: {e.invoiceRef}</p>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-success text-base">+{e.qtyReceived} units</p>
                  {isSuperAdmin && e.costPerUnit > 0 && (
                    <><p className="text-ink-3 text-xs">{fmt.currency(e.costPerUnit)}/unit</p><p className="text-primary text-xs font-medium">Total: {fmt.currency(e.totalCost)}</p></>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <RecordReceivingModal isOpen={showAdd} onClose={()=>setShowAdd(false)} inventory={inventory} isSuperAdmin={isSuperAdmin} />
    </div>
  )
}
