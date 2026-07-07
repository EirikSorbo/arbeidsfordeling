import { useEffect, useState } from 'react'
import { onSnapshot } from 'firebase/firestore'
import { settingsDoc } from '../firebase/paths'
import type { UserSettings } from '../types'

export const DEFAULT_SETTINGS: UserSettings = {
  defaultCategoryId: null,
  weekStart: 1,
}

/** Abonnerer på brukerinnstillinger. Returnerer alltid et fullt objekt —
 *  også når dokumentet mangler eller er delvis utfylt. */
export function useSettings(uid: string) {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onSnapshot(settingsDoc(uid), (snap) => {
      const data = snap.data()
      setSettings({
        defaultCategoryId: data?.defaultCategoryId ?? null,
        weekStart: data?.weekStart === 0 ? 0 : 1,
      })
      setLoading(false)
    })
  }, [uid])

  return { settings, loading }
}
