import { useEffect, useState } from 'react'
import { onSnapshot, orderBy, query, Timestamp, where } from 'firebase/firestore'
import { entriesCol } from '../firebase/paths'
import type { TimeEntry } from '../types'
import { startOfDay } from '../utils/time'

/** Abonnerer på dagens registreringer, nyeste først. */
export function useTodayEntries(uid: string) {
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)
  // Dagsgrense som state slik at listen ruller over ved midnatt.
  const [dayStart, setDayStart] = useState(() => startOfDay(new Date()))

  useEffect(() => {
    const interval = setInterval(() => {
      const current = startOfDay(new Date())
      setDayStart((prev) =>
        prev.getTime() === current.getTime() ? prev : current,
      )
    }, 60_000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const q = query(
      entriesCol(uid),
      where('start', '>=', Timestamp.fromDate(dayStart)),
      orderBy('start', 'desc'),
    )
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
  }, [uid, dayStart])

  return { entries, loading }
}
