import { useState, useEffect } from 'react'
import { lookupDevoteeByPhone, computeCompletion } from '../../services/directoryService'
import { fmt } from '../../utils/formatters'

/* ── Circular progress ring ─────────────────────────────────────── */
function CompletionRing({ pct = 0 }) {
  const r = 22, circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  const color = pct >= 70 ? '#16A34A' : pct >= 40 ? '#D97706' : '#DC2626'
  return (
    <div className="flex flex-col items-center gap-0.5 shrink-0">
      <svg width="52" height="52" className="-rotate-90">
        <circle cx="26" cy="26" r={r} fill="none" stroke="#E2E8F0" strokeWidth="4" />
        <circle cx="26" cy="26" r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.6s ease' }} />
      </svg>
      <p className="font-bold text-ink text-xs -mt-9 absolute" style={{ color }}>{pct}%</p>
      <p className="text-ink-4 text-[10px] font-medium mt-6">COMPLETE</p>
    </div>
  )
}

/* ── Field row ───────────────────────────────────────────────────── */
function Field({ label, value, half }) {
  return (
    <div className={half ? '' : 'col-span-2'}>
      <p className="text-ink-4 text-[11px] font-medium uppercase tracking-wide mb-0.5">{label}</p>
      <p className={`text-sm font-body ${value ? 'text-ink font-medium' : 'text-ink-4'}`}>
        {value || '—'}
      </p>
    </div>
  )
}

/* ── Section wrapper ─────────────────────────────────────────────── */
function Section({ title, icon, children }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 pb-2 border-b border-border-lt">
        <span className="text-base">{icon}</span>
        <h4 className="font-body font-semibold text-primary text-sm">{title}</h4>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-3">{children}</div>
    </div>
  )
}

/* ── Badge ───────────────────────────────────────────────────────── */
function Badge({ label, color = 'blue' }) {
  const cls = {
    blue:   'bg-primary-md text-primary border border-border-blue',
    green:  'bg-success-lt text-success border border-green-200',
    amber:  'bg-warning-lt text-warning border border-amber-200',
    gray:   'bg-slate-100 text-slate-600 border border-slate-200',
    red:    'bg-danger-lt text-danger border border-red-200',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-pill text-xs font-semibold ${cls[color]||cls.gray}`}>
      {label}
    </span>
  )
}

/* ── Main modal ──────────────────────────────────────────────────── */
const TABS = [
  { id: 'identity',     label: 'Identity',     icon: '👤' },
  { id: 'spiritual',    label: 'Sadhana',      icon: '🕉️' },
  { id: 'professional', label: 'Professional', icon: '💼' },
  { id: 'family',       label: 'Family',       icon: '🏠' },
  { id: 'notes',        label: 'Notes',        icon: '📝' },
]

export default function DevoteeDirectoryModal({ phone, name, onClose }) {
  const [profile,  setProfile]  = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [activeTab, setActiveTab] = useState('identity')

  useEffect(() => {
    if (!phone) { setLoading(false); setNotFound(true); return }
    setLoading(true)
    lookupDevoteeByPhone(phone)
      .then((p) => { setProfile(p); if (!p) setNotFound(true) })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [phone])

  const displayName = profile?.name || name || 'Unknown'
  const initials = displayName.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
  const completion = computeCompletion(profile)

  const statusColor = (s) => {
    if (!s) return 'gray'
    if (s.includes('Most')) return 'green'
    if (s.includes('Serious') && !s.includes('Most')) return 'blue'
    if (s.includes('New')) return 'amber'
    if (s.includes('Inactive') || s.includes('Not')) return 'red'
    return 'gray'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-ink/50 backdrop-blur-sm animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="relative w-full max-w-xl bg-white rounded-t-modal sm:rounded-modal shadow-modal max-h-[92vh] flex flex-col animate-slide-up overflow-hidden">

        {/* ── Gradient header ────────────────────────────────────── */}
        <div className="relative bg-gradient-to-br from-primary to-primary-dk px-5 pt-5 pb-4 shrink-0">
          {/* Close */}
          <button onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all text-sm font-bold">
            ✕
          </button>

          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-14 h-14 rounded-full bg-white/20 border-2 border-white/50 flex items-center justify-center shrink-0">
              <span className="font-display text-white text-lg font-bold">{initials}</span>
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="font-display text-white text-lg font-bold leading-tight">{displayName}</h2>

              {/* Badges */}
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {profile?.teamName && (
                  <span className="bg-white/20 text-white text-xs font-semibold px-2.5 py-0.5 rounded-pill border border-white/30">
                    {profile.teamName}
                  </span>
                )}
                {profile?.devoteeStatus && (
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-pill
                    ${profile.devoteeStatus.includes('Most') ? 'bg-green-400/30 text-green-100 border border-green-300/40' :
                      profile.devoteeStatus.includes('Serious') ? 'bg-blue-300/30 text-blue-100 border border-blue-300/40' :
                      profile.devoteeStatus.includes('New') ? 'bg-amber-300/30 text-amber-100 border border-amber-200/40' :
                      'bg-white/20 text-white/70 border border-white/20'}`}>
                    {profile.devoteeStatus}
                  </span>
                )}
              </div>

              {/* Phone + contact buttons */}
              <div className="flex items-center gap-2 mt-2">
                <button onClick={() => window.open(`tel:${phone}`)}
                  className="w-8 h-8 rounded-full bg-white/20 hover:bg-green-400/40 border border-white/30 flex items-center justify-center transition-all text-sm">
                  📞
                </button>
                <button onClick={() => window.open(`https://wa.me/${phone}`)}
                  className="w-8 h-8 rounded-full bg-white/20 hover:bg-green-500/40 border border-white/30 flex items-center justify-center transition-all text-sm">
                  💬
                </button>
                <span className="text-white/80 text-sm font-body">{fmt.phone(phone)}</span>
              </div>
            </div>

            {/* Completion ring */}
            <div className="relative shrink-0 flex flex-col items-center">
              <CompletionRing pct={completion} />
            </div>
          </div>
        </div>

        {/* ── Tab bar ────────────────────────────────────────────── */}
        <div className="flex border-b border-border-lt bg-white overflow-x-auto scrollbar-none shrink-0">
          {TABS.map(({ id, label, icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex flex-col items-center gap-0.5 px-3 py-2.5 text-xs font-body font-semibold whitespace-nowrap min-w-[60px] flex-1 border-b-2 transition-all
                ${activeTab === id ? 'border-primary text-primary' : 'border-transparent text-ink-3 hover:text-ink'}`}>
              <span className="text-base leading-none">{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* ── Body ───────────────────────────────────────────────── */}
        <div className="overflow-y-auto flex-1 px-5 py-4 bg-panel-bg">
          {loading && (
            <div className="flex flex-col items-center gap-3 py-12">
              <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
              <p className="text-ink-3 text-sm">Fetching from Devotee Directory…</p>
            </div>
          )}

          {!loading && notFound && (
            <div className="text-center py-12">
              <p className="text-3xl mb-3">🔍</p>
              <p className="text-ink-2 font-semibold text-sm">Not found in directory</p>
              <p className="text-ink-3 text-xs mt-1">No devotee with mobile <strong>{fmt.phone(phone)}</strong> found in Sakhi Sang directory.</p>
            </div>
          )}

          {!loading && profile && (
            <div className="space-y-5">
              {/* ── Identity ──────────────────────────────────── */}
              {activeTab === 'identity' && (
                <>
                  <Section title="Personal Identity" icon="👤">
                    <Field label="Full Name"          value={profile.name}          half />
                    <Field label="Mobile (Primary)"   value={fmt.phone(profile.mobile)} half />
                    <Field label="Alternate Mobile"   value={fmt.phone(profile.mobileAlt)} half />
                    <Field label="Email"              value={profile.email}         half />
                    <Field label="Date of Birth"      value={profile.dob}           half />
                    <Field label="Date of Joining"    value={profile.dateOfJoining} half />
                    <Field label="Residential Address" value={profile.address} />
                  </Section>

                  <Section title="Organisation" icon="🏛️">
                    <Field label="Team"             value={profile.teamName}       half />
                    <Field label="Devotee Status"   value={profile.devoteeStatus}  half />
                    <Field label="Referred By"      value={profile.referenceBy}    half />
                    <Field label="Facilitator"      value={profile.facilitator}    half />
                    <Field label="Calling By"       value={profile.callingBy}      half />
                    <Field label="Calling Mode"     value={profile.callingMode}    half />
                  </Section>
                </>
              )}

              {/* ── Spiritual / Sadhana ───────────────────────── */}
              {activeTab === 'spiritual' && (
                <>
                  <Section title="Daily Sadhana" icon="🕉️">
                    <Field label="Chanting Rounds"   value={profile.chantingRounds} half />
                    <Field label="Kanthi Mala"       value={profile.kanthi      ? 'Yes ✓' : profile.kanthi === 0 ? 'No' : '—'} half />
                    <Field label="Gopi Dress"        value={profile.gopiDress   ? 'Yes ✓' : profile.gopiDress === 0 ? 'No' : '—'} half />
                    <Field label="Tilak"             value={profile.tilak       ? 'Yes ✓' : profile.tilak === 0 ? 'No' : '—'} half />
                    <Field label="Reading"           value={profile.reading}    half />
                    <Field label="Hearing"           value={profile.hearing}    half />
                  </Section>
                  <Section title="Kirtan" icon="🎵">
                    <Field label="Plays Instrument"  value={profile.playsInstrument} half />
                    <Field label="Instrument"        value={profile.instrumentName}  half />
                    <Field label="Wants Kirtan Class" value={profile.wantsKirtanClass} half />
                  </Section>
                  <Section title="Attendance" icon="📅">
                    <Field label="Lifetime Sessions"  value={profile.lifetimeAttendance} half />
                    <Field label="Prior Sessions"     value={profile.priorSessionsAttended} half />
                  </Section>
                </>
              )}

              {/* ── Professional ──────────────────────────────── */}
              {activeTab === 'professional' && (
                <Section title="Professional Details" icon="💼">
                  <Field label="Education"   value={profile.education}  half />
                  <Field label="Profession"  value={profile.profession} half />
                  <Field label="Skills"      value={profile.skills} />
                  <Field label="Hobbies"     value={profile.hobbies} />
                </Section>
              )}

              {/* ── Family ────────────────────────────────────── */}
              {activeTab === 'family' && (
                <Section title="Family Details" icon="🏠">
                  <Field label="Total Family Members"       value={profile.familyMembers}      half />
                  <Field label="Participating in Class"     value={profile.familyParticipants} half />
                  <Field label="Family Attitude"            value={profile.familyFavourable} />
                </Section>
              )}

              {/* ── Notes ─────────────────────────────────────── */}
              {activeTab === 'notes' && (
                <Section title="Remarks & Notes" icon="📝">
                  <Field label="Remarks" value={profile.remarks} />
                  {profile.isNotInterested && (
                    <div className="col-span-2 mt-2 bg-danger-lt border border-red-200 rounded-lg p-3">
                      <p className="text-danger text-xs font-semibold">Marked as Not Interested</p>
                      {profile.notInterestedAt && <p className="text-danger/70 text-xs">{fmt.date(profile.notInterestedAt)}</p>}
                    </div>
                  )}
                </Section>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────── */}
        <div className="px-5 py-3 border-t border-border-lt bg-white flex items-center justify-between shrink-0">
          <p className="text-ink-4 text-xs font-body">
            Source: Sakhi Sang Devotee Directory
            {profile && <span className="ml-1 text-primary font-semibold">· {completion}% profile complete</span>}
          </p>
          <button onClick={onClose} className="btn-secondary text-xs px-4 py-2 min-h-0 h-8">Close</button>
        </div>
      </div>
    </div>
  )
}
