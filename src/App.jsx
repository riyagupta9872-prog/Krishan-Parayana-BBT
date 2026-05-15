import { useAuth } from './context/AuthContext'
import { useApp } from './context/AppContext'
import LoginPage from './components/auth/LoginPage'
import Header from './components/layout/Header'
import TabBar from './components/layout/TabBar'
import Toast from './components/common/Toast'
import OfflineBanner from './components/common/OfflineBanner'
import Dashboard from './components/dashboard/Dashboard'
import InventoryManagement from './components/inventory/InventoryManagement'
import SalesTab from './components/sales/SalesTab'
import DebtorsTab from './components/debtors/DebtorsTab'
import AgingReport from './components/aging/AgingReport'
import RatesTab from './components/rates/RatesTab'
import AdminLog from './components/admin/AdminLog'

function TabContent({ tab, isSuperAdmin }) {
  const map = {
    dashboard: <Dashboard />,
    inventory: <InventoryManagement />,
    sales:     <SalesTab />,
    debtors:   <DebtorsTab />,
    aging:     <AgingReport />,
    ...(isSuperAdmin ? { rates: <RatesTab />, admin: <AdminLog /> } : {}),
  }
  return map[tab] || (
    <div className="flex-1 flex items-center justify-center p-8">
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
          <div className="w-8 h-8 border-[3px] border-primary-md border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-ink-3 font-body text-sm mt-3">Loading…</p>
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
      {/* pb-24 clears the fixed bottom nav on mobile */}
      <main className="flex-1 pb-24 sm:pb-10">
        <TabContent tab={activeTab} isSuperAdmin={isSuperAdmin} />
      </main>
      <Toast />
    </div>
  )
}
