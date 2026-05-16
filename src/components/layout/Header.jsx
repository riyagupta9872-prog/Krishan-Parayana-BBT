import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useApp } from '../../context/AppContext'
import { fmt } from '../../utils/formatters'
import AccountPanel from '../auth/AccountPanel'

export default function Header() {
  const { user, isSuperAdmin, logout } = useAuth()
  const { isOnline } = useApp()
  const [showAccount, setShowAccount] = useState(false)

  return (
    <>
      <header className="sticky top-0 z-30 bg-white border-b border-border-lt shadow-card">
        <div className="flex items-center justify-between px-4 py-3 max-w-7xl mx-auto">

          {/* Logo + Title */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-sm shrink-0">
              <span className="text-white text-lg leading-none select-none">☸</span>
            </div>
            <div>
              <h1 className="font-display text-primary text-sm sm:text-base font-bold leading-tight tracking-wide">
                Krishan Parayana BBT
              </h1>
              <p className="text-ink-3 text-xs font-body hidden sm:block">
                Inventory & Accounts Management
              </p>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Online dot */}
            <div
              className={`w-2 h-2 rounded-full shrink-0 ${isOnline ? 'bg-success' : 'bg-warning'}`}
              title={isOnline ? 'Online' : 'Offline'}
            />

            {/* User info */}
            <div className="text-right hidden sm:block">
              <p className="text-ink font-body font-semibold text-xs truncate max-w-[120px]">
                {user?.displayName || user?.email?.split('@')[0]}
              </p>
              <p className={`text-xs font-body ${isSuperAdmin ? 'text-primary font-semibold' : 'text-ink-3'}`}>
                {isSuperAdmin ? '★ Super Admin' : 'User'}
              </p>
            </div>

            {/* Avatar — click to open account panel */}
            <button
              onClick={() => setShowAccount(true)}
              title="Account settings"
              className="w-8 h-8 rounded-full bg-primary-md border-2 border-primary/30 flex items-center justify-center shrink-0 hover:border-primary hover:bg-primary/20 transition-all">
              <span className="text-primary text-xs font-bold">
                {fmt.initials(user?.displayName || user?.email || 'U')}
              </span>
            </button>

            {/* Sign out */}
            <button
              onClick={logout}
              className="text-ink-3 hover:text-danger text-xs font-body px-2 py-1 rounded-lg hover:bg-danger-lt transition-colors"
              title="Sign Out"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {showAccount && <AccountPanel onClose={() => setShowAccount(false)} />}
    </>
  )
}
