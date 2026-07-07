import type { TimeEntry } from '../types'
import { addDays, formatDate, isoWeekNumber, startOfDay, startOfWeek } from './time'

export type PeriodType = 'day' | 'week' | 'month' | 'custom'
export type WeekStart = 0 | 1

/** Halvåpent lokalt vindu [start, end) — begge lokale midnatt, end eksklusiv. */
export interface Period {
  type: PeriodType
  start: Date
  end: Date
}

export interface CustomRange {
  from: Date
  to: Date
}

export interface Aggregation {
  totalMs: number
  perCategory: Map<string, number>
  windowStart: Date
  windowEnd: Date
}

export interface CategorySlice {
  categoryId: string
  ms: number
  percent: number
}

/**
 * Regner ut [start, end) for en periode rundt referansedatoen.
 * end er alltid eksklusiv (midnatt dagen etter siste inkluderte dag),
 * slik at nabo-perioder flislegger perfekt uten off-by-one.
 */
export function computePeriod(
  type: PeriodType,
  ref: Date,
  weekStart: WeekStart,
  custom?: CustomRange,
): Period {
  switch (type) {
    case 'day': {
      const start = startOfDay(ref)
      return { type, start, end: addDays(start, 1) }
    }
    case 'week': {
      const start = startOfWeek(ref, weekStart)
      return { type, start, end: addDays(start, 7) }
    }
    case 'month': {
      // Forankret til den 1. — new Date(y, m+1, 1) håndterer des→jan og
      // varierende måned-lengde. Aldri setMonth på en midt-i-måned-dato.
      const start = new Date(ref.getFullYear(), ref.getMonth(), 1)
      const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 1)
      return { type, start, end }
    }
    case 'custom': {
      const base = custom ?? { from: ref, to: ref }
      const lo = base.from <= base.to ? base.from : base.to
      const hi = base.from <= base.to ? base.to : base.from
      // Til-dagen inkluderes helt: slutt = midnatt dagen etter.
      return { type, start: startOfDay(lo), end: addDays(startOfDay(hi), 1) }
    }
  }
}

/**
 * Flytter referansedatoen én periode frem/tilbake. Kalleren sender inn
 * periodens start (allerede normalisert), så ref holder seg på første dag.
 */
export function shiftReference(
  type: PeriodType,
  ref: Date,
  dir: -1 | 1,
): Date {
  switch (type) {
    case 'day':
      return addDays(startOfDay(ref), dir)
    case 'week':
      return addDays(ref, dir * 7)
    case 'month':
      return new Date(ref.getFullYear(), ref.getMonth() + dir, 1)
    case 'custom':
      return ref
  }
}

/**
 * Summerer tid per kategori innenfor vinduet med KLIPPING: hver
 * registrering bidrar kun med sin overlapp mot [windowStart, windowEnd).
 * Det garanterer at total === Σ per-kategori og at en uke aldri overstiger
 * 7×24 t, selv om registreringer krysser periodegrenser. Én regel for både
 * total og per-kategori — ingen parallell utregning.
 */
export function aggregate(
  entries: TimeEntry[],
  windowStart: Date,
  windowEnd: Date,
): Aggregation {
  const ws = windowStart.getTime()
  const we = windowEnd.getTime()
  const perCategory = new Map<string, number>()
  let totalMs = 0
  for (const entry of entries) {
    const s = Math.max(entry.start.getTime(), ws)
    const e = Math.min(entry.end.getTime(), we)
    const overlap = e - s
    // Fanger både ingen-overlapp og ugyldige (slutt<=start) registreringer.
    if (overlap <= 0) continue
    totalMs += overlap
    perCategory.set(
      entry.categoryId,
      (perCategory.get(entry.categoryId) ?? 0) + overlap,
    )
  }
  return { totalMs, perCategory, windowStart, windowEnd }
}

/**
 * Gjør aggregatet om til sorterte andeler med heltallsprosent som summerer
 * til nøyaktig 100 (største-rest / Hamilton). Bar-bredde skal bruke det
 * uavrundede forholdet ms/total; kun etiketten bruker `percent`.
 */
export function toSlices(agg: Aggregation): CategorySlice[] {
  const { totalMs, perCategory } = agg
  if (totalMs <= 0) return []

  const raw = [...perCategory.entries()].map(([categoryId, ms]) => {
    const exact = (ms / totalMs) * 100
    const floor = Math.floor(exact)
    return { categoryId, ms, floor, remainder: exact - floor }
  })

  const usedPoints = raw.reduce((sum, r) => sum + r.floor, 0)
  let leftover = 100 - usedPoints

  const percentById = new Map<string, number>()
  for (const r of raw) percentById.set(r.categoryId, r.floor)

  // Fordel restpoengene til de største restene (tiebreak: ms, så id).
  const byRemainder = [...raw].sort(
    (a, b) =>
      b.remainder - a.remainder ||
      b.ms - a.ms ||
      a.categoryId.localeCompare(b.categoryId),
  )
  for (let i = 0; i < byRemainder.length && leftover > 0; i++) {
    const id = byRemainder[i].categoryId
    percentById.set(id, (percentById.get(id) ?? 0) + 1)
    leftover--
  }

  return raw
    .map((r) => ({
      categoryId: r.categoryId,
      ms: r.ms,
      percent: percentById.get(r.categoryId) ?? 0,
    }))
    .sort((a, b) => b.ms - a.ms || a.categoryId.localeCompare(b.categoryId))
}

/** "30. juni" — dag og måned, uten ukedag/år. */
function fmtDayMonth(d: Date): string {
  return d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'long' })
}

function sameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/** Menneskelig etikett for perioden (norsk). */
export function periodLabel(period: Period, weekStart: WeekStart): string {
  const { type, start, end } = period
  const lastDay = addDays(end, -1) // korriger for eksklusiv slutt
  switch (type) {
    case 'day':
      return formatDate(start)
    case 'week': {
      // Torsdag-forankret ISO-nummer for BEGGE weekStart-verdier.
      const thursday = addDays(start, weekStart === 0 ? 4 : 3)
      return `Uke ${isoWeekNumber(thursday)} · ${fmtDayMonth(start)}–${fmtDayMonth(lastDay)} ${lastDay.getFullYear()}`
    }
    case 'month':
      return `${start.toLocaleDateString('nb-NO', { month: 'long' })} ${start.getFullYear()}`
    case 'custom':
      if (sameLocalDay(start, lastDay)) return formatDate(start)
      return `${fmtDayMonth(start)}–${fmtDayMonth(lastDay)} ${lastDay.getFullYear()}`
  }
}
