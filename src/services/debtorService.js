import {
  collection, doc, addDoc, updateDoc, getDocs, getDoc, deleteDoc,
  onSnapshot, serverTimestamp, query, orderBy, writeBatch
} from 'firebase/firestore'
import { db } from './firebase'

const COL = 'debtors'

export const debtorService = {
  subscribe(callback, onError) {
    const q = query(collection(db, COL), orderBy('name'))
    return onSnapshot(
      q,
      (snap) => callback(snap.docs.map((d) => ({ ...d.data(), id: d.id }))),
      (err) => { console.error('debtors subscribe:', err); callback([]); onError?.(err) }
    )
  },

  async getAll() {
    const snap = await getDocs(query(collection(db, COL), orderBy('name')))
    return snap.docs.map((d) => ({ ...d.data(), id: d.id }))
  },

  async getById(id) {
    const snap = await getDoc(doc(db, COL, id))
    return snap.exists() ? { id: snap.id, ...snap.data() } : null
  },

  async add(data, uid) {
    const docRef = await addDoc(collection(db, COL), {
      name: data.name,
      phone: data.phone,
      whatsapp: data.whatsapp || data.phone,
      reference: data.reference || '',
      teamName: data.teamName || '',
      notes: data.notes || '',
      openingBalance: Number(data.openingBalance) || 0,
      creditLimit: Number(data.creditLimit) || 0,
      currentBalance: 0,
      status: Number(data.openingBalance) > 0 ? 'active' : 'settled',
      createdAt: serverTimestamp(),
      createdBy: uid,
      lastTransactionDate: null,
    })
    if (data.openingBalance && Number(data.openingBalance) > 0) {
      await this.addLedgerEntry(docRef.id, {
        type: 'opening', description: 'Opening Balance',
        amount: Number(data.openingBalance), enteredBy: uid,
      })
    }
    return docRef
  },

  async update(id, data) {
    return updateDoc(doc(db, COL, id), { ...data, updatedAt: serverTimestamp() })
  },

  async delete(id) {
    return deleteDoc(doc(db, COL, id))
  },

  async block(id, reason, adminUid) {
    return updateDoc(doc(db, COL, id), {
      status: 'blocked', blockedReason: reason,
      blockedAt: serverTimestamp(), blockedBy: adminUid,
    })
  },

  async unblock(id) {
    return updateDoc(doc(db, COL, id), { status: 'active', blockedReason: null })
  },

  subscribeLedger(debtorId, callback, onError) {
    const q = query(collection(db, COL, debtorId, 'ledger'), orderBy('date'))
    return onSnapshot(
      q,
      (snap) => callback(snap.docs.map((d) => ({ ...d.data(), id: d.id }))),
      (err) => { console.error('ledger subscribe:', err); callback([]); onError?.(err) }
    )
  },

  async getLedger(debtorId) {
    try {
      const snap = await getDocs(query(collection(db, COL, debtorId, 'ledger'), orderBy('date')))
      return snap.docs.map((d) => ({ ...d.data(), id: d.id }))
    } catch { return [] }
  },

  async addLedgerEntry(debtorId, entry) {
    const ledger = await this.getLedger(debtorId)
    const lastBalance = ledger.length > 0 ? ledger[ledger.length - 1].runningBalance || 0 : 0
    let runningBalance = lastBalance
    if (entry.type === 'debit' || entry.type === 'opening') runningBalance = lastBalance + entry.amount
    else if (entry.type === 'credit' || entry.type === 'write-off') runningBalance = lastBalance - entry.amount

    const entryRef = await addDoc(collection(db, COL, debtorId, 'ledger'), {
      ...entry, runningBalance,
      date: serverTimestamp(),
      ...(entry.type === 'debit' ? { billStatus: 'open', paidAmount: 0 } : {}),
    })
    const newStatus = runningBalance <= 0 ? (runningBalance < 0 ? 'credit' : 'settled') : 'active'
    await updateDoc(doc(db, COL, debtorId), {
      status: newStatus, lastTransactionDate: serverTimestamp(), currentBalance: runningBalance,
    })
    return entryRef
  },

  async receivePayment(debtorId, paymentData, uid) {
    return this.addLedgerEntry(debtorId, {
      type: 'credit',
      description: `Payment — ${paymentData.mode}${paymentData.reference ? ` (Ref: ${paymentData.reference})` : ''}`,
      amount: Number(paymentData.amount),
      paymentMode: paymentData.mode,
      paymentRef: paymentData.reference || '',
      enteredBy: uid,
    })
  },

  subscribeCallingLog(debtorId, callback, onError) {
    const q = query(collection(db, COL, debtorId, 'callingLog'), orderBy('date', 'desc'))
    return onSnapshot(
      q,
      (snap) => callback(snap.docs.map((d) => ({ ...d.data(), id: d.id }))),
      (err) => { console.error('callingLog subscribe:', err); callback([]); onError?.(err) }
    )
  },

  async addCallingLog(debtorId, logData, uid) {
    return addDoc(collection(db, COL, debtorId, 'callingLog'), {
      ...logData, date: serverTimestamp(), enteredBy: uid,
    })
  },

  async writeOff(debtorId, reason, amount, uid) {
    await this.addLedgerEntry(debtorId, {
      type: 'write-off', description: `Write-off: ${reason}`, amount, enteredBy: uid,
    })
    await addDoc(collection(db, 'writeoffs'), {
      debtorId, reason, amount, date: serverTimestamp(), adminUid: uid,
    })
  },

  async updateDirectoryCache(debtorId, profileData) {
    return updateDoc(doc(db, COL, debtorId), {
      directoryCache: profileData, directoryCacheUpdatedAt: serverTimestamp(),
    })
  },
}
