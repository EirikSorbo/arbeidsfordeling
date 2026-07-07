import { useEffect, useState } from 'react'

/** Nåtid som oppdateres hvert sekund — for løpende timer-visning. */
export function useNow(enabled: boolean): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    if (!enabled) return
    setNow(new Date())
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [enabled])

  return now
}
