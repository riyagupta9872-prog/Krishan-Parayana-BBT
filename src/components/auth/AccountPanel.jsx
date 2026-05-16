import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useApp } from '../../context/AppContext'
import { db } from '../../services/firebase'
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore'
import { fmt } from '../../utils/formatters'

function EyeToggle({ show, onToggle }) {
  return (
    <button type="button" onClick={onToggle}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-4 hover:text-ink-2 transition-colors text-base leading-none">
      {show ? '🙈' : '👁'}
    </button>
  )
}

export default function AccountPanel({ onClose }) {
  const { user, isSuperAdmin, updateDisplayName, changePassword } = useAuth()
  const { showToast } = useApp()
  const [tab, setTab] = useState('profile')

  // Profile
  const [name,       setName]       = useState(user?.displayName || '')
  const [savingName, setSavingName] = useState(false)

  // Password
  const [curPass,    setCurPass]    = useState('')
  const [newPass,    setNewPass]    = useState('')
  const [confPass,   setConfPass]   = useState('')
  const [showCur,    setShowCur]    = useState(false)
  const [showNew,    setShowNew]    = useState(false)
  const [showConf,   setShowConf]   = useState(false)
  const [savingPass, setSavingPass] = useState(false)

  // Users (SA)
  const [users,        setUsers]        = useState([])
  const [loadingUsers, setLoadingUsers] = useState(false)

  useEffect(() => {
    if (tab === 'users' && isSuperAdmin) {
      setLoadingUsers(true)
      getDocs(collection(db, 'users'))
        .then((snap) => setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
        .catch(() => {})
        .finally(() => setLoadingUsers(false))
    }
  }, [tab, isSuperAdmin])

  const handleSaveName = async () => {
    if (!name.trim()) { showToast('Name required', 'error'); return }
    setSavingName(true)
    try {
      await updateDisplayName(name.trim())
      showToast('Name updated', 'success')
    } catch (err) { showToast(err.message, 'error') }
    finally { setSavingName(false) }
  }

  const handleChangePassword = async () => {
    if (!curPass)         { showToast('Enter current password', 'error'); return }
    if (newPass.length < 6) { showToast('New password must be at least 6 characters', 'error'); return }
    if (newPass !== confPass) { showToast('Passwords do not match', 'error'); return }
    setSavingPass(true)
    try {
      await changePassword(curPass, newPass)
      showToast('Password changed successfully', 'success')
      setCurPass(''); setNewPass(''); setConfPass('')
    } catch (err) {
      const msgs = {
        'auth/wrong-password':        'Current password is incorrect.',
        'auth/requires-recent-login': 'Session expired — please sign out and sign in again.',
        'auth/weak-password':         'New password is too weak.',
      }
      showToast(msgs[err.code] || err.message, 'error')
    } finally { setSavingPass(false) }
  }

  const toggleSA = async (u) => {
    if (u.id === user.uid) { showToast("You can't change your own role", 'error'); return }
    try {
      await updateDoc(doc(db, 'users', u.id), { superAdmin: !u.superAdmin })
      setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, superAdmin: !x.superAdmin } : x))
      showToast(`${u.displayName || u.email} is now ${!u.superAdmin ? 'Super Admin' : 'User'}`, 'success')
    } catch (err) { showToast(err.message, 'error') }
  }

  const tabs = [
    { id: 'profile',  label: '👤 Profile'  },
    { id: 'security', label: '🔒 Password' },
    ...(isSuperAdmin ? [{ id: 'users', label: '👥 Users' }] : []),
  ]

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-sm h-full flex flex-col shadow-modal overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-br from-primary to-primary-dk px-5 pt-5 pb-4 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center shrink-0">
                <span className="font-bold text-white text-base">{fmt.initials(user?.displayName || user?.email || 'U')}</span>
              </div>
              <div>
                <p className="text-white font-bold text-sm leading-tight">{user?.displayName || 'User'}</p>
                <p className="text-white/70 text-xs">{user?.email}</p>
                <p className="text-white/60 text-xs mt-0.5">{isSuperAdmin ? '★ Super Admin' : 'User'}</p>
              </div>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors">
              ✕
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border-lt bg-white shrink-0">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap px-1 transition-all
                ${tab === t.id ? 'border-primary text-primary' : 'border-transparent text-ink-3 hover:text-ink'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* ── Profile tab ── */}
          {tab === 'profile' && (
            <>
              <div>
                <label className="label">Display Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)}
                  className="input-field" placeholder="Your name" />
              </div>
              <div>
                <label className="label">Email</label>
                <input value={user?.email || ''} disabled
                  className="input-field bg-slate-50 text-ink-3 cursor-not-allowed" />
                <p className="text-ink-4 text-xs mt-1">Email cannot be changed here.</p>
              </div>
              <button onClick={handleSaveName} disabled={savingName} className="btn-primary w-full">
                {savingName ? 'Saving…' : 'Save Name'}
              </button>
            </>
          )}

          {/* ── Security tab ── */}
          {tab === 'security' && (
            <>
              <div>
                <label className="label">Current Password</label>
                <div className="relative">
                  <input type={showCur ? 'text' : 'password'} value={curPass}
                    onChange={(e) => setCurPass(e.target.value)}
                    className="input-field pr-10" placeholder="••••••" autoComplete="current-password" />
                  <EyeToggle show={showCur} onToggle={() => setShowCur((p) => !p)} />
                </div>
              </div>
              <div>
                <label className="label">New Password <span className="text-ink-4 font-normal">(min 6 chars)</span></label>
                <div className="relative">
                  <input type={showNew ? 'text' : 'password'} value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    className="input-field pr-10" placeholder="••••••" autoComplete="new-password" />
                  <EyeToggle show={showNew} onToggle={() => setShowNew((p) => !p)} />
                </div>
              </div>
              <div>
                <label className="label">Confirm New Password</label>
                <div className="relative">
                  <input type={showConf ? 'text' : 'password'} value={confPass}
                    onChange={(e) => setConfPass(e.target.value)}
                    className="input-field pr-10" placeholder="••••••" autoComplete="new-password" />
                  <EyeToggle show={showConf} onToggle={() => setShowConf((p) => !p)} />
                </div>
              </div>
              <button onClick={handleChangePassword} disabled={savingPass} className="btn-primary w-full">
                {savingPass ? 'Changing…' : 'Change Password'}
              </button>
            </>
          )}

          {/* ── Users tab (SA only) ── */}
          {tab === 'users' && isSuperAdmin && (
            <>
              {loadingUsers ? (
                <div className="flex justify-center py-10">
                  <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                </div>
              ) : users.length === 0 ? (
                <p className="text-ink-3 text-sm text-center py-10">No users found.</p>
              ) : (
                <div className="space-y-2">
                  {users.map((u) => (
                    <div key={u.id} className="card flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary-md border border-primary/20 flex items-center justify-center shrink-0">
                        <span className="text-primary text-xs font-bold">{fmt.initials(u.displayName || u.email || 'U')}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-ink font-semibold text-sm truncate">
                          {u.displayName || u.email?.split('@')[0]}
                          {u.id === user.uid && <span className="text-primary text-xs font-normal ml-1">(you)</span>}
                        </p>
                        <p className="text-ink-4 text-xs truncate">{u.email}</p>
                      </div>
                      <button
                        onClick={() => toggleSA(u)}
                        disabled={u.id === user.uid}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all shrink-0
                          ${u.id === user.uid ? 'opacity-40 cursor-not-allowed border-border-lt text-ink-3' :
                            u.superAdmin
                              ? 'bg-primary-lt border-border-blue text-primary hover:bg-danger-lt hover:border-red-200 hover:text-danger'
                              : 'bg-slate-50 border-border-lt text-ink-3 hover:bg-primary-lt hover:border-border-blue hover:text-primary'
                          }`}>
                        {u.superAdmin ? '★ Admin' : 'User'}
                      </button>
                    </div>
                  ))}
                  <p className="text-ink-4 text-xs text-center pt-2">
                    Click a user's role badge to promote or demote.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
