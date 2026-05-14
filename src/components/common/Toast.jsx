import { useApp } from '../../context/AppContext'

const ICONS = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' }

const STYLES = {
  success: 'bg-white border-l-4 border-l-success text-ink shadow-card-hover',
  error:   'bg-white border-l-4 border-l-danger  text-ink shadow-card-hover',
  warning: 'bg-white border-l-4 border-l-warning  text-ink shadow-card-hover',
  info:    'bg-white border-l-4 border-l-primary  text-ink shadow-card-hover',
}

const ICON_COLOR = { success: 'text-success', error: 'text-danger', warning: 'text-warning', info: 'text-primary' }

export default function Toast() {
  const { toasts, dismissToast } = useApp()

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => dismissToast(t.id)}
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-card border border-border-lt
            animate-slide-up cursor-pointer select-none ${STYLES[t.type] || STYLES.info}`}
        >
          <span className={`text-base font-bold shrink-0 ${ICON_COLOR[t.type] || ICON_COLOR.info}`}>
            {ICONS[t.type] || ICONS.info}
          </span>
          <p className="font-body text-sm flex-1 text-ink-2">{t.message}</p>
          <span className="text-ink-4 text-xs shrink-0">✕</span>
        </div>
      ))}
    </div>
  )
}
