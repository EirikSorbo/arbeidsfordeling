import { useState } from 'react'
import { createEntry, OverlapError } from '../services/entries'
import type { Category } from '../types'
import {
  earliestFreeStart,
  formatDuration,
  formatTime,
  startOfDay,
} from '../utils/time'

interface Props {
  uid: string
  category: Category
  /** Opptatte intervaller i dag (lagrede registreringer + løpende timer). */
  busy: { start: Date; end: Date }[]
  onDone: () => void
  onCancel: () => void
}

/** Klokkeslettet nye varighets-registreringer legges inn fra. */
const DAY_START_HOUR = 8

/** Registrering der man kun oppgir varighet – appen plasserer den fra
 *  kl. 08.00 i dag, eller i den tidligste ledige luken etter det. */
export function DurationEntryForm({
  uid,
  category,
  busy,
  onDone,
  onCancel,
}: Props) {
  const [hours, setHours] = useState(1)
  const [minutes, setMinutes] = useState(0)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const durationMs = (hours * 60 + minutes) * 60_000

  // Forhåndsvis hvor registreringen havner.
  const baseline = startOfDay(new Date())
  baseline.setHours(DAY_START_HOUR, 0, 0, 0)
  const start =
    durationMs > 0 ? earliestFreeStart(baseline, durationMs, busy) : null
  const end = start ? new Date(start.getTime() + durationMs) : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (durationMs <= 0) {
      setError('Oppgi en varighet.')
      return
    }
    // Regn ut plasseringen på nytt idet vi lagrer (ikke stol på en gammel
    // forhåndsvisning om noe har endret seg).
    const s = earliestFreeStart(baseline, durationMs, busy)
    const en = new Date(s.getTime() + durationMs)

    setSaving(true)
    try {
      await createEntry(uid, {
        categoryId: category.id,
        start: s,
        end: en,
        note: note.trim(),
      })
      onDone()
    } catch (err) {
      if (err instanceof OverlapError) {
        setError(
          `Overlapper en registrering kl. ${formatTime(err.conflict.start)}–${formatTime(err.conflict.end)}.`,
        )
      } else {
        console.error(err)
        setError('Kunne ikke lagre. Prøv igjen.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="entry-form" onSubmit={handleSubmit}>
      <div className="entry-form-times">
        <label>
          Timer
          <input
            type="number"
            min={0}
            max={23}
            value={hours}
            onChange={(e) => setHours(Math.max(0, Number(e.target.value) || 0))}
          />
        </label>
        <label>
          Minutter
          <input
            type="number"
            min={0}
            max={59}
            step={5}
            value={minutes}
            onChange={(e) =>
              setMinutes(Math.min(59, Math.max(0, Number(e.target.value) || 0)))
            }
          />
        </label>
      </div>

      {start && end && (
        <p className="duration-preview">
          Legges inn kl. {formatTime(start)}–{formatTime(end)} (
          {formatDuration(durationMs)})
        </p>
      )}

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
          disabled={saving || durationMs <= 0}
        >
          Legg til
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={onCancel}
          disabled={saving}
        >
          Avbryt
        </button>
      </div>
    </form>
  )
}
