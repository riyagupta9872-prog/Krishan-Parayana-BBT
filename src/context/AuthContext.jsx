import { createContext, useContext, useState, useEffect } from 'react'
import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile
} from 'firebase/auth'
import { auth, db } from '../services/firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const result = await firebaseUser.getIdTokenResult(true)
          const superAdmin = result.claims.superAdmin === true
          setIsSuperAdmin(superAdmin)
          setUser({ uid: firebaseUser.uid, email: firebaseUser.email, displayName: firebaseUser.displayName, superAdmin })
        } catch {
          setUser({ uid: firebaseUser.uid, email: firebaseUser.email, displayName: firebaseUser.displayName, superAdmin: false })
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

  const login = async (email, password) => {
    return signInWithEmailAndPassword(auth, email, password)
  }

  const logout = async () => {
    await signOut(auth)
  }

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
