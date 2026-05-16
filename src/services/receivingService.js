import {
  collection, addDoc, onSnapshot, serverTimestamp, query, orderBy, limit
} from 'firebase/firestore'
import { db } from './firebase'
import { inventoryService } from './inventoryService'

const COL = 'receiving'
let rcvCounter = 0

export const receivingService = {
  subscribe(callback, onError) {
    const q = query(collection(db, COL), orderBy('date', 'desc'), limit(100))
    return onSnapshot(
      q,
      (snap) => callback(snap.docs.map((d) => ({ ...d.data(), id: d.id }))),
      (err) => { console.error('receiving subscribe:', err); callback([]); onError?.(err) }
    )
  },

  async record(data, uid, displayName) {
    const id = `RCV-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(++rcvCounter).padStart(3,'0')}`
    const totalCost = Number(data.qtyReceived) * Number(data.costPerUnit || 0)
    await inventoryService.incrementStock(data.itemId, Number(data.qtyReceived))
    return addDoc(collection(db, COL), {
      id, date: serverTimestamp(),
      itemId: data.itemId, itemName: data.itemName,
      qtyReceived: Number(data.qtyReceived),
      costPerUnit: Number(data.costPerUnit || 0),
      totalCost,
      supplier: data.supplier || '',
      invoiceRef: data.invoiceRef || '',
      notes: data.notes || '',
      receivedBy: `${uid}|${displayName}`,
    })
  },
}
