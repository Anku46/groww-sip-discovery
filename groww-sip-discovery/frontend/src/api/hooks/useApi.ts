import { useEffect, useRef, useState } from 'react'
import { errorMessage } from '../client'

export interface ApiState<T> {
  data: T | null
  loading: boolean
  error: string | null
  reload: () => void
}

/**
 * Fetch on mount and whenever `deps` change. A newer request aborts the older one, so a slow earlier
 * response can never overwrite a newer one (rapid filter changes).
 */
export function useApi<T>(fetcher: (signal: AbortSignal) => Promise<T>, deps: unknown[], opts: { debounceMs?: number } = {}): ApiState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    const timer = setTimeout(() => {
      fetcherRef.current(controller.signal)
        .then((d) => { if (!controller.signal.aborted) { setData(d); setLoading(false) } })
        .catch((e) => { if (!controller.signal.aborted) { setError(errorMessage(e)); setLoading(false) } })
    }, opts.debounceMs ?? 0)
    return () => { clearTimeout(timer); controller.abort() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce])

  return { data, loading, error, reload: () => setNonce((n) => n + 1) }
}
