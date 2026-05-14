import { useState } from 'react'

const RULES = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuth() {
      return request.auth != null;
    }
    match /{document=**} {
      allow read, write: if isAuth();
    }
  }
}`

export default function FirestoreRulesAlert({ error }) {
  const [copied, setCopied] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  if (!error) return null
  const isPermission = error?.code === 'permission-denied' || String(error).includes('permission')

  const copy = () => {
    navigator.clipboard.writeText(RULES).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  if (collapsed) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button onClick={() => setCollapsed(false)} className="bg-danger text-white text-xs font-body font-semibold px-3 py-2 rounded-pill shadow-modal flex items-center gap-2">
          ⚠ Firestore Rules
        </button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm">
      <div className="bg-white rounded-modal shadow-modal border border-red-200 w-full max-w-lg animate-slide-up">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-lt bg-danger-lt rounded-t-modal">
          <div className="flex items-center gap-2">
            <span className="text-danger text-xl">🔒</span>
            <h3 className="font-body font-bold text-danger text-sm">Firestore Access Denied</h3>
          </div>
          <button onClick={() => setCollapsed(true)} className="text-ink-3 hover:text-ink text-lg leading-none px-1">✕</button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <p className="text-ink-2 text-sm font-body">
            Firestore security rules are blocking all reads. The app loaded but can't fetch data.
            Fix this in <strong>3 steps</strong>:
          </p>

          <ol className="space-y-3 text-sm font-body text-ink-2">
            <li className="flex gap-3">
              <span className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</span>
              <span>Go to <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="text-primary underline font-medium">console.firebase.google.com</a> → select your project → <strong>Firestore Database → Rules</strong></span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</span>
              <span>Replace all existing rules with the code below</span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">3</span>
              <span>Click <strong>Publish</strong>, then refresh this page</span>
            </li>
          </ol>

          <div className="relative">
            <pre className="bg-slate-900 text-green-400 text-xs font-mono p-4 rounded-xl overflow-x-auto leading-relaxed">
              {RULES}
            </pre>
            <button
              onClick={copy}
              className={`absolute top-2 right-2 text-xs font-body font-semibold px-3 py-1.5 rounded-lg transition-all
                ${copied ? 'bg-success text-white' : 'bg-white/20 text-white hover:bg-white/30'}`}
            >
              {copied ? '✓ Copied!' : 'Copy'}
            </button>
          </div>

          <p className="text-ink-4 text-xs font-body">
            These rules allow any signed-in user to read and write all data. For production, you can tighten them later.
          </p>
        </div>
      </div>
    </div>
  )
}
