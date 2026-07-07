import { useEffect, useState } from 'react'
import { limit, onSnapshot, orderBy, query } from 'firebase/firestore'
import { entriesCol } from '../firebase/paths'
import type { TimeEntry } from '../types'

/** Abonnerer på alle registreringer, nyeste først (opptil `max`). */
export function useEntries(uid: string, max = 1000) {
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(entriesCol(uid), orderBy('start', 'desc'), limit(max))
    return onSnapshot(q, (snap) => {
      setEntries(
        snap.docs.map((d) => {
          const data = d.data()
          return {
            id: d.id,
            categoryId: data.categoryId,
            start: data.start.toDate(),
            end: data.end.toDate(),
            note: data.note ?? '',
          }
        }),
      )
      setLoading(false)
    })
  }, [uid, max])

  return { entries, loading }
}
