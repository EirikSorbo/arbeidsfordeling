import { useEffect, useState } from 'react'
import { onSnapshot, orderBy, query } from 'firebase/firestore'
import { categoriesCol } from '../firebase/paths'
import type { Category } from '../types'

/** Abonnerer på alle kategorier (også arkiverte), sortert etter rekkefølge. */
export function useCategories(uid: string) {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(categoriesCol(uid), orderBy('order'))
    return onSnapshot(q, (snap) => {
      setCategories(
        snap.docs.map((d) => {
          const data = d.data()
          return {
            id: d.id,
            name: data.name,
            color: data.color,
            icon: data.icon,
            order: data.order,
            archived: data.archived ?? false,
          }
        }),
      )
      setLoading(false)
    })
  }, [uid])

  const active = categories.filter((c) => !c.archived)
  const archived = categories.filter((c) => c.archived)
  return { categories, active, archived, loading }
}
