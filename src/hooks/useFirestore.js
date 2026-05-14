import { useState, useEffect, useRef } from 'react'

/**
 * Generic hook for Firestore onSnapshot subscriptions.
 * Handles loading, error, and automatic cleanup.
 *
 * @param {Function} subscribeFn - (callback, onError) => unsubscribe
 * @param {Array}    deps        - re-subscribe when these change
 */
export function useFirestoreSubscription(subscribeFn, deps = []) {
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)

    const unsub = subscribeFn(
      (result) => { setData(result); setLoading(false) },
      (err)    => { setError(err);   setLoading(false) }
    )

    return () => { if (typeof unsub === 'function') unsub() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { data, loading, error }
}
