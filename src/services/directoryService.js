/**
 * Devotee Directory Service
 * Connects to the Sakhi Sang Firebase project as a read-only secondary app.
 */
import { initializeApp, getApps } from 'firebase/app'
import { getFirestore, collection, query, where, getDocs, limit } from 'firebase/firestore'

const DIRECTORY_CONFIG = {
  apiKey:            'AIzaSyCxxLIiOy0bGus2NkkSod7_LBVHah5-sz0',
  authDomain:        'sakhi-sang-attendence-tracker.firebaseapp.com',
  projectId:         'sakhi-sang-attendence-tracker',
  storageBucket:     'sakhi-sang-attendence-tracker.firebasestorage.app',
  messagingSenderId: '975645795932',
  appId:             '1:975645795932:web:10123086717198940b2899',
}

const APP_NAME = 'sakhiDirectory'

function getDirectoryDb() {
  const existing = getApps().find((a) => a.name === APP_NAME)
  const app = existing || initializeApp(DIRECTORY_CONFIG, APP_NAME)
  return getFirestore(app)
}

/**
 * Look up a devotee by phone number.
 */
export async function lookupDevoteeByPhone(phone) {
  if (!phone) return null
  const normalized = String(phone).replace(/\D/g, '').slice(-10)
  if (normalized.length < 10) return null

  const db = getDirectoryDb()
  const fieldNames = ['mobile', 'phone', 'mobile1', 'mobileAlt']
  for (const field of fieldNames) {
    try {
      const snap = await getDocs(
        query(collection(db, 'devotees'), where(field, '==', normalized))
      )
      if (!snap.empty) {
        return { id: snap.docs[0].id, ...snap.docs[0].data() }
      }
    } catch {
      // permission error on that field — try next
    }
  }
  return null
}

/**
 * Search devotees by name prefix. Returns up to 10 results.
 * Tries multiple case variants since Firestore prefix search is case-sensitive.
 */
export async function lookupDevoteesByName(name) {
  if (!name || name.trim().length < 2) return []
  const db = getDirectoryDb()
  const results = new Map()

  const raw = name.trim()
  // Build case variants to maximise matches
  const titleCase = raw.replace(/\b\w/g, (c) => c.toUpperCase())
  const ucFirst   = raw.charAt(0).toUpperCase() + raw.slice(1)
  const lower     = raw.toLowerCase()

  for (const v of [...new Set([titleCase, ucFirst, lower, raw])]) {
    try {
      const end  = v.slice(0, -1) + String.fromCharCode(v.charCodeAt(v.length - 1) + 1)
      const snap = await getDocs(
        query(collection(db, 'devotees'),
          where('name', '>=', v),
          where('name', '<',  end),
          limit(10))
      )
      snap.docs.forEach((d) => results.set(d.id, { id: d.id, ...d.data() }))
    } catch { /* field unavailable */ }
  }
  return [...results.values()].slice(0, 10)
}

/**
 * Profile completion % — count non-empty fields.
 */
export function computeCompletion(profile) {
  if (!profile) return 0
  const FIELDS = [
    'name', 'mobile', 'address', 'email', 'dob', 'teamName',
    'education', 'profession', 'chantingRounds', 'referenceBy',
    'dateOfJoining', 'devoteeStatus', 'familyMembers',
  ]
  const filled = FIELDS.filter((f) => profile[f] != null && profile[f] !== '' && profile[f] !== 0).length
  return Math.round((filled / FIELDS.length) * 100)
}
