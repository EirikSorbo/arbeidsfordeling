import { useEffect, useState } from 'react'
import { onSnapshot, orderBy, query, Timestamp, where } from 'firebase/firestore'
import { entriesCol } from '../firebase/paths'
import type { TimeEntry } from '../types'

/**
 * Periodeavgrenset abonnement på registreringer — uten 1000-taket i
 * useEntries, så lange/gamle perioder ikke undertelles. Henter ALLE
 * registreringer som slutter etter vindusstart (så fler-dagers
 * registreringer som strekker seg inn i vinduet blir med uansett hvor
 * tidlig de startet), og beholder dem som også starter før vinduet slutter.
 * Dette er nøyaktig overlapp-mengden; aggregate() klipper selve overlappen.
 * Spørringen er enkeltfelt-indeksert (where+orderBy på `end`) — ingen
 * komposittindeks. `null`-grenser (ugyldig egendefinert periode) gir tom
 * liste uten spørring.
 */
export function useReportEntries(
  uid: string,
  windowStart: Date | null,
  windowEnd: Date | null,
) {
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)

  const startMs = windowStart ? windowStart.getTime() : null
  const endMs = windowEnd ? windowEnd.getTime() : null

  useEffect(() => {
    if (startMs === null || endMs === null) {
      setEntries([])
      setLoading(false)
      return
    }
    setLoading(true)
    const q = query(
      entriesCol(uid),
      where('end', '>', Timestamp.fromDate(new Date(startMs))),
      orderBy('end'),
    )
    return onSnapshot(q, (snap) => {
      const rows: TimeEntry[] = []
      snap.docs.forEach((d) => {
        const data = d.data()
        const start: Date = data.start.toDate()
        // Behold kun registreringer som også starter før vinduet slutter.
        if (start.getTime() >= endMs) return
        rows.push({
          id: d.id,
          categoryId: data.categoryId,
          start,
          end: data.end.toDate(),
          note: data.note ?? '',
        })
      })
      setEntries(rows)
      setLoading(false)
    })
  }, [uid, startMs, endMs])

  return { entries, loading }
}
