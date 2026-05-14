import {
  collection, doc, addDoc, updateDoc, getDocs,
  onSnapshot, serverTimestamp, query, where, orderBy, getDoc, increment
} from 'firebase/firestore'
import { db } from './firebase'

const COL = 'inventory'

export const inventoryService = {
  subscribe(callback, onError) {
    const q = query(collection(db, COL), orderBy('name'))
    return onSnapshot(
      q,
      (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => { console.error('inventory subscribe:', err); callback([]); onError?.(err) }
    )
  },

  async getAll() {
    const snap = await getDocs(query(collection(db, COL), orderBy('name')))
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  },

  async getById(id) {
    const snap = await getDoc(doc(db, COL, id))
    return snap.exists() ? { id: snap.id, ...snap.data() } : null
  },

  async add(data, adminUid) {
    return addDoc(collection(db, COL), {
      ...data,
      qty: data.qty || 0,
      status: data.status || 'active',
      isGift: data.isGift || false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: adminUid,
    })
  },

  async update(id, data) {
    return updateDoc(doc(db, COL, id), { ...data, updatedAt: serverTimestamp() })
  },

  async adjustStock(id, delta, reason, adminUid, currentQty) {
    const newQty = currentQty + delta
    if (newQty < 0) throw new Error('Stock cannot go below zero')
    await updateDoc(doc(db, COL, id), { qty: newQty, updatedAt: serverTimestamp() })
    await addDoc(collection(db, 'adjustments'), {
      itemId: id, delta, reason, oldQty: currentQty, newQty,
      date: serverTimestamp(), adminUid,
    })
  },

  async decrementStock(id, qty) {
    const item = await this.getById(id)
    if (!item) throw new Error('Item not found')
    if (item.qty < qty) throw new Error('Insufficient stock')
    return updateDoc(doc(db, COL, id), { qty: item.qty - qty, updatedAt: serverTimestamp() })
  },

  async incrementStock(id, qty) {
    return updateDoc(doc(db, COL, id), { qty: increment(qty), updatedAt: serverTimestamp() })
  },
}

export const CATEGORIES = {
  APPAREL:     ['Gopi Dress', 'Kurta', 'Dhoti'],
  ACCESSORIES: ['Kanthi Mala', 'Japa Mala', 'Bead Bag', 'Hare Krishna Card', 'Gopi Chandan'],
  BOOKS:       ['Book'],
}
export const ALL_CATEGORIES = [...CATEGORIES.APPAREL, ...CATEGORIES.ACCESSORIES, ...CATEGORIES.BOOKS]
