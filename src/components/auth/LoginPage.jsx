import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

export default function LoginPage() {
  const { login, signup } = useAuth()
  const [mode,     setMode]     = useState('signin')   // 'signin' | 'signup'
  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const reset = (newMode) => {
    setMode(newMode); setError('')
    setName(''); setEmail(''); setPassword(''); setConfirm('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (mode === 'signup') {
      if (!name.trim())          { setError('Please enter your name.'); return }
      if (!email.trim())         { setError('Please enter an email address.'); return }
      if (password.length < 6)   { setError('Password must be at least 6 characters.'); return }
      if (password !== confirm)  { setError('Passwords do not match.'); return }
    } else {
      if (!email || !password)   { setError('Please enter your email and password.'); return }
    }

    setLoading(true)
    try {
      if (mode === 'signup') await signup(email, password, name.trim())
      else                   await login(email, password)
    } catch (err) {
      const msgs = {
        'auth/email-already-in-use':  'An account with this email already exists.',
        'auth/invalid-email':         'Invalid email address.',
        'auth/weak-password':         'Password is too weak — use at least 6 characters.',
        'auth/invalid-credential':    'Invalid email or password.',
        'auth/user-not-found':        'No account found with this email.',
        'auth/wrong-password':        'Incorrect password.',
        'auth/too-many-requests':     'Too many attempts. Please try again later.',
      }
      setError(msgs[err.code] || err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const isSignUp = mode === 'signup'

  return (
    <div className="min-h-screen bg-app-bg flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-primary/8 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-accent/8 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl shadow-blue mb-4">
            <span className="text-white text-3xl">☸</span>
          </div>
          <h1 className="font-display text-primary text-xl font-bold tracking-wide mb-1">
            Spiritual BBT Corner
          </h1>
          <p className="font-body text-primary/70 text-sm font-medium">
            Inventory & Accounts Management
          </p>
          <p className="font-body text-ink-3 text-xs mt-1 italic">Hare Krishna 🙏</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-modal shadow-modal border border-border-lt overflow-hidden">

          {/* Tab switcher */}
          <div className="flex border-b border-border-lt">
            {[
              { id: 'signin', label: 'Sign In' },
              { id: 'signup', label: 'Create Account' },
            ].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => reset(id)}
                className={`flex-1 py-3.5 text-sm font-body font-semibold transition-all
                  ${mode === id
                    ? 'text-primary border-b-2 border-primary bg-primary-lt'
                    : 'text-ink-3 hover:text-ink hover:bg-slate-50'
                  }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">

            {/* Name — sign up only */}
            {isSignUp && (
              <div>
                <label className="label">Full Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field"
                  placeholder="Your name"
                  autoFocus
                />
              </div>
            )}

            <div>
              <label className="label">Email Address *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="you@example.com"
                autoComplete="email"
                autoFocus={!isSignUp}
              />
            </div>

            <div>
              <label className="label">Password * {isSignUp && <span className="text-ink-4">(min 6 chars)</span>}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="Enter password"
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
              />
            </div>

            {/* Confirm password — sign up only */}
            {isSignUp && (
              <div>
                <label className="label">Confirm Password *</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="input-field"
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                />
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-danger-lt border border-red-200 rounded-lg px-4 py-2.5 flex items-start gap-2">
                <span className="text-danger text-sm shrink-0 mt-0.5">✕</span>
                <p className="text-danger text-sm font-body">{error}</p>
              </div>
            )}

            {/* First-user note */}
            {isSignUp && (
              <div className="bg-primary-lt border border-border-blue rounded-lg px-4 py-2.5">
                <p className="text-primary text-xs font-body font-medium">
                  ★ First account created will automatically become <strong>Super Admin</strong>.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-sm mt-1"
            >
              {loading ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{isSignUp ? 'Creating Account…' : 'Signing In…'}</>
              ) : (
                isSignUp ? 'Create Account' : 'Sign In'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-ink-3 text-xs font-body mt-5">
          {isSignUp
            ? 'Already have an account? '
            : "Don't have an account? "
          }
          <button
            onClick={() => reset(isSignUp ? 'signin' : 'signup')}
            className="text-primary font-semibold underline underline-offset-2"
          >
            {isSignUp ? 'Sign In' : 'Create Account'}
          </button>
        </p>
      </div>
    </div>
  )
}
