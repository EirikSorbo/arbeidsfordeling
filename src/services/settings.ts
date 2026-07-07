import { serverTimestamp, setDoc } from 'firebase/firestore'
import { settingsDoc } from '../firebase/paths'
import type { UserSettings } from '../types'

// setDoc med merge (ikke updateDoc) fordi innstillings-dokumentet kanskje
// ikke finnes ennå — updateDoc ville kastet på manglende dokument.
export async function saveSettings(
  uid: string,
  patch: Partial<UserSettings>,
): Promise<void> {
  await setDoc(
    settingsDoc(uid),
    { ...patch, updatedAt: serverTimestamp() },
    { merge: true },
  )
}

export function setDefaultCategory(
  uid: string,
  categoryId: string | null,
): Promise<void> {
  return saveSettings(uid, { defaultCategoryId: categoryId })
}

export function setWeekStart(uid: string, weekStart: 0 | 1): Promise<void> {
  return saveSettings(uid, { weekStart })
}
