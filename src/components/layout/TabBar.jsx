import { useAuth } from '../../context/AuthContext'
import { useApp } from '../../context/AppContext'

const USER_TABS = [
  { id: 'dashboard',   label: 'Home',        icon: '🏠' },
  { id: 'apparel',     label: 'Apparel',      icon: '👘' },
  { id: 'accessories', label: 'Accessories',  icon: '📿' },
  { id: 'books',       label: 'Books',        icon: '📚' },
  { id: 'debtors',     label: 'Debtors',      icon: '👥' },
  { id: 'receiving',   label: 'Receiving',    icon: '📦' },
  { id: 'aging',       label: 'Aging',        icon: '📊' },
]
const ADMIN_TABS = [
  { id: 'rates', label: 'Rates',     icon: '₹'  },
  { id: 'admin', label: 'Admin',     icon: '🔐' },
]

export default function TabBar() {
  const { isSuperAdmin } = useAuth()
  const { activeTab, setActiveTab } = useApp()

  const tabs = isSuperAdmin ? [...USER_TABS, ...ADMIN_TABS] : USER_TABS

  return (
    <>
      {/* ── Desktop: horizontal tab strip below header ────────────────── */}
      <nav className="hidden sm:block sticky top-[57px] z-20 bg-white border-b border-border-lt shadow-sm">
        <div className="overflow-x-auto scrollbar-none">
          <div className="flex items-end min-w-max px-3 gap-0.5">
            {tabs.map((tab) => {
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 pt-2.5 pb-2 border-b-2 text-xs font-body whitespace-nowrap
                    transition-all duration-150 min-h-[44px] font-medium
                    ${active
                      ? 'border-primary text-primary font-semibold'
                      : 'border-transparent text-ink-3 hover:text-ink hover:border-border-md'
                    }`}
                >
                  <span className="text-sm leading-none">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </nav>

      {/* ── Mobile: fixed bottom navigation bar ──────────────────────── */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-border-lt shadow-[0_-2px_12px_rgba(15,23,42,0.08)]">
        <div className="overflow-x-auto scrollbar-none">
          <div className="flex items-stretch min-w-max">
            {tabs.map((tab) => {
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center justify-center gap-0.5 px-3.5 py-2 min-w-[64px]
                    transition-all duration-150 relative
                    ${active ? 'text-primary' : 'text-ink-3 active:text-primary'}`}
                >
                  {/* Active indicator pill at top */}
                  {active && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
                  )}

                  {/* Icon */}
                  <span className={`text-xl leading-none transition-transform duration-150 ${active ? 'scale-110' : ''}`}>
                    {tab.icon}
                  </span>

                  {/* Label */}
                  <span className={`text-[10px] font-body font-medium leading-tight whitespace-nowrap
                    ${active ? 'text-primary font-semibold' : 'text-ink-3'}`}>
                    {tab.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </nav>
    </>
  )
}
