export interface Category {
  id: string
  name: string
  color: string
  order: number
  archived: boolean
}

export interface TimeEntry {
  id: string
  categoryId: string
  start: Date
  end: Date
  note: string
}

export interface ActiveTimer {
  categoryId: string
  start: Date
  note: string
}

export interface UserSettings {
  defaultCategoryId: string | null
  /** 0 = søndag, 1 = mandag */
  weekStart: 0 | 1
}
