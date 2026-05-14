import { useAuth } from './context/AuthContext'
import { useApp } from './context/AppContext'
import LoginPage from './components/auth/LoginPage'
import Header from './components/layout/Header'
import TabBar from './components/layout/TabBar'
import Toast from './components/common/Toast'
import OfflineBanner from './components/common/OfflineBanner'
import { PageLoader } from './components/common/LoadingSpinner'
import Dashboard from './components/dashboard/Dashboard'
import InventoryTab from './components/inventory/InventoryTab'
import DebtorsTab from './components/debtors/DebtorsTab'
import ReceivingTab from './components/receiving/ReceivingTab'
import AgingReport from './components/aging/AgingReport'
import RatesTab from './components/rates/RatesTab'
import AdminLog from './components/admin/AdminLog'

function TabContent({ tab, isSuperAdmin }) {
  const tabMap = {
    dashboard:   <Dashboard />,
    apparel:     <InventoryTab tabGroup="apparel" />,
    accessories: <InventoryTab tabGroup="accessories" />,
    books:       <InventoryTab tabGroup="books" />,
    debtors:     <DebtorsTab />,
    receiving:   <ReceivingTab />,
    aging:       <AgingReport />,
    ...(isSuperAdmin ? { rates: <RatesTab />, admin: <AdminLog /> } : {}),
  }
  return tabMap[tab] || (
    <div className="flex-1 flex items-center justify-center">
      <p className="text-ink-3 font-body">Tab not found</p>
    </div>
  )
}

export default function App() {
  const { user, loading, isSuperAdmin } = useAuth()
  const { activeTab } = useApp()

  if (loading) {
    return (
      <div className="min-h-screen bg-app-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center mb-4 mx-auto shadow-blue">
            <span className="text-white text-2xl">☸</span>
          </div>
          <div className="w-8 h-8 border-3 border-primary-md border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-ink-3 font-body text-sm mt-3">Loading SCIAMS…</p>
        </div>
      </div>
    )
  }

  if (!user) return <LoginPage />

  return (
    <div className="min-h-screen bg-app-bg flex flex-col">
      <OfflineBanner />
      <Header />
      <TabBar />
      <main className="flex-1 pb-10">
        <TabContent tab={activeTab} isSuperAdmin={isSuperAdmin} />
      </main>
      <Toast />
    </div>
  )
}
