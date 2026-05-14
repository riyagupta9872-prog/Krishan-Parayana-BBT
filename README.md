# Spiritual BBT Corner — SCIAMS

**Spiritual Corner Inventory & Accounts Management System**

A React PWA with Firebase backend for managing inventory, debtors, payments, and aging analysis for the Spiritual BBT Corner store.

---

## 🚀 Running the App

Node.js is installed at `C:\Users\User\node-v20.11.0-win-x64`.

### Dev Server
Open a terminal and run:
```cmd
set PATH=C:\Users\User\node-v20.11.0-win-x64;%PATH%
cd "d:\riya personal\RAPP\Sadhana Tracker\Sadhana Tracker- Coordinators Position based based\Krishan-Parayana-BBT"
npm run dev
```
Open: **http://localhost:5173**

### Production Build
```cmd
set PATH=C:\Users\User\node-v20.11.0-win-x64;%PATH%
npm run build
npm run preview
```

---

## 🏗️ Stack
- **React** + Vite 4 (PWA via vite-plugin-pwa)
- **Tailwind CSS** with saffron/gold/deep-dark temple theme
- **Firebase** — Auth (email/password + custom claims) + Firestore (offline persistence)
- **jsPDF** + **react-csv** for exports

---

## 👥 Roles
| Role | Access |
|------|--------|
| **Super Admin** | All tabs + Rates + Admin Log + cost prices + margins + user management |
| **User** | Dashboard, Inventory, Debtors, Receiving, Aging — no cost data, no rates |

Role is set via Firebase Auth **custom claims** (`superAdmin: true`). Set this in Firebase Console → Functions or Admin SDK.

---

## 📂 Project Structure
```
src/
├── services/        Firebase CRUD services (inventoryService, debtorService, etc.)
├── context/         AuthContext, AppContext (toasts, online status)
├── utils/           formatters.js, agingUtils.js, exportUtils.js
├── components/
│   ├── auth/        LoginPage
│   ├── layout/      Header, TabBar
│   ├── common/      Toast, Modal, Spinner, OfflineBanner, ConfirmDialog
│   ├── dashboard/   Dashboard (KPI cards + activity feed)
│   ├── inventory/   InventoryTab (apparel/accessories/books), SellModal, AddItemModal
│   ├── debtors/     DebtorsTab, DebtorProfilePanel, AddDebtorModal, ReceivePaymentModal, CallingLogModal
│   ├── receiving/   ReceivingTab
│   ├── aging/       AgingReport (bill-by-bill matching, export PDF/CSV)
│   ├── rates/       RatesTab (Super Admin only — price editing + audit log)
│   └── admin/       AdminLog + UserManagement (Super Admin only)
├── App.jsx          Tab router
└── main.jsx         Root render
```

---

## 🔐 Firebase Firestore Collections
| Collection | Purpose |
|-----------|---------|
| `inventory` | Product SKUs with qty, prices, thresholds |
| `debtors` | Debtor profiles + `ledger/` + `callingLog/` subcollections |
| `transactions` | Sales records (TXN-YYYYMMDD-NNNN) |
| `receiving` | Stock receiving entries (RCV-YYYYMMDD-NNN) |
| `adjustments` | Manual stock adjustments with reasons |
| `priceAudit` | Every price change with reason and admin UID |
| `adminAudit` | All Super Admin actions (voids, blocks, imports) |
| `writeoffs` | Bad debt write-off register |
| `settings/directoryApi` | Devotee Directory API endpoint + key |

---

## 🛡️ Firestore Security Rules (Required)
The app enforces roles client-side. For server-side security, deploy these rules in Firebase Console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSuperAdmin() {
      return request.auth != null && request.auth.token.superAdmin == true;
    }
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Inventory — users can read, only super admin can write
    match /inventory/{id} {
      allow read: if isAuthenticated();
      allow write: if isSuperAdmin();
      // Users can update qty for sales (via transactions)
      allow update: if isAuthenticated() && 
        request.resource.data.keys().hasOnly(['qty', 'updatedAt']);
    }
    
    // Cost price hidden from users
    // (implement field-level security via backend/Cloud Functions if needed)
    
    match /debtors/{id} {
      allow read, write: if isAuthenticated();
      match /ledger/{entryId} {
        allow read, write: if isAuthenticated();
      }
      match /callingLog/{entryId} {
        allow read, write: if isAuthenticated();
      }
    }
    
    match /transactions/{id} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if isSuperAdmin(); // void only
    }
    
    match /receiving/{id} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
    }
    
    match /priceAudit/{id} {
      allow read: if isSuperAdmin();
      allow create: if isSuperAdmin();
    }
    
    match /adminAudit/{id} {
      allow read: if isSuperAdmin();
      allow create: if isSuperAdmin();
    }
    
    match /settings/{doc} {
      allow read: if isSuperAdmin();
      allow write: if isSuperAdmin();
    }
  }
}
```

---

*Hare Krishna 🙏 — Sri Sri Radha Govinda Ki Jai*
