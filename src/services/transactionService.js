import {
  collection, doc, addDoc, updateDoc, getDocs, getDoc,
  onSnapshot, serverTimestamp, query, orderBy, writeBatch, increment, limit
} from 'firebase/firestore'
import { db } from './firebase'
import { debtorService } from './debtorService'
import { auditService } from './auditService'

const COL = 'transactions'
let txnCounter = 0

function generateTxnId() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  return `TXN-${date}-${String(++txnCounter).padStart(4, '0')}`
}

export const transactionService = {
  subscribe(callback, onError, limitCount = 50) {
    const q = query(collection(db, COL), orderBy('date', 'desc'), limit(limitCount))
    return onSnapshot(
      q,
      (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => { console.error('transactions subscribe:', err); callback([]); onError?.(err) }
    )
  },

  async confirmSale(saleData, uid, displayName) {
    const batch = writeBatch(db)
    const txnRef = doc(collection(db, COL))

    batch.set(txnRef, {
      id: generateTxnId(),
      date: serverTimestamp(),
      items: saleData.items,
      totalAmount: saleData.totalAmount,
      saleType: saleData.saleType,
      debtorId: saleData.debtorId || null,
      status: 'completed',
      notes: saleData.notes || '',
      enteredBy: `${uid}|${displayName}`,
    })

    for (const item of saleData.items) {
      batch.update(doc(db, 'inventory', item.skuId), {
        qty: increment(-item.qty), updatedAt: serverTimestamp(),
      })
    }

    await batch.commit()

    if (saleData.saleType === 'credit' && saleData.debtorId) {
      const desc = saleData.items.map((i) => `${i.name} ×${i.qty}`).join(', ')
      await debtorService.addLedgerEntry(saleData.debtorId, {
        type: 'debit', description: desc,
        amount: saleData.totalAmount,
        relatedTxnId: txnRef.id,
        enteredBy: `${uid}|${displayName}`,
      })
    }

    return txnRef
  },

  async voidTransaction(txnId, reason, uid, displayName) {
    const txnRef = doc(db, COL, txnId)
    const txnSnap = await getDoc(txnRef)
    if (!txnSnap.exists()) throw new Error('Transaction not found')
    const txn = txnSnap.data()
    if (txn.status === 'voided') throw new Error('Already voided')

    const batch = writeBatch(db)
    batch.update(txnRef, {
      status: 'voided', voidedAt: serverTimestamp(),
      voidReason: reason, voidedBy: `${uid}|${displayName}`,
    })
    for (const item of txn.items) {
      batch.update(doc(db, 'inventory', item.skuId), {
        qty: increment(item.qty), updatedAt: serverTimestamp(),
      })
    }
    await batch.commit()
    await auditService.log('VOID_TRANSACTION', txnId, txn, { ...txn, status: 'voided', voidReason: reason }, uid)
  },
}
