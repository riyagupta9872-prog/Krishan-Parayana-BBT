export default function LoadingSpinner({ size = 'md', text }) {
  const sizes = { sm: 'w-4 h-4 border-2', md: 'w-8 h-8 border-2', lg: 'w-12 h-12 border-4' }
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className={`${sizes[size]} border-primary/20 border-t-primary rounded-full animate-spin`} />
      {text && <p className="font-body text-sm text-ink-3">{text}</p>}
    </div>
  )
}

export function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-64">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary-md border-t-primary rounded-full animate-spin" />
        <p className="font-body text-ink-3 text-sm">Loading…</p>
      </div>
    </div>
  )
}
