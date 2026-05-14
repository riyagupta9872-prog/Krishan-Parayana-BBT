import {
  collection, doc, addDoc, updateDoc, getDocs, getDoc,
  onSnapshot, serverTimestamp, query, orderBy, where, writeBatch
} from 'firebase/firestore'
import { db } from './firebase'

const COL = 'debtors'

export const debtorService = {
  subscribe(callback) {
    const q = query(collection(db, COL), orderBy('name'))
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    })
  },

  async getAll() {
    const snap = await getDocs(query(collection(db, COL), orderBy('name')))
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
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
      notes: data.notes || '',
      openingBalance: Number(data.openingBalance) || 0,
      creditLimit: Number(data.creditLimit) || 0,
      status: 'active',
      createdAt: serverTimestamp(),
      createdBy: uid,
      lastTransactionDate: null,
      directoryCache: null,
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

  async block(id, reason, adminUid) {
    return updateDoc(doc(db, COL, id), {
      status: 'blocked', blockedReason: reason,
      blockedAt: serverTimestamp(), blockedBy: adminUid,
    })
  },

  async unblock(id) {
    return updateDoc(doc(db, COL, id), { status: 'active', blockedReason: null })
  },

  subscribeLedger(debtorId, callback) {
    const q = query(collection(db, COL, debtorId, 'ledger'), orderBy('date'))
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    })
  },

  async getLedger(debtorId) {
    const snap = await getDocs(query(collection(db, COL, debtorId, 'ledger'), orderBy('date')))
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  },

  async addLedgerEntry(debtorId, entry) {
    const ledger = await this.getLedger(debtorId)
    const lastBalance = ledger.length > 0 ? ledger[ledger.length - 1].runningBalance || 0 : 0
    let runningBalance = lastBalance
    if (entry.type === 'debit' || entry.type === 'opening') {
      runningBalance = lastBalance + entry.amount
    } else if (entry.type === 'credit' || entry.type === 'write-off') {
      runningBalance = lastBalance - entry.amount
    }
    const entryRef = await addDoc(collection(db, COL, debtorId, 'ledger'), {
      ...entry, runningBalance,
      date: serverTimestamp(),
      billStatus: entry.type === 'debit' ? 'open' : undefined,
      paidAmount: entry.type === 'debit' ? 0 : undefined,
    })
    const newStatus = runningBalance <= 0 ? (runningBalance < 0 ? 'credit' : 'settled') : 'active'
    await updateDoc(doc(db, COL, debtorId), {
      status: newStatus,
      lastTransactionDate: serverTimestamp(),
      currentBalance: runningBalance,
    })
    return entryRef
  },

  async receivePayment(debtorId, paymentData, uid) {
    const entry = {
      type: 'credit',
      description: `Payment received — ${paymentData.mode}${paymentData.reference ? ` (Ref: ${paymentData.reference})` : ''}`,
      amount: Number(paymentData.amount),
      paymentMode: paymentData.mode,
      paymentRef: paymentData.reference || '',
      enteredBy: uid,
    }
    return this.addLedgerEntry(debtorId, entry)
  },

  subscribeCallingLog(debtorId, callback) {
    const q = query(collection(db, COL, debtorId, 'callingLog'), orderBy('date', 'desc'))
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    })
  },

  async addCallingLog(debtorId, logData, uid) {
    return addDoc(collection(db, COL, debtorId, 'callingLog'), {
      ...logData, date: serverTimestamp(), enteredBy: uid,
    })
  },

  async writeOff(debtorId, reason, amount, uid) {
    await this.addLedgerEntry(debtorId, {
      type: 'write-off', description: `Write-off: ${reason}`,
      amount, enteredBy: uid,
    })
    await addDoc(collection(db, 'writeoffs'), {
      debtorId, reason, amount, date: serverTimestamp(), adminUid: uid,
    })
  },

  async updateDirectoryCache(debtorId, profileData) {
    return updateDoc(doc(db, COL, debtorId), {
      directoryCache: profileData,
      directoryCacheUpdatedAt: serverTimestamp(),
    })
  },
}
