import { useEffect } from 'react'

export default function Modal({ isOpen, onClose, title, children, size = 'md', footer }) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  const sizes = {
    sm:   'max-w-sm',
    md:   'max-w-md',
    lg:   'max-w-lg',
    xl:   'max-w-xl',
    '2xl':'max-w-2xl',
    full: 'max-w-full mx-4',
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-ink/40 backdrop-blur-sm animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={`relative w-full ${sizes[size]} bg-white border border-border-lt rounded-t-modal sm:rounded-modal shadow-modal animate-slide-up max-h-[92vh] flex flex-col`}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-lt shrink-0">
          <h2 className="font-display text-primary text-sm font-bold tracking-wide">{title}</h2>
          <button
            onClick={onClose}
            className="btn-icon text-ink-3 hover:text-ink"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4">{children}</div>
        {/* Footer */}
        {footer && (
          <div className="px-5 py-4 border-t border-border-lt bg-panel-bg shrink-0 flex gap-3 justify-end rounded-b-modal">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
