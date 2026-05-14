import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import { fmt } from './formatters'
import { AGING_BUCKETS } from './agingUtils'

export function exportAgingToPDF(report, totals, totalOutstanding) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const now = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })

  doc.setFillColor(18, 8, 0)
  doc.rect(0, 0, 210, 40, 'F')
  doc.setTextColor(255, 107, 0)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('Spiritual BBT Corner', 105, 15, { align: 'center' })
  doc.setFontSize(12)
  doc.setTextColor(212, 160, 23)
  doc.text('Aging Analysis Report', 105, 25, { align: 'center' })
  doc.setFontSize(9)
  doc.setTextColor(200, 200, 200)
  doc.text(`Generated: ${now}`, 105, 33, { align: 'center' })

  doc.setTextColor(0, 0, 0)
  doc.setFontSize(11)
  doc.text(`Total Outstanding: ${fmt.currency(totalOutstanding)}`, 14, 50)
  doc.text(`Active Debtors: ${report.length}`, 14, 58)

  const bucketData = AGING_BUCKETS.map((b) => [b.label, fmt.currency(totals[b.key] || 0)])
  doc.autoTable({ startY: 65, head: [['Aging Bucket', 'Amount']], body: bucketData, theme: 'grid', headStyles: { fillColor: [255, 107, 0] } })

  const tableData = report.map((r) => [
    r.debtor.name, r.debtor.phone,
    fmt.currency(r.balance),
    fmt.currency(r.buckets.current),
    fmt.currency(r.buckets.days30_60),
    fmt.currency(r.buckets.days60_90),
    fmt.currency(r.buckets.days90_120),
    fmt.currency(r.buckets.days120plus),
  ])

  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 10,
    head: [['Debtor', 'Phone', 'Total', '0-30d', '30-60d', '60-90d', '90-120d', '120d+']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [18, 8, 0] },
    styles: { fontSize: 8 },
  })

  doc.save(`aging-report-${Date.now()}.pdf`)
}

export function exportToCSV(data, filename) {
  if (!data.length) return
  const keys = Object.keys(data[0])
  const csv = [keys.join(','), ...data.map((row) => keys.map((k) => JSON.stringify(row[k] ?? '')).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}-${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
