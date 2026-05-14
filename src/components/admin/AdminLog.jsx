import { useState, useEffect } from 'react'
import { auditService } from '../../services/auditService'
import { useFirestoreSubscription } from '../../hooks/useFirestore'
import { fmt } from '../../utils/formatters'
import { PageLoader } from '../common/LoadingSpinner'
import FirestoreRulesAlert from '../common/FirestoreRulesAlert'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../services/firebase'

function UserManagement() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDocs(collection(db,'users'))
      .then(snap=>setUsers(snap.docs.map(d=>({id:d.id,...d.data()}))))
      .catch(()=>setUsers([]))
      .finally(()=>setLoading(false))
  }, [])

  if (loading) return <div className="py-6 flex justify-center"><div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin"/></div>

  return (
    <div className="space-y-4">
      <div className="card-blue text-xs text-ink-3">
        To create accounts and assign the <strong>Super Admin</strong> role: go to <strong>Firebase Console → Authentication</strong> and set the custom claim <code className="bg-primary-md text-primary px-1 rounded">superAdmin: true</code> via Firebase Admin SDK or a Cloud Function.
      </div>
      {users.length>0 ? (
        <div className="space-y-2">
          {users.map(u=>(
            <div key={u.id} className="card flex items-center justify-between">
              <div><p className="text-ink font-semibold text-sm">{u.displayName||u.email}</p><p className="text-ink-3 text-xs">{u.email}</p></div>
              <span className={`badge ${u.superAdmin?'badge-blue':'badge-gray'}`}>{u.superAdmin?'★ Super Admin':'User'}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-8 border-dashed"><p className="text-ink-3 text-sm">No users in Firestore <code>users</code> collection.</p></div>
      )}
    </div>
  )
}

const ACTION_COLORS = {
  VOID_TRANSACTION:'badge-red', STOCK_ADJUST:'badge-amber',
  PRICE_CHANGE:'badge-blue', BLOCK_DEBTOR:'bg-orange-100 text-orange-700',
}

export default function AdminLog() {
  const [view,   setView]   = useState('audit')
  const [filter, setFilter] = useState('all')

  const { data: auditLogs, loading, error } = useFirestoreSubscription(
    (cb,e) => auditService.subscribe(cb,e)
  )

  if (loading) return <PageLoader />

  const ACTION_TYPES = ['all','VOID_TRANSACTION','STOCK_ADJUST','PRICE_CHANGE','BLOCK_DEBTOR']
  const filtered = auditLogs.filter(l=>filter==='all'||l.actionType===filter)

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-4">
      <FirestoreRulesAlert error={error} />

      <div className="flex items-center justify-between">
        <h2 className="page-title">Admin Controls</h2>
        <div className="flex gap-2">
          {[{id:'audit',l:'🔍 Audit Log'},{id:'users',l:'👥 Users'}].map(({id,l})=>(
            <button key={id} onClick={()=>setView(id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${view===id?'bg-primary text-white border-primary':'bg-white border-border-lt text-ink-3'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {view==='users' ? <UserManagement/> : (
        <>
          <div className="flex gap-2 flex-wrap">
            {ACTION_TYPES.map(t=>(
              <button key={t} onClick={()=>setFilter(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${filter===t?'bg-primary text-white border-primary':'bg-white border-border-lt text-ink-3'}`}>
                {t==='all'?'All Actions':t.replace(/_/g,' ')}
              </button>
            ))}
          </div>
          {filtered.length===0 ? (
            <div className="card text-center py-10 border-dashed"><p className="text-ink-3">No admin actions logged</p></div>
          ) : (
            <div className="space-y-2">
              {filtered.map(log=>{
                let after={}; try{after=JSON.parse(log.after||'{}')}catch{}
                return (
                  <div key={log.id} className="card hover:shadow-card-hover transition-shadow">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className={`badge text-xs ${ACTION_COLORS[log.actionType]||'badge-gray'}`}>{log.actionType?.replace(/_/g,' ')}</span>
                      <span className="text-ink-4 text-xs">{fmt.dateTime(log.timestamp)}</span>
                    </div>
                    <p className="text-ink-2 text-xs mt-1.5">Entity: <span className="font-mono text-ink-3">{log.entityId}</span></p>
                    <p className="text-ink-3 text-xs">Admin: <span className="font-mono">{log.adminUid?.slice(0,12)}…</span></p>
                    {after.voidReason && <p className="text-danger text-xs mt-1 italic">Reason: "{after.voidReason}"</p>}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
