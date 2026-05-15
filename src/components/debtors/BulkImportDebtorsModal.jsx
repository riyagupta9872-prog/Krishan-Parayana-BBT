import { useState } from 'react'
import Modal from '../common/Modal'
import { useAuth } from '../../context/AuthContext'
import { useApp } from '../../context/AppContext'
import { debtorService } from '../../services/debtorService'

const TEMPLATE_CSV = `Name,Phone,Team,Reference,Opening Balance
Rama Devi Dasi,9876543210,Sakhi Sang,Sunita Mataji,500
Gita Devi Dasi,9123456780,Youth Forum,,0`

function downloadTemplate() {
  const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv' })
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
  a.download = 'debtors_import_template.csv'; a.click()
}

function parseCSV(text) {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return []
  const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/\s+/g,''))
  return lines.slice(1).map((line, i) => {
    const cols = line.split(',').map(c => c.trim())
    const get = (...keys) => {
      for (const k of keys) {
        const idx = headers.findIndex(h => h.includes(k))
        if (idx !== -1 && cols[idx]) return cols[idx]
      }
      return ''
    }
    return {
      _row:           i + 2,
      name:           get('name'),
      phone:          get('phone','mobile','number').replace(/\D/g,'').slice(-10),
      teamName:       get('team'),
      reference:      get('reference','ref','referred'),
      openingBalance: Number(get('opening','balance','amount','outstanding')) || 0,
      creditLimit:    0,
    }
  })
}

export default function BulkImportDebtorsModal({ isOpen, onClose }) {
  const { user } = useAuth()
  const { showToast } = useApp()
  const [rows,     setRows]     = useState([])
  const [errors,   setErrors]   = useState([])
  const [loading,  setLoading]  = useState(false)
  const [done,     setDone]     = useState(false)

  const handleFile = (e) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const parsed = parseCSV(ev.target.result)
      const errs = []
      parsed.forEach((r) => {
        if (!r.name) errs.push(`Row ${r._row}: Name is required`)
        if (r.phone.length !== 10) errs.push(`Row ${r._row}: Invalid phone — ${r.phone || '(empty)'}`)
      })
      setRows(parsed); setErrors(errs); setDone(false)
    }
    reader.readAsText(file)
  }

  const handleImport = async () => {
    if (errors.length > 0) { showToast('Fix errors before importing', 'error'); return }
    if (rows.length === 0) { showToast('No rows to import', 'error'); return }
    setLoading(true)
    let success = 0, failed = 0
    for (const row of rows) {
      try {
        await debtorService.add(row, user.uid)
        success++
      } catch { failed++ }
    }
    setLoading(false); setDone(true)
    showToast(`Imported ${success} debtors${failed ? `, ${failed} failed` : ''}`, success > 0 ? 'success' : 'error')
    if (success > 0 && failed === 0) { setRows([]); setErrors([]); onClose() }
  }

  const handleClose = () => { setRows([]); setErrors([]); setDone(false); onClose() }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Bulk Import Debtors" size="lg"
      footer={
        <>
          <button onClick={handleClose} className="btn-secondary">Cancel</button>
          {rows.length > 0 && !done && (
            <button onClick={handleImport} disabled={loading || errors.length > 0} className="btn-primary">
              {loading ? 'Importing…' : `Import ${rows.length} Debtors`}
            </button>
          )}
        </>
      }>
      <div className="space-y-4">
        {/* Step 1 — Download template */}
        <div className="card border-border-blue bg-primary-lt">
          <p className="text-ink font-semibold text-sm mb-2">Step 1 — Download the CSV template</p>
          <p className="text-ink-3 text-xs mb-3">Fill in: <strong>Name, Phone, Team, Reference, Opening Balance</strong> (one debtor per row)</p>
          <button onClick={downloadTemplate} className="btn-secondary text-xs px-3 py-2">⬇ Download Template CSV</button>
        </div>

        {/* Step 2 — Upload */}
        <div>
          <p className="font-semibold text-sm text-ink mb-2">Step 2 — Upload filled CSV</p>
          <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border-blue rounded-xl p-6 cursor-pointer hover:bg-primary-lt transition-colors">
            <span className="text-3xl">📂</span>
            <span className="text-ink-3 text-sm">Click to choose CSV file</span>
            <input type="file" accept=".csv,text/csv" onChange={handleFile} className="hidden" />
          </label>
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="card border-red-200 bg-danger-lt space-y-1">
            <p className="text-danger font-semibold text-sm">⚠ {errors.length} error(s) — fix in your file and re-upload</p>
            {errors.map((e, i) => <p key={i} className="text-danger text-xs">{e}</p>)}
          </div>
        )}

        {/* Preview */}
        {rows.length > 0 && errors.length === 0 && (
          <div>
            <p className="font-semibold text-sm text-ink mb-2">Preview ({rows.length} rows)</p>
            <div className="card overflow-hidden p-0 max-h-60 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    {['Name','Phone','Team','Reference','Opening Bal'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-ink-3 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-t border-border-lt">
                      <td className="px-3 py-2 text-ink font-medium">{r.name}</td>
                      <td className="px-3 py-2 text-ink-3">{r.phone}</td>
                      <td className="px-3 py-2 text-ink-3">{r.teamName || '—'}</td>
                      <td className="px-3 py-2 text-ink-3">{r.reference || '—'}</td>
                      <td className="px-3 py-2 text-ink-3">{r.openingBalance > 0 ? `₹${r.openingBalance}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
