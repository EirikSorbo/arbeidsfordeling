import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useUser } from '../auth/AuthContext'
import { CategoryGrid } from '../components/CategoryGrid'
import { DurationEntryForm } from '../components/DurationEntryForm'
import { EntryForm } from '../components/EntryForm'
import { useActiveTimer } from '../hooks/useActiveTimer'
import { useCategories } from '../hooks/useCategories'
import { useNow } from '../hooks/useNow'
import { useSettings } from '../hooks/useSettings'
import { useTodayEntries } from '../hooks/useTodayEntries'
import {
  startTimer,
  stopTimer,
  switchTimerCategory,
} from '../services/timer'
import type { Category } from '../types'
import { formatClock, formatDate, formatTime } from '../utils/time'

export function DashboardPage() {
  const user = useUser()
  const uid = user.uid
  const { categories, active, loading: categoriesLoading } = useCategories(uid)
  const { timer } = useActiveTimer(uid)
  const { entries } = useTodayEntries(uid)
  const { settings } = useSettings(uid)
  const now = useNow(timer !== null)
  const [busy, setBusy] = useState(false)
  // Valgt kategori for ny registrering (null = vis kategori-valg først).
  const [newEntryCategoryId, setNewEntryCategoryId] = useState<string | null>(
    null,
  )
  // Registreringsmodus: 'duration' = bare varighet, 'time' = velg tidspunkt.
  const [newEntryMode, setNewEntryMode] = useState<'duration' | 'time'>(
    'duration',
  )

  const categoryById = new Map<string, Category>(
    categories.map((c) => [c.id, c]),
  )
  const timerCategory = timer ? categoryById.get(timer.categoryId) : undefined
  const elapsedMs = timer ? now.getTime() - timer.start.getTime() : 0

  // Dagens totaler: lagrede registreringer + løpende timer.
  const perCategory = new Map<string, number>()
  let totalMs = 0
  for (const entry of entries) {
    const ms = entry.end.getTime() - entry.start.getTime()
    totalMs += ms
    perCategory.set(
      entry.categoryId,
      (perCategory.get(entry.categoryId) ?? 0) + ms,
    )
  }
  if (timer) {
    totalMs += elapsedMs
    perCategory.set(
      timer.categoryId,
      (perCategory.get(timer.categoryId) ?? 0) + elapsedMs,
    )
  }
  const summaryRows = [...perCategory.entries()]
    .map(([categoryId, ms]) => ({
      category: categoryById.get(categoryId),
      ms,
    }))
    .sort((a, b) => b.ms - a.ms)

  const newEntryCategory = newEntryCategoryId
    ? categoryById.get(newEntryCategoryId)
    : undefined
  // Opptatte intervaller i dag for varighets-plassering: lagrede
  // registreringer + en eventuell løpende timer fram til nå.
  const busyIntervals = [
    ...entries.map((e) => ({ start: e.start, end: e.end })),
    ...(timer ? [{ start: timer.start, end: now }] : []),
  ]

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    try {
      await action()
    } catch (err) {
      console.error(err)
      alert('Noe gikk galt. Prøv igjen.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <p className="page-date">{formatDate(new Date())}</p>

      <section className="card">
        <h2>Ny registrering</h2>
        {categoriesLoading ? (
          <p className="text-muted">Laster kategorier …</p>
        ) : active.length === 0 ? (
          <div className="empty-state">
            <p className="text-muted">
              Du har ingen kategorier ennå. Opprett kategoriene du vil føre tid
              på først.
            </p>
            <Link to="/innstillinger" className="btn btn-primary">
              Opprett kategorier
            </Link>
          </div>
        ) : !newEntryCategory ? (
          <CategoryGrid categories={active} onSelect={setNewEntryCategoryId} />
        ) : (
          <div className="new-entry">
            <div className="entry-mode-toggle">
              <button
                type="button"
                className={newEntryMode === 'duration' ? 'active' : ''}
                onClick={() => setNewEntryMode('duration')}
              >
                Varighet
              </button>
              <button
                type="button"
                className={newEntryMode === 'time' ? 'active' : ''}
                onClick={() => setNewEntryMode('time')}
              >
                Velg tidspunkt
              </button>
            </div>

            {newEntryMode === 'duration' ? (
              <>
                <div className="entry-chosen">
                  <span
                    className="category-dot"
                    style={{ background: newEntryCategory.color }}
                  />
                  <span className="entry-chosen-name">
                    {newEntryCategory.name}
                  </span>
                </div>
                <DurationEntryForm
                  uid={uid}
                  category={newEntryCategory}
                  busy={busyIntervals}
                  onDone={() => setNewEntryCategoryId(null)}
                  onCancel={() => setNewEntryCategoryId(null)}
                />
              </>
            ) : (
              <EntryForm
                uid={uid}
                categories={categories}
                initialCategoryId={newEntryCategory.id}
                defaultCategoryId={settings.defaultCategoryId}
                onDone={() => setNewEntryCategoryId(null)}
                onCancel={() => setNewEntryCategoryId(null)}
              />
            )}
          </div>
        )}
      </section>

      {timer && (
        <section className="card timer-card">
          <div className="timer-category">
            <span
              className="category-dot"
              style={{ background: timerCategory?.color ?? '#999' }}
            />
            <span className="timer-category-name">
              {timerCategory?.name ?? 'Ukjent kategori'}
            </span>
          </div>
          <div className="timer-clock">{formatClock(elapsedMs)}</div>
          <p className="text-muted timer-since">
            Startet kl. {formatTime(timer.start)}
          </p>
          <button
            className="btn btn-stop"
            disabled={busy}
            onClick={() => run(() => stopTimer(uid))}
          >
            ■ Stopp
          </button>
          {active.length > 1 && (
            <label className="timer-switch">
              Bytt kategori uten å stoppe:
              <select
                value={timer.categoryId}
                disabled={busy}
                onChange={(e) =>
                  run(() => switchTimerCategory(uid, e.target.value))
                }
              >
                {active.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </section>
      )}

      <section className="card">
        <h2>{timer ? 'Start ny timer' : 'Start timer'}</h2>
        {categoriesLoading ? (
          <p className="text-muted">Laster kategorier …</p>
        ) : active.length === 0 ? (
          <div className="empty-state">
            <p className="text-muted">
              Du har ingen kategorier ennå. Opprett kategoriene du vil føre tid
              på først.
            </p>
            <Link to="/innstillinger" className="btn btn-primary">
              Opprett kategorier
            </Link>
          </div>
        ) : (
          <CategoryGrid
            categories={active}
            onSelect={(id) => run(() => startTimer(uid, id))}
            disabled={(c) => busy || timer?.categoryId === c.id}
          />
        )}
      </section>

      <section className="card">
        <h2>I dag</h2>
        {summaryRows.length === 0 ? (
          <p className="text-muted">Ingen tid registrert i dag ennå.</p>
        ) : (
          <ul className="summary-list">
            {summaryRows.map(({ category, ms }) => (
              <li key={category?.id ?? 'ukjent'} className="summary-row">
                <span
                  className="category-dot"
                  style={{ background: category?.color ?? '#999' }}
                />
                <span className="summary-name">
                  {category?.name ?? 'Ukjent'}
                </span>
                <span className="summary-duration">
                  {totalMs > 0 ? Math.round((ms / totalMs) * 100) : 0} %
                </span>
                <span
                  className="summary-bar"
                  style={{
                    width: `${totalMs > 0 ? (ms / totalMs) * 100 : 0}%`,
                    background: category?.color ?? '#999',
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
