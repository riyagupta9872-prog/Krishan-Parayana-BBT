import {
  collection, doc, addDoc, updateDoc, setDoc, getDocs, getDoc, deleteDoc,
  onSnapshot, serverTimestamp, query, orderBy, where, writeBatch, increment, limit, Timestamp
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
      (snap) => callback(snap.docs.map((d) => ({ ...d.data(), id: d.id }))),
      (err) => { console.error('transactions subscribe:', err); callback([]); onError?.(err) }
    )
  },

  async confirmSale(saleData, uid, displayName) {
    const batch = writeBatch(db)
    const txnRef = doc(collection(db, COL))

    batch.set(txnRef, {
      refNo: generateTxnId(),
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
      batch.set(doc(db, 'inventory', item.skuId), {
        qty: increment(-item.qty), updatedAt: serverTimestamp(),
      }, { merge: true })
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

  async deleteTransaction(txnId, txn) {
    const wasCompleted = txn.status !== 'voided'

    // 1. Restore stock if not already voided
    if (wasCompleted && (txn.items || []).length > 0) {
      const batch = writeBatch(db)
      for (const item of txn.items) {
        batch.set(doc(db, 'inventory', item.skuId), {
          qty: increment(item.qty), updatedAt: serverTimestamp(),
        }, { merge: true })
      }
      await batch.commit()
    }

    // 2. Reverse debtor balance if it was a credit sale that hasn't been voided
    if (wasCompleted && txn.saleType === 'credit' && txn.debtorId && txn.totalAmount > 0) {
      const desc = (txn.items || []).map((i) => `${i.name} ×${i.qty}`).join(', ')
      await debtorService.addLedgerEntry(txn.debtorId, {
        type: 'credit',
        description: `Transaction deleted — reversal of: ${desc}`,
        amount: txn.totalAmount,
        relatedTxnId: txnId,
      })
    }

    // 3. Delete the transaction document
    return deleteDoc(doc(db, COL, txnId))
  },

  async getForFY(fyStartYear) {
    const from = Timestamp.fromDate(new Date(fyStartYear, 3, 1, 0, 0, 0))   // Apr 1
    const to   = Timestamp.fromDate(new Date(fyStartYear + 1, 2, 31, 23, 59, 59)) // Mar 31
    const q = query(collection(db, COL), where('date', '>=', from), where('date', '<=', to), orderBy('date', 'desc'))
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ ...d.data(), id: d.id }))
  },

  async voidTransaction(txnId, reason, uid, displayName) {
    const txnRef = doc(db, COL, txnId)
    const txnSnap = await getDoc(txnRef)
    if (!txnSnap.exists()) throw new Error('Transaction not found')
    const txn = txnSnap.data()
    if (txn.status === 'voided') throw new Error('Already voided')

    const batch = writeBatch(db)
    batch.set(txnRef, {
      status: 'voided', voidedAt: serverTimestamp(),
      voidReason: reason, voidedBy: `${uid}|${displayName}`,
    }, { merge: true })
    for (const item of txn.items) {
      batch.set(doc(db, 'inventory', item.skuId), {
        qty: increment(item.qty), updatedAt: serverTimestamp(),
      }, { merge: true })
    }
    await batch.commit()
    await auditService.log('VOID_TRANSACTION', txnId, txn, { ...txn, status: 'voided', voidReason: reason }, uid)
  },
}
