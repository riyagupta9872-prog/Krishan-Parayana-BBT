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

// In-memory cache so we only fetch all devotees once per session
let _allDevoteesCache = null
let _cacheLoadedAt   = 0
const CACHE_TTL_MS   = 5 * 60 * 1000 // 5 minutes

async function getAllDevotees() {
  const now = Date.now()
  if (_allDevoteesCache && (now - _cacheLoadedAt) < CACHE_TTL_MS) {
    return _allDevoteesCache
  }
  const db = getDirectoryDb()
  try {
    const snap = await getDocs(query(collection(db, 'devotees'), limit(1000)))
    _allDevoteesCache = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    _cacheLoadedAt   = now
    return _allDevoteesCache
  } catch {
    return []
  }
}

/**
 * Search devotees by name — case-insensitive, matches anywhere in name.
 * Fetches all devotees once then filters client-side (reliable across all casing).
 */
export async function lookupDevoteesByName(name) {
  if (!name || name.trim().length < 2) return []
  const all = await getAllDevotees()
  const q   = name.trim().toLowerCase()
  return all
    .filter((d) => (d.name || '').toLowerCase().includes(q))
    .slice(0, 15)
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
