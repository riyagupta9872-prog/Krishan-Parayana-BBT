import { useApp } from '../../context/AppContext'

export default function OfflineBanner() {
  const { isOnline } = useApp()
  if (isOnline) return null
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-warning text-white text-center py-2 px-4 text-sm font-body font-medium flex items-center justify-center gap-2">
      <span>📶</span>
      <span>You are offline — data is cached and will sync when connection is restored.</span>
    </div>
  )
}
