import {
  collection, addDoc, getDocs, onSnapshot,
  serverTimestamp, query, orderBy, limit
} from 'firebase/firestore'
import { db } from './firebase'
import { inventoryService } from './inventoryService'

const COL = 'receiving'
let rcvCounter = 0

function generateRcvId() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  rcvCounter += 1
  return `RCV-${date}-${String(rcvCounter).padStart(3, '0')}`
}

export const receivingService = {
  subscribe(callback) {
    const q = query(collection(db, COL), orderBy('date', 'desc'), limit(100))
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    })
  },

  async getAll() {
    const snap = await getDocs(query(collection(db, COL), orderBy('date', 'desc')))
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  },

  async record(data, uid, displayName) {
    const rcvId = generateRcvId()
    const totalCost = Number(data.qtyReceived) * Number(data.costPerUnit || 0)

    await inventoryService.incrementStock(data.itemId, Number(data.qtyReceived))

    return addDoc(collection(db, COL), {
      id: rcvId,
      date: serverTimestamp(),
      itemId: data.itemId,
      itemName: data.itemName,
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
