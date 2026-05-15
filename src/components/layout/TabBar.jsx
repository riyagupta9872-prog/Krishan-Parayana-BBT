import { useAuth } from '../../context/AuthContext'
import { useApp } from '../../context/AppContext'

const USER_TABS = [
  { id: 'dashboard',  label: 'Home',       icon: '🏠' },
  { id: 'inventory',  label: 'Inventory',  icon: '📦' },
  { id: 'sales',      label: 'Sales',      icon: '🧾' },
  { id: 'debtors',    label: 'Debtors',    icon: '👥' },
  { id: 'aging',      label: 'Aging',      icon: '📊' },
]
const ADMIN_TABS = [
  { id: 'admin', label: 'Admin', icon: '🔐' },
]

export default function TabBar() {
  const { isSuperAdmin } = useAuth()
  const { activeTab, setActiveTab } = useApp()
  const tabs = isSuperAdmin ? [...USER_TABS, ...ADMIN_TABS] : USER_TABS

  return (
    <>
      {/* ── Desktop top strip ─────────────────────────────────────── */}
      <nav className="hidden sm:block sticky top-[57px] z-20 bg-white border-b border-border-lt shadow-sm">
        <div className="overflow-x-auto scrollbar-none">
          <div className="flex items-end min-w-max px-3 gap-0.5">
            {tabs.map(({ id, icon, label }) => {
              const active = activeTab === id
              return (
                <button key={id} onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-1.5 px-4 pt-2.5 pb-2 border-b-2 text-sm font-body whitespace-nowrap
                    transition-all duration-150 min-h-[44px] font-medium
                    ${active ? 'border-primary text-primary font-semibold' : 'border-transparent text-ink-3 hover:text-ink hover:border-border-md'}`}>
                  <span>{icon}</span><span>{label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </nav>

      {/* ── Mobile fixed bottom bar ───────────────────────────────── */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-border-lt shadow-[0_-2px_12px_rgba(15,23,42,0.08)]">
        <div className="overflow-x-auto scrollbar-none">
          <div className="flex items-stretch min-w-max">
            {tabs.map(({ id, icon, label }) => {
              const active = activeTab === id
              return (
                <button key={id} onClick={() => setActiveTab(id)}
                  className={`flex flex-col items-center justify-center gap-0.5 px-3.5 py-2 min-w-[64px] relative transition-all duration-150
                    ${active ? 'text-primary' : 'text-ink-3 active:text-primary'}`}>
                  {active && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />}
                  <span className={`text-xl leading-none transition-transform ${active ? 'scale-110' : ''}`}>{icon}</span>
                  <span className={`text-[10px] font-medium leading-tight whitespace-nowrap ${active ? 'text-primary font-semibold' : 'text-ink-3'}`}>{label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </nav>
    </>
  )
}
