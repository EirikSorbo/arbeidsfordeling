import {
  addDoc,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../firebase/firebase'
import { categoriesCol, categoryDoc } from '../firebase/paths'

export interface CategoryInput {
  name: string
  color: string
}

export async function createCategory(
  uid: string,
  input: CategoryInput,
  order: number,
): Promise<void> {
  await addDoc(categoriesCol(uid), {
    ...input,
    order,
    archived: false,
    createdAt: serverTimestamp(),
  })
}

export async function updateCategory(
  uid: string,
  id: string,
  input: Partial<CategoryInput>,
): Promise<void> {
  await updateDoc(categoryDoc(uid, id), { ...input })
}

export async function setCategoryArchived(
  uid: string,
  id: string,
  archived: boolean,
): Promise<void> {
  await updateDoc(categoryDoc(uid, id), { archived })
}

/** Skriver ny rekkefølge for alle kategorier i én batch. */
export async function reorderCategories(
  uid: string,
  orderedIds: string[],
): Promise<void> {
  const batch = writeBatch(db)
  orderedIds.forEach((id, index) => {
    batch.update(categoryDoc(uid, id), { order: index })
  })
  await batch.commit()
}
