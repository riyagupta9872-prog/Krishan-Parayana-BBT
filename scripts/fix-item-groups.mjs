/**
 * One-time migration: set `group` field on inventory items that are missing it.
 * Usage: node scripts/fix-item-groups.mjs riyagupta9872@gmail.com RDD_VVPS
 */
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'

const [,, email, password] = process.argv
if (!email || !password) { console.error('Usage: node fix-item-groups.mjs email password'); process.exit(1) }

const app = initializeApp({
  apiKey: 'AIzaSyCo5H9QlKz11xMmiVi2OxhLZv3oynDQ2Ig',
  authDomain: 'krishan-parayana-bbt.firebaseapp.com',
  projectId: 'krishan-parayana-bbt',
  storageBucket: 'krishan-parayana-bbt.firebasestorage.app',
  messagingSenderId: '795860622640',
  appId: '1:795860622640:web:c0d5199cd59bb36ae67cf5',
})

const auth = getAuth(app)
const db   = getFirestore(app)

// Keyword rules to guess group from name when group field is missing
function guessGroup(item) {
  const n = (item.name || '').toLowerCase()
  const c = (item.category || '').toLowerCase()
  if (c.includes('book') || n.includes('gita') || n.includes('bhagavat') || n.includes('prabhupada') ||
      n.includes('magazine') || n.includes('scripture') || n.includes('krsna') || c === 'books')
    return 'books'
  if (n.includes('kurta') || n.includes('dhoti') || n.includes('gopi dress') || c.includes('apparel'))
    return 'apparel'
  if (n.includes('card') || n.includes('stationery'))
    return 'stationery'
  return 'accessories'
}

async function main() {
  await signInWithEmailAndPassword(auth, email, password)
  const snap = await getDocs(collection(db, 'inventory'))
  let fixed = 0

  for (const d of snap.docs) {
    const data = d.data()
    if (!data.group) {
      const group = guessGroup(data)
      await updateDoc(doc(db, 'inventory', d.id), { group })
      console.log(`  ✓ ${data.name} → ${group}`)
      fixed++
    }
  }

  console.log(`\nDone! ${fixed} items updated, ${snap.size - fixed} already had group.`)
  process.exit(0)
}

main().catch(e => { console.error(e.message); process.exit(1) })
