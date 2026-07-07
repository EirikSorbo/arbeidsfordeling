import { useMemo, useState } from 'react'
import { useUser } from '../auth/AuthContext'
import { EntryForm } from '../components/EntryForm'
import { useCategories } from '../hooks/useCategories'
import { useEntries } from '../hooks/useEntries'
import { useSettings } from '../hooks/useSettings'
import { deleteEntry } from '../services/entries'
import type { Category, TimeEntry } from '../types'
import {
  combineDateAndTime,
  formatDate,
  formatDuration,
  formatTime,
  toDateInputValue,
} from '../utils/time'

interface DayGroup {
  key: string
  date: Date
  entries: TimeEntry[]
  totalMs: number
}

export function HistoryPage() {
  const user = useUser()
  const uid = user.uid
  const { entries, loading } = useEntries(uid)
  const { categories } = useCategories(uid)
  const { settings } = useSettings(uid)

  const [showNewForm, setShowNewForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [categoryFilter, setCategoryFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const categoryById = useMemo(
    () => new Map<string, Category>(categories.map((c) => [c.id, c])),
    [categories],
  )

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    const from = fromDate ? combineDateAndTime(fromDate, '00:00') : null
    const to = toDate ? combineDateAndTime(toDate, '23:59') : null

    return entries.filter((entry) => {
      if (categoryFilter !== 'all' && entry.categoryId !== categoryFilter) {
        return false
      }
      if (from && entry.start < from) return false
      if (to && entry.start > to) return false
      if (term) {
        const category = categoryById.get(entry.categoryId)
        const haystack = `${entry.note} ${category?.name ?? ''}`.toLowerCase()
        if (!haystack.includes(term)) return false
      }
      return true
    })
  }, [entries, categoryFilter, search, fromDate, toDate, categoryById])

  // Grupper etter dag (allerede sortert nyeste først fra spørringen).
  const groups = useMemo(() => {
    const map = new Map<string, DayGroup>()
    for (const entry of filtered) {
      const key = toDateInputValue(entry.start)
      let group = map.get(key)
      if (!group) {
        const date = new Date(entry.start)
        date.setHours(0, 0, 0, 0)
        group = { key, date, entries: [], totalMs: 0 }
        map.set(key, group)
      }
      group.entries.push(entry)
      group.totalMs += entry.end.getTime() - entry.start.getTime()
    }
    return [...map.values()]
  }, [filtered])

  const hasFilters =
    categoryFilter !== 'all' || search !== '' || fromDate !== '' || toDate !== ''

  const clearFilters = () => {
    setCategoryFilter('all')
    setSearch('')
    setFromDate('')
    setToDate('')
  }

  const handleDelete = async (entry: TimeEntry) => {
    const category = categoryById.get(entry.categoryId)
    const label = `${category?.name ?? 'registreringen'} ${formatTime(entry.start)}–${formatTime(entry.end)}`
    if (!confirm(`Slette ${label}?`)) return
    try {
      await deleteEntry(uid, entry.id)
    } catch (err) {
      console.error(err)
      alert('Kunne ikke slette. Prøv igjen.')
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Historikk</h1>
        {!showNewForm && (
          <button
            className="btn btn-primary"
            onClick={() => {
              setShowNewForm(true)
              setEditingId(null)
            }}
          >
            + Ny registrering
          </button>
        )}
      </div>

      {showNewForm && (
        <section className="card">
          <h2>Ny registrering</h2>
          <EntryForm
            uid={uid}
            categories={categories}
            defaultCategoryId={settings.defaultCategoryId}
            onDone={() => setShowNewForm(false)}
            onCancel={() => setShowNewForm(false)}
          />
        </section>
      )}

      <section className="card">
        <div className="filter-bar">
          <input
            className="filter-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Søk i notat eller kategori …"
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">Alle kategorier</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <label className="filter-date">
            Fra
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </label>
          <label className="filter-date">
            Til
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </label>
          {hasFilters && (
            <button className="btn btn-ghost btn-small" onClick={clearFilters}>
              Nullstill
            </button>
          )}
        </div>
      </section>

      {loading ? (
        <section className="card">
          <p className="text-muted">Laster …</p>
        </section>
      ) : groups.length === 0 ? (
        <section className="card">
          <p className="text-muted">
            {hasFilters
              ? 'Ingen registreringer passer filteret.'
              : 'Ingen registreringer ennå. Legg til en med knappen over, eller start en timer på forsiden.'}
          </p>
        </section>
      ) : (
        groups.map((group) => (
          <section key={group.key} className="card">
            <div className="day-header">
              <h2>{formatDate(group.date)}</h2>
              <span className="day-total">{formatDuration(group.totalMs)}</span>
            </div>
            <ul className="entry-list">
              {group.entries.map((entry) => {
                const category = categoryById.get(entry.categoryId)
                if (editingId === entry.id) {
                  return (
                    <li key={entry.id} className="entry-row entry-editing">
                      <EntryForm
                        uid={uid}
                        categories={categories}
                        initial={entry}
                        onDone={() => setEditingId(null)}
                        onCancel={() => setEditingId(null)}
                      />
                    </li>
                  )
                }
                return (
                  <li key={entry.id} className="entry-row">
                    <span
                      className="category-dot"
                      style={{ background: category?.color ?? '#999' }}
                    />
                    <div className="entry-main">
                      <span className="entry-name">
                        {category?.name ?? 'Ukjent'}
                      </span>
                      <span className="text-muted entry-time">
                        {formatTime(entry.start)}–{formatTime(entry.end)}
                      </span>
                      {entry.note && (
                        <span className="text-muted entry-note">
                          {entry.note}
                        </span>
                      )}
                    </div>
                    <span className="entry-duration">
                      {formatDuration(
                        entry.end.getTime() - entry.start.getTime(),
                      )}
                    </span>
                    <div className="entry-actions">
                      <button
                        className="btn btn-ghost btn-small"
                        onClick={() => {
                          setEditingId(entry.id)
                          setShowNewForm(false)
                        }}
                      >
                        Rediger
                      </button>
                      <button
                        className="btn btn-ghost btn-small btn-danger-text"
                        onClick={() => handleDelete(entry)}
                      >
                        Slett
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  )
}
