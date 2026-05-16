import {
  collection, doc, addDoc, setDoc, getDocs, deleteDoc,
  onSnapshot, serverTimestamp, query, orderBy, getDoc, increment
} from 'firebase/firestore'
import { db } from './firebase'

const COL = 'inventory'

// Strip client-side `id` so it never gets written into Firestore document data.
// Without this, editing an item spreads `editItem.id` into the saved data, which
// then overwrites the real Firestore doc ID in the subscribe mapper and causes
// deletes/updates to target the wrong document.
const strip = ({ id: _id, ...rest }) => rest

const toItem = (d) => ({ ...d.data(), id: d.id }) // id: d.id LAST — always wins

export const inventoryService = {
  subscribe(callback, onError) {
    const q = query(collection(db, COL), orderBy('name'))
    return onSnapshot(
      q,
      (snap) => callback(snap.docs.map(toItem)),
      (err) => { console.error('inventory subscribe:', err); callback([]); onError?.(err) }
    )
  },

  async getAll() {
    const snap = await getDocs(query(collection(db, COL), orderBy('name')))
    return snap.docs.map(toItem)
  },

  async getById(id) {
    const snap = await getDoc(doc(db, COL, id))
    return snap.exists() ? toItem(snap) : null
  },

  async add(data, adminUid) {
    return addDoc(collection(db, COL), {
      ...strip(data),
      qty: data.qty || 0,
      status: data.status || 'active',
      isGift: data.isGift || false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: adminUid,
    })
  },

  async update(id, data) {
    return setDoc(doc(db, COL, id), { ...strip(data), updatedAt: serverTimestamp() }, { merge: true })
  },

  async delete(id) {
    return deleteDoc(doc(db, COL, id))
  },

  async setStatus(id, status) {
    return setDoc(doc(db, COL, id), { status, updatedAt: serverTimestamp() }, { merge: true })
  },

  async adjustStock(id, delta, reason, adminUid, currentQty) {
    const newQty = currentQty + delta
    if (newQty < 0) throw new Error('Stock cannot go below zero')
    await setDoc(doc(db, COL, id), { qty: newQty, updatedAt: serverTimestamp() }, { merge: true })
    await addDoc(collection(db, 'adjustments'), {
      itemId: id, delta, reason, oldQty: currentQty, newQty,
      date: serverTimestamp(), adminUid,
    })
  },

  async decrementStock(id, qty) {
    const item = await this.getById(id)
    if (!item) throw new Error('Item not found')
    if (item.qty < qty) throw new Error('Insufficient stock')
    return setDoc(doc(db, COL, id), { qty: item.qty - qty, updatedAt: serverTimestamp() }, { merge: true })
  },

  async incrementStock(id, qty) {
    return setDoc(doc(db, COL, id), { qty: increment(qty), updatedAt: serverTimestamp() }, { merge: true })
  },
}

export const CATEGORIES = {
  APPAREL:     ['Gopi Dress', 'Kurta', 'Dhoti'],
  ACCESSORIES: ['Kanthi Mala', 'Japa Mala', 'Bead Bag', 'Hare Krishna Card', 'Gopi Chandan'],
  BOOKS:       ['Book'],
}
export const ALL_CATEGORIES = [...CATEGORIES.APPAREL, ...CATEGORIES.ACCESSORIES, ...CATEGORIES.BOOKS]
