import { useEffect, useState } from 'react'
import { onSnapshot } from 'firebase/firestore'
import { activeTimerDoc } from '../firebase/paths'
import type { ActiveTimer } from '../types'

/** Abonnerer på den aktive timeren (null når ingen kjører). */
export function useActiveTimer(uid: string) {
  const [timer, setTimer] = useState<ActiveTimer | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onSnapshot(activeTimerDoc(uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data()
        setTimer({
          categoryId: data.categoryId,
          start: data.start.toDate(),
          note: data.note ?? '',
        })
      } else {
        setTimer(null)
      }
      setLoading(false)
    })
  }, [uid])

  return { timer, loading }
}
