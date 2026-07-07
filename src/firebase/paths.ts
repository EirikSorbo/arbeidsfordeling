import { collection, doc } from 'firebase/firestore'
import { db } from './firebase'

// Alle data ligger under users/{uid}/… slik at Firestore-reglene
// kan låse hver bruker til sine egne dokumenter.

export const categoriesCol = (uid: string) =>
  collection(db, 'users', uid, 'categories')

export const categoryDoc = (uid: string, id: string) =>
  doc(db, 'users', uid, 'categories', id)

export const entriesCol = (uid: string) =>
  collection(db, 'users', uid, 'entries')

export const entryDoc = (uid: string, id: string) =>
  doc(db, 'users', uid, 'entries', id)

// Én aktiv timer per bruker — alltid samme dokument-ID.
export const activeTimerDoc = (uid: string) =>
  doc(db, 'users', uid, 'timer', 'active')

export const settingsDoc = (uid: string) =>
  doc(db, 'users', uid, 'settings', 'preferences')
