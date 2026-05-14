import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) { setError('Please enter your email and password.'); return }
    setLoading(true); setError('')
    try {
      await login(email, password)
    } catch (err) {
      const msgs = {
        'auth/invalid-credential': 'Invalid email or password.',
        'auth/user-not-found':     'No account found with this email.',
        'auth/wrong-password':     'Incorrect password.',
        'auth/too-many-requests':  'Too many attempts. Please try again later.',
      }
      setError(msgs[err.code] || 'Sign in failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-app-bg flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background shapes */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-primary/8 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-accent/8 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-md/30 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo block */}
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
          <p className="font-body text-ink-3 text-xs mt-1.5 italic">
            Hare Krishna 🙏
          </p>
        </div>

        {/* Login card */}
        <div className="bg-white rounded-modal shadow-modal border border-border-lt p-6">
          <h2 className="font-body text-ink font-semibold text-base mb-5 text-center">
            Sign in to your account
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="you@example.com"
                autoComplete="email"
                autoFocus
              />
            </div>

            <div>
              <label className="label">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="bg-danger-lt border border-red-200 rounded-lg px-4 py-2.5 flex items-start gap-2">
                <span className="text-danger text-sm shrink-0 mt-0.5">✕</span>
                <p className="text-danger text-sm font-body">{error}</p>
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-sm mt-1">
              {loading
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Signing In…</>
                : 'Sign In'
              }
            </button>
          </form>
        </div>

        <p className="text-center text-ink-3 text-xs font-body mt-5">
          No account? Contact your Super Admin to get access.
        </p>
      </div>
    </div>
  )
}
