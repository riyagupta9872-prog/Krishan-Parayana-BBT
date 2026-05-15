/**
 * One-time product seed script.
 * Usage: node scripts/seed-products.mjs your@email.com yourpassword
 *
 * Skips automatically if inventory already has items.
 */

import { initializeApp } from 'firebase/app'
import { getFirestore, collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'

const [,, email, password] = process.argv
if (!email || !password) {
  console.error('Usage: node scripts/seed-products.mjs your@email.com yourpassword')
  process.exit(1)
}

const app = initializeApp({
  apiKey:            'AIzaSyCo5H9QlKz11xMmiVi2OxhLZv3oynDQ2Ig',
  authDomain:        'krishan-parayana-bbt.firebaseapp.com',
  projectId:         'krishan-parayana-bbt',
  storageBucket:     'krishan-parayana-bbt.firebasestorage.app',
  messagingSenderId: '795860622640',
  appId:             '1:795860622640:web:c0d5199cd59bb36ae67cf5',
})

const auth = getAuth(app)
const db   = getFirestore(app)

// ── Product catalog from PRD §5.1.1 ─────────────────────────────────────────
// qty: 0 — add opening stock via Edit in the app
// sellingPrice: 0 — set price via Edit in the app
// ─────────────────────────────────────────────────────────────────────────────
const PRODUCTS = [
  // ── Apparel ──────────────────────────────────────────────────────────────
  { name: 'Gopi Dress',          subVariant: '',                  productGroup: 'Gopi Dress',       category: 'Gopi Dress',       group: 'apparel' },

  { name: 'Plain Kurta S',       subVariant: 'S',                 productGroup: 'Plain Kurta',      category: 'Plain Kurta',      group: 'apparel' },
  { name: 'Plain Kurta M',       subVariant: 'M',                 productGroup: 'Plain Kurta',      category: 'Plain Kurta',      group: 'apparel' },
  { name: 'Plain Kurta L',       subVariant: 'L',                 productGroup: 'Plain Kurta',      category: 'Plain Kurta',      group: 'apparel' },

  { name: 'Bagal-Bandhi Kurta S', subVariant: 'S',                productGroup: 'Bagal-Bandhi Kurta', category: 'Bagal-Bandhi Kurta', group: 'apparel' },
  { name: 'Bagal-Bandhi Kurta M', subVariant: 'M',                productGroup: 'Bagal-Bandhi Kurta', category: 'Bagal-Bandhi Kurta', group: 'apparel' },
  { name: 'Bagal-Bandhi Kurta L', subVariant: 'L',                productGroup: 'Bagal-Bandhi Kurta', category: 'Bagal-Bandhi Kurta', group: 'apparel' },

  { name: 'Coloured Kurta S',    subVariant: 'S',                 productGroup: 'Coloured Kurta',   category: 'Coloured Kurta',   group: 'apparel' },
  { name: 'Coloured Kurta M',    subVariant: 'M',                 productGroup: 'Coloured Kurta',   category: 'Coloured Kurta',   group: 'apparel' },
  { name: 'Coloured Kurta L',    subVariant: 'L',                 productGroup: 'Coloured Kurta',   category: 'Coloured Kurta',   group: 'apparel' },

  { name: 'Dhoti',               subVariant: '',                  productGroup: 'Dhoti',            category: 'Dhoti',            group: 'apparel' },

  // ── Accessories ──────────────────────────────────────────────────────────
  { name: 'Kanthi Mala',         subVariant: '',                  productGroup: 'Kanthi Mala',      category: 'Kanthi Mala',      group: 'accessories' },

  { name: 'Japa Mala Kids Beads',     subVariant: 'Kids Beads',   productGroup: 'Japa Mala',        category: 'Japa Mala',        group: 'accessories' },
  { name: 'Japa Mala Standard Beads', subVariant: 'Standard Beads', productGroup: 'Japa Mala',      category: 'Japa Mala',        group: 'accessories' },

  { name: 'Bead Bag Simple',              subVariant: 'Simple',              productGroup: 'Bead Bag', category: 'Bead Bag', group: 'accessories' },
  { name: 'Bead Bag Double Zipper Plain', subVariant: 'Double Zipper Plain', productGroup: 'Bead Bag', category: 'Bead Bag', group: 'accessories' },
  { name: 'Bead Bag Double Zipper Printed', subVariant: 'Double Zipper Printed', productGroup: 'Bead Bag', category: 'Bead Bag', group: 'accessories' },

  { name: 'Hare Krishna Card',   subVariant: '',                  productGroup: 'Hare Krishna Card', category: 'Hare Krishna Card', group: 'stationery' },
  { name: 'Gopi Chandan',        subVariant: '',                  productGroup: 'Gopi Chandan',     category: 'Gopi Chandan',     group: 'accessories' },
]

async function main() {
  console.log('Signing in…')
  await signInWithEmailAndPassword(auth, email, password)
  console.log('Signed in as', email)

  const existing = await getDocs(collection(db, 'inventory'))
  if (existing.size > 0) {
    console.log(`⚠  Inventory already has ${existing.size} item(s). Skipping seed to avoid duplicates.`)
    console.log('   Delete existing items first if you want to re-seed.')
    process.exit(0)
  }

  console.log(`\nAdding ${PRODUCTS.length} products…\n`)
  for (const p of PRODUCTS) {
    await addDoc(collection(db, 'inventory'), {
      ...p,
      sellingPrice:       0,
      costPrice:          0,
      qty:                0,
      lowStockThreshold:  p.group === 'stationery' ? 50 : 5,
      status:             'active',
      isGift:             false,
      createdAt:          serverTimestamp(),
      updatedAt:          serverTimestamp(),
      createdBy:          'seed-script',
    })
    const variant = p.subVariant ? ` (${p.subVariant})` : ''
    console.log(`  ✓  ${p.productGroup}${variant}`)
  }

  console.log(`\nDone! ${PRODUCTS.length} products added.`)
  console.log('Open the app → Inventory → Edit each item to set prices and opening stock.')
  process.exit(0)
}

main().catch((err) => {
  console.error('Error:', err.message || err)
  process.exit(1)
})
