import {
  doc,
  runTransaction,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../firebase/firebase'
import { activeTimerDoc, entriesCol } from '../firebase/paths'

// Kun én timer kan være aktiv: den ligger alltid i samme dokument
// (users/{uid}/timer/active). Start/stopp kjøres som transaksjoner
// slik at en løpende timer aldri går tapt ved samtidige endringer.

/** Starter timer i gitt kategori. En eventuell aktiv timer lagres som registrering først. */
export async function startTimer(uid: string, categoryId: string): Promise<void> {
  const activeRef = activeTimerDoc(uid)
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(activeRef)
    const now = Timestamp.now()
    if (snap.exists()) {
      const data = snap.data()
      tx.set(doc(entriesCol(uid)), {
        categoryId: data.categoryId,
        start: data.start,
        end: now,
        note: data.note ?? '',
        createdAt: serverTimestamp(),
      })
    }
    tx.set(activeRef, { categoryId, start: now, note: '' })
  })
}

/** Stopper aktiv timer og lagrer den som registrering. */
export async function stopTimer(uid: string): Promise<void> {
  const activeRef = activeTimerDoc(uid)
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(activeRef)
    if (!snap.exists()) return
    const data = snap.data()
    tx.set(doc(entriesCol(uid)), {
      categoryId: data.categoryId,
      start: data.start,
      end: Timestamp.now(),
      note: data.note ?? '',
      createdAt: serverTimestamp(),
    })
    tx.delete(activeRef)
  })
}

/** Bytter kategori på løpende timer uten å stoppe den. */
export async function switchTimerCategory(
  uid: string,
  categoryId: string,
): Promise<void> {
  await updateDoc(activeTimerDoc(uid), { categoryId })
}

/** Oppdaterer notatet på løpende timer. */
export async function setTimerNote(uid: string, note: string): Promise<void> {
  await updateDoc(activeTimerDoc(uid), { note })
}
