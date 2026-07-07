import {
  addDoc,
  deleteDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { entriesCol, entryDoc } from '../firebase/paths'
import { startOfDay } from '../utils/time'

export interface EntryInput {
  categoryId: string
  start: Date
  end: Date
  note: string
}

/** Kastes når en registrering overlapper en eksisterende. */
export class OverlapError extends Error {
  constructor(public conflict: { start: Date; end: Date }) {
    super('Registreringen overlapper med en annen registrering.')
    this.name = 'OverlapError'
  }
}

/** Kastes når slutt ikke er etter start. */
export class InvalidRangeError extends Error {
  constructor() {
    super('Sluttidspunkt må være etter starttidspunkt.')
    this.name = 'InvalidRangeError'
  }
}

// Finner første registrering som overlapper [start, end).
// To intervaller overlapper når det ene starter før det andre slutter
// og slutter etter at det andre starter. Vi henter et vindu på 'start'
// (fra dagen før, for å fange registreringer som strekker seg over
// midnatt) og sjekker den faktiske overlappen i minnet — da holder
// det med enkeltfelt-indeksen Firestore lager automatisk.
async function findOverlap(
  uid: string,
  start: Date,
  end: Date,
  excludeId?: string,
): Promise<{ start: Date; end: Date } | null> {
  const windowStart = startOfDay(start)
  windowStart.setDate(windowStart.getDate() - 1)

  const q = query(
    entriesCol(uid),
    where('start', '>=', Timestamp.fromDate(windowStart)),
    where('start', '<', Timestamp.fromDate(end)),
    orderBy('start'),
  )
  const snap = await getDocs(q)
  for (const d of snap.docs) {
    if (d.id === excludeId) continue
    const data = d.data()
    const s: Date = data.start.toDate()
    const e: Date = data.end.toDate()
    if (s < end && e > start) return { start: s, end: e }
  }
  return null
}

export async function createEntry(
  uid: string,
  input: EntryInput,
): Promise<void> {
  if (input.end <= input.start) throw new InvalidRangeError()
  const conflict = await findOverlap(uid, input.start, input.end)
  if (conflict) throw new OverlapError(conflict)
  await addDoc(entriesCol(uid), {
    categoryId: input.categoryId,
    start: Timestamp.fromDate(input.start),
    end: Timestamp.fromDate(input.end),
    note: input.note,
    createdAt: serverTimestamp(),
  })
}

export async function updateEntry(
  uid: string,
  id: string,
  input: EntryInput,
): Promise<void> {
  if (input.end <= input.start) throw new InvalidRangeError()
  const conflict = await findOverlap(uid, input.start, input.end, id)
  if (conflict) throw new OverlapError(conflict)
  await updateDoc(entryDoc(uid, id), {
    categoryId: input.categoryId,
    start: Timestamp.fromDate(input.start),
    end: Timestamp.fromDate(input.end),
    note: input.note,
  })
}

export async function deleteEntry(uid: string, id: string): Promise<void> {
  await deleteDoc(entryDoc(uid, id))
}
