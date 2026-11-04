import { useCallback, useEffect, useRef, useState } from 'react'

/** Copies text and exposes a short-lived "copied" key for button feedback. */
export function useClipboard(resetMs = 1800) {
  const [copied, setCopied] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const copy = useCallback(
    async (key: string, text: string) => {
      try {
        await navigator.clipboard.writeText(text)
        setFailed(false)
        setCopied(key)
      } catch {
        setFailed(true)
        setCopied(null)
      }
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => {
        setCopied(null)
        setFailed(false)
      }, resetMs)
    },
    [resetMs],
  )

  return { copy, copied, failed }
}
