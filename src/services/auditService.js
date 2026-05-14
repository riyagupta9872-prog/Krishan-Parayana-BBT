import {
  collection, addDoc, getDocs, onSnapshot,
  serverTimestamp, query, orderBy, limit
} from 'firebase/firestore'
import { db } from './firebase'

const COL       = 'adminAudit'
const PRICE_COL = 'priceAudit'

export const auditService = {
  async log(actionType, entityId, before, after, adminUid) {
    return addDoc(collection(db, COL), {
      actionType, entityId,
      before: JSON.stringify(before || {}),
      after:  JSON.stringify(after  || {}),
      adminUid, timestamp: serverTimestamp(),
    })
  },

  subscribe(callback, onError) {
    const q = query(collection(db, COL), orderBy('timestamp', 'desc'), limit(200))
    return onSnapshot(
      q,
      (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => { console.error('adminAudit subscribe:', err); callback([]); onError?.(err) }
    )
  },

  subscribePriceAudit(callback, onError) {
    const q = query(collection(db, PRICE_COL), orderBy('timestamp', 'desc'), limit(200))
    return onSnapshot(
      q,
      (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => { console.error('priceAudit subscribe:', err); callback([]); onError?.(err) }
    )
  },

  async logPriceChange(itemId, itemName, oldPrice, newPrice, reason, adminUid) {
    return addDoc(collection(db, PRICE_COL), {
      itemId, itemName, oldPrice, newPrice, reason,
      adminUid, timestamp: serverTimestamp(),
    })
  },
}
