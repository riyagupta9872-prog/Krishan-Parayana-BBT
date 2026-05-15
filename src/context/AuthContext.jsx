import { createContext, useContext, useState, useEffect } from 'react'
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from 'firebase/auth'
import { auth, db } from '../services/firebase'
import { doc, getDoc, setDoc, getDocs, collection } from 'firebase/firestore'

const AuthContext = createContext(null)

async function resolveRole(firebaseUser) {
  const userRef = doc(db, 'users', firebaseUser.uid)
  const userSnap = await getDoc(userRef)

  if (userSnap.exists()) {
    // Known user — read role from Firestore
    return userSnap.data().superAdmin === true
  }

  // New user — check if ANY user document exists yet
  const allUsers = await getDocs(collection(db, 'users'))
  const isFirst = allUsers.empty

  // Write this user's profile document
  await setDoc(userRef, {
    uid:         firebaseUser.uid,
    email:       firebaseUser.email,
    displayName: firebaseUser.displayName || firebaseUser.email.split('@')[0],
    superAdmin:  isFirst,          // first sign-in → Super Admin; everyone else → User
    createdAt:   new Date().toISOString(),
  })

  return isFirst
}

export function AuthProvider({ children }) {
  const [user,         setUser]         = useState(null)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [loading,      setLoading]      = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const superAdmin = await resolveRole(firebaseUser)
          setIsSuperAdmin(superAdmin)
          setUser({
            uid:         firebaseUser.uid,
            email:       firebaseUser.email,
            displayName: firebaseUser.displayName || firebaseUser.email.split('@')[0],
            superAdmin,
          })
        } catch (err) {
          console.error('resolveRole failed:', err)
          // Firestore rules might not be set yet — fall back to non-admin
          setUser({
            uid:         firebaseUser.uid,
            email:       firebaseUser.email,
            displayName: firebaseUser.displayName || firebaseUser.email.split('@')[0],
            superAdmin:  false,
          })
          setIsSuperAdmin(false)
        }
      } else {
        setUser(null)
        setIsSuperAdmin(false)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  const login = (email, password) => signInWithEmailAndPassword(auth, email, password)
  const logout = () => signOut(auth)

  return (
    <AuthContext.Provider value={{ user, isSuperAdmin, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
