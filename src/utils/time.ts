export function startOfDay(d: Date): Date {
  const r = new Date(d)
  r.setHours(0, 0, 0, 0)
  return r
}

/** Legger til n dager. Bruker setDate (kalender-aritmetikk) så det er
 *  robust mot sommertid — aldri n * 86400000 ms. */
export function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

/** Første dag i uken som inneholder d. weekStart: 0 = søndag, 1 = mandag. */
export function startOfWeek(d: Date, weekStart: 0 | 1): Date {
  const r = startOfDay(d)
  const diff = (r.getDay() - weekStart + 7) % 7
  r.setDate(r.getDate() - diff)
  return r
}

/** ISO-8601 ukenummer (torsdag-forankret, mandag-basert per definisjon —
 *  uavhengig av weekStart). Regner i UTC internt for å unngå sommertid-drift. */
export function isoWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = (date.getUTCDay() + 6) % 7 // mandag = 0 … søndag = 6
  date.setUTCDate(date.getUTCDate() - dayNum + 3) // torsdag i denne uken
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4))
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3)
  return 1 + Math.round((date.getTime() - firstThursday.getTime()) / 604800000)
}

/** "1:23:45" — for løpende timer-visning */
export function formatClock(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return `${h}:${mm}:${ss}`
}

/** "2 t 15 min" / "45 min" — for oppsummeringer */
export function formatDuration(ms: number): string {
  const totalMin = Math.round(ms / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h} t`
  return `${h} t ${m} min`
}

/** "14:05" */
export function formatTime(d: Date): string {
  return d.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })
}

/** "torsdag 3. juli" */
export function formatDate(d: Date): string {
  return d.toLocaleDateString('nb-NO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

/** "yyyy-mm-dd" for <input type="date"> (lokal tid, ikke UTC) */
export function toDateInputValue(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** "HH:mm" for <input type="time"> */
export function toTimeInputValue(d: Date): string {
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

/** Tidligste ledige starttidspunkt for en registrering av lengde `durationMs`,
 *  fra og med `baseline` (f.eks. kl. 08.00), som ikke overlapper noen av de
 *  opptatte intervallene. `busy` trenger ikke være sortert. Fyller den
 *  tidligste luken som er stor nok. */
export function earliestFreeStart(
  baseline: Date,
  durationMs: number,
  busy: { start: Date; end: Date }[],
): Date {
  const sorted = [...busy].sort(
    (a, b) => a.start.getTime() - b.start.getTime(),
  )
  let start = baseline.getTime()
  for (const b of sorted) {
    const bs = b.start.getTime()
    const be = b.end.getTime()
    if (be <= start) continue // ferdig før kandidaten – ingen konflikt
    if (bs >= start + durationMs) break // luke stor nok før dette intervallet
    start = Math.max(start, be) // skyv kandidaten forbi det opptatte intervallet
  }
  return new Date(start)
}

/** Setter sammen "yyyy-mm-dd" og "HH:mm" til en lokal Date. */
export function combineDateAndTime(dateStr: string, timeStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  const [h, min] = timeStr.split(':').map(Number)
  return new Date(y, m - 1, d, h, min, 0, 0)
}
