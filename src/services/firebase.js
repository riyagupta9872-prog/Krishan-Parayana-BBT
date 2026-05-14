import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyCo5H9QlKz11xMmiVi2OxhLZv3oynDQ2Ig',
  authDomain: 'krishan-parayana-bbt.firebaseapp.com',
  projectId: 'krishan-parayana-bbt',
  storageBucket: 'krishan-parayana-bbt.firebasestorage.app',
  messagingSenderId: '795860622640',
  appId: '1:795860622640:web:c0d5199cd59bb36ae67cf5',
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)

enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Firestore persistence failed: multiple tabs open')
  } else if (err.code === 'unimplemented') {
    console.warn('Firestore persistence not supported in this browser')
  }
})

export default app
