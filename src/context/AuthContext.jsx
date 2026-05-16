import { createContext, useContext, useState, useEffect } from 'react'
import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged,
  createUserWithEmailAndPassword, updateProfile, updatePassword,
  sendPasswordResetEmail, reauthenticateWithCredential, EmailAuthProvider,
} from 'firebase/auth'
import { auth, db } from '../services/firebase'
import { doc, getDoc, setDoc, getDocs, collection } from 'firebase/firestore'

const AuthContext = createContext(null)

async function resolveRole(firebaseUser) {
  const userRef  = doc(db, 'users', firebaseUser.uid)
  const userSnap = await getDoc(userRef)

  if (userSnap.exists()) {
    return userSnap.data().superAdmin === true
  }

  // New user — is this the very first account ever?
  const allUsers = await getDocs(collection(db, 'users'))
  const isFirst  = allUsers.empty

  await setDoc(userRef, {
    uid:         firebaseUser.uid,
    email:       firebaseUser.email,
    displayName: firebaseUser.displayName || firebaseUser.email.split('@')[0],
    superAdmin:  isFirst,
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

  const login = (email, password) =>
    signInWithEmailAndPassword(auth, email, password)

  const signup = async (email, password, displayName) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    if (displayName) {
      await updateProfile(cred.user, { displayName })
    }
    return cred
  }

  const logout = () => signOut(auth)

  const resetPassword = (email) => sendPasswordResetEmail(auth, email)

  const changePassword = async (currentPassword, newPassword) => {
    const cred = EmailAuthProvider.credential(auth.currentUser.email, currentPassword)
    await reauthenticateWithCredential(auth.currentUser, cred)
    await updatePassword(auth.currentUser, newPassword)
  }

  const updateDisplayName = async (name) => {
    await updateProfile(auth.currentUser, { displayName: name })
    setUser((prev) => ({ ...prev, displayName: name }))
  }

  return (
    <AuthContext.Provider value={{ user, isSuperAdmin, loading, login, signup, logout, resetPassword, changePassword, updateDisplayName }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
