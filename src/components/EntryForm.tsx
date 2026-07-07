import { useMemo, useState } from 'react'
import {
  createEntry,
  InvalidRangeError,
  OverlapError,
  updateEntry,
} from '../services/entries'
import type { Category, TimeEntry } from '../types'
import {
  combineDateAndTime,
  formatTime,
  toDateInputValue,
  toTimeInputValue,
} from '../utils/time'

interface Props {
  uid: string
  categories: Category[]
  /** Registrering som redigeres — utelates ved ny registrering. */
  initial?: TimeEntry
  /** Forhåndsvalgt kategori for NYE registreringer (fra innstillinger). */
  defaultCategoryId?: string | null
  onDone: () => void
  onCancel: () => void
}

/** Standardverdier for ny registrering: siste halvtime frem til nå. */
function defaultRange(): { date: string; start: string; end: string } {
  const end = new Date()
  const start = new Date(end.getTime() - 30 * 60 * 1000)
  return {
    date: toDateInputValue(end),
    start: toTimeInputValue(start),
    end: toTimeInputValue(end),
  }
}

export function EntryForm({
  uid,
  categories,
  initial,
  defaultCategoryId,
  onDone,
  onCancel,
}: Props) {
  const initialRange = initial
    ? {
        date: toDateInputValue(initial.start),
        start: toTimeInputValue(initial.start),
        end: toTimeInputValue(initial.end),
      }
    : defaultRange()

  const [date, setDate] = useState(initialRange.date)
  const [startTime, setStartTime] = useState(initialRange.start)
  const [endTime, setEndTime] = useState(initialRange.end)
  const [note, setNote] = useState(initial?.note ?? '')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Aktive kategorier å velge blant — pluss kategorien registreringen
  // allerede har, selv om den er arkivert.
  const options = useMemo(() => {
    const active = categories.filter((c) => !c.archived)
    if (
      initial &&
      !active.some((c) => c.id === initial.categoryId)
    ) {
      const current = categories.find((c) => c.id === initial.categoryId)
      if (current) return [current, ...active]
    }
    return active
  }, [categories, initial])

  // Forrang: redigert registrerings egen kategori > lagret standardkategori
  // (om den fortsatt er aktiv) > første aktive kategori.
  const preferred =
    !initial && defaultCategoryId && options.some((c) => c.id === defaultCategoryId)
      ? defaultCategoryId
      : undefined
  const [categoryId, setCategoryId] = useState(
    initial?.categoryId ?? preferred ?? options[0]?.id ?? '',
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!categoryId) {
      setError('Velg en kategori.')
      return
    }
    const start = combineDateAndTime(date, startTime)
    const end = combineDateAndTime(date, endTime)
    if (end <= start) {
      setError('Sluttidspunkt må være etter starttidspunkt.')
      return
    }

    setBusy(true)
    try {
      const input = { categoryId, start, end, note: note.trim() }
      if (initial) {
        await updateEntry(uid, initial.id, input)
      } else {
        await createEntry(uid, input)
      }
      onDone()
    } catch (err) {
      if (err instanceof OverlapError) {
        setError(
          `Overlapper en registrering kl. ${formatTime(err.conflict.start)}–${formatTime(err.conflict.end)}.`,
        )
      } else if (err instanceof InvalidRangeError) {
        setError(err.message)
      } else {
        console.error(err)
        setError('Kunne ikke lagre. Prøv igjen.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="entry-form" onSubmit={handleSubmit}>
      <label>
        Dato
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </label>

      <div className="entry-form-times">
        <label>
          Fra
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
          />
        </label>
        <label>
          Til
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
          />
        </label>
      </div>

      <label>
        Kategori
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          required
        >
          {options.length === 0 && <option value="">Ingen kategorier</option>}
          {options.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        Notat
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Valgfritt"
        />
      </label>

      {error && <p className="error-text">{error}</p>}

      <div className="form-actions">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={busy || options.length === 0}
        >
          {initial ? 'Lagre endringer' : 'Legg til'}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={onCancel}
          disabled={busy}
        >
          Avbryt
        </button>
      </div>
    </form>
  )
}
