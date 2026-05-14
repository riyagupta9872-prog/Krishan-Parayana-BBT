export const fmt = {
  currency: (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`,
  date: (ts) => {
    if (!ts) return '—'
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  },
  dateTime: (ts) => {
    if (!ts) return '—'
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  },
  shortDate: (ts) => {
    if (!ts) return '—'
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
  },
  daysSince: (ts) => {
    if (!ts) return 0
    const d = ts.toDate ? ts.toDate() : new Date(ts)
    return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24))
  },
  phone: (p) => p ? p.replace(/(\d{5})(\d{5})/, '$1 $2') : '—',
  initials: (name) => name ? name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase() : '?',
  truncate: (str, len = 40) => str && str.length > len ? str.slice(0, len) + '…' : str || '',
}

export const agingBucket = (days) => {
  if (days <= 30) return { label: 'Current', color: 'text-success', bg: 'bg-success/20', border: 'border-success/30' }
  if (days <= 60) return { label: '30–60 Days', color: 'text-yellow-400', bg: 'bg-yellow-400/20', border: 'border-yellow-400/30' }
  if (days <= 90) return { label: '60–90 Days', color: 'text-orange-400', bg: 'bg-orange-400/20', border: 'border-orange-400/30' }
  if (days <= 120) return { label: '90–120 Days', color: 'text-danger', bg: 'bg-danger/20', border: 'border-danger/30' }
  return { label: '120+ Days', color: 'text-red-400', bg: 'bg-red-400/20', border: 'border-red-400/30' }
}

export const saleTypeBadge = (type) => {
  const map = {
    cash: { label: 'Cash', color: 'text-success bg-success/20' },
    credit: { label: 'Credit', color: 'text-primary bg-primary/20' },
    gift: { label: 'Gift', color: 'text-gold bg-gold/20' },
  }
  return map[type] || { label: type, color: 'text-cream-muted bg-cream-dim' }
}

export const statusBadge = (status) => {
  const map = {
    active: { label: 'Active', color: 'text-success bg-success/20 border border-success/30' },
    settled: { label: 'Settled', color: 'text-cream-muted bg-cream-dim border border-cream-dim' },
    blocked: { label: 'Blocked', color: 'text-danger bg-danger/20 border border-danger/30' },
    credit: { label: 'Credit', color: 'text-gold bg-gold/20 border border-gold/30' },
  }
  return map[status] || { label: status, color: 'text-cream-muted' }
}
