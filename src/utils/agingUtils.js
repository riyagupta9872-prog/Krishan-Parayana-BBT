export const AGING_BUCKETS = [
  { key: 'current', label: 'Current', min: 0, max: 30, color: '#4A7C59', textColor: 'text-success' },
  { key: 'days30_60', label: '30–60 Days', min: 31, max: 60, color: '#EAB308', textColor: 'text-yellow-400' },
  { key: 'days60_90', label: '60–90 Days', min: 61, max: 90, color: '#F97316', textColor: 'text-orange-400' },
  { key: 'days90_120', label: '90–120 Days', min: 91, max: 120, color: '#C4556A', textColor: 'text-danger' },
  { key: 'days120plus', label: '120+ Days', min: 121, max: Infinity, color: '#EF4444', textColor: 'text-red-400' },
]

export function computeAgingForDebtor(ledgerEntries) {
  const now = Date.now()
  const bills = []
  const openDebits = []

  for (const entry of ledgerEntries) {
    if (entry.type === 'debit' || entry.type === 'opening') {
      const entryDate = entry.date?.toDate ? entry.date.toDate() : new Date(entry.date)
      bills.push({
        id: entry.id,
        date: entryDate,
        amount: entry.amount,
        paid: entry.paidAmount || 0,
        outstanding: entry.amount - (entry.paidAmount || 0),
        days: Math.floor((now - entryDate.getTime()) / 86400000),
        billStatus: entry.billStatus || 'open',
      })
    }
  }

  const buckets = {}
  AGING_BUCKETS.forEach((b) => { buckets[b.key] = 0 })

  for (const bill of bills) {
    if (bill.outstanding <= 0) continue
    const bucket = AGING_BUCKETS.find((b) => bill.days >= b.min && bill.days <= b.max)
    if (bucket) buckets[bucket.key] += bill.outstanding
  }

  return { bills, buckets }
}

export function computeAgingReport(debtors, ledgerMap) {
  const report = []
  const totals = {}
  AGING_BUCKETS.forEach((b) => { totals[b.key] = 0 })
  let totalOutstanding = 0

  for (const debtor of debtors) {
    const entries = ledgerMap[debtor.id] || []
    const { bills, buckets } = computeAgingForDebtor(entries)
    const balance = debtor.currentBalance || 0
    if (balance <= 0) continue

    AGING_BUCKETS.forEach((b) => { totals[b.key] += buckets[b.key] })
    totalOutstanding += balance

    report.push({ debtor, bills, buckets, balance })
  }

  return { report, totals, totalOutstanding }
}

export function getBucketForDays(days) {
  return AGING_BUCKETS.find((b) => days >= b.min && days <= b.max)
}

export function shouldBlockCreditSale(buckets) {
  return (buckets.days90_120 || 0) + (buckets.days120plus || 0) > 0
}

export function getCreditWarningLevel(buckets) {
  if (shouldBlockCreditSale(buckets)) return 'block'
  if ((buckets.days60_90 || 0) > 0) return 'orange'
  if ((buckets.days30_60 || 0) > 0) return 'yellow'
  return 'none'
}
