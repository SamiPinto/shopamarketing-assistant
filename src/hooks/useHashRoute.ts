import { useCallback, useEffect, useState } from 'react'

/** Minimal hash router for the dashboard (extension pages have no server routing). */
export function useHashRoute<T extends string>(routes: readonly T[], fallback: T) {
  const read = useCallback((): T => {
    const hash = window.location.hash.replace(/^#/, '') as T
    return routes.includes(hash) ? hash : fallback
  }, [routes, fallback])

  const [route, setRoute] = useState<T>(read)

  useEffect(() => {
    const onChange = () => setRoute(read())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [read])

  const navigate = useCallback((next: T) => {
    if (window.location.hash !== `#${next}`) window.location.hash = next
  }, [])

  return [route, navigate] as const
}
