import { useAuth } from '../../context/AuthContext'
import { useApp } from '../../context/AppContext'

const USER_TABS = [
  { id: 'dashboard',   label: 'Dashboard',    icon: '⬡' },
  { id: 'apparel',     label: 'Apparel',       icon: '👘' },
  { id: 'accessories', label: 'Accessories',   icon: '📿' },
  { id: 'books',       label: 'Books',         icon: '📚' },
  { id: 'debtors',     label: 'Debtors',       icon: '👥' },
  { id: 'receiving',   label: 'Receiving',     icon: '📦' },
  { id: 'aging',       label: 'Aging',         icon: '📊' },
]
const ADMIN_TABS = [
  { id: 'rates',  label: 'Rates',     icon: '₹' },
  { id: 'admin',  label: 'Admin Log', icon: '🔐' },
]

export default function TabBar() {
  const { isSuperAdmin } = useAuth()
  const { activeTab, setActiveTab } = useApp()

  const tabs = isSuperAdmin ? [...USER_TABS, ...ADMIN_TABS] : USER_TABS

  return (
    <nav className="sticky top-[57px] z-20 bg-white border-b border-border-lt shadow-sm">
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
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
