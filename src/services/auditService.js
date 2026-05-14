import {
  collection, addDoc, getDocs, onSnapshot,
  serverTimestamp, query, orderBy, limit
} from 'firebase/firestore'
import { db } from './firebase'

const COL = 'adminAudit'
const PRICE_COL = 'priceAudit'

export const auditService = {
  async log(actionType, entityId, before, after, adminUid) {
    return addDoc(collection(db, COL), {
      actionType, entityId,
      before: JSON.stringify(before || {}),
      after: JSON.stringify(after || {}),
      adminUid, timestamp: serverTimestamp(),
    })
  },

  subscribe(callback) {
    const q = query(collection(db, COL), orderBy('timestamp', 'desc'), limit(200))
    return onSnapshot(q, (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
  },

  async getAll() {
    const snap = await getDocs(query(collection(db, COL), orderBy('timestamp', 'desc'), limit(200)))
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  },

  async logPriceChange(itemId, itemName, oldPrice, newPrice, reason, adminUid) {
    return addDoc(collection(db, PRICE_COL), {
      itemId, itemName, oldPrice, newPrice, reason,
      adminUid, timestamp: serverTimestamp(),
    })
  },

  subscribePriceAudit(callback) {
    const q = query(collection(db, PRICE_COL), orderBy('timestamp', 'desc'), limit(200))
    return onSnapshot(q, (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
  },

  async getPriceAudit() {
    const snap = await getDocs(query(collection(db, PRICE_COL), orderBy('timestamp', 'desc'), limit(500)))
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  },
}
