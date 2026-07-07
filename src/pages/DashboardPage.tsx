import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useUser } from '../auth/AuthContext'
import { useActiveTimer } from '../hooks/useActiveTimer'
import { useCategories } from '../hooks/useCategories'
import { useNow } from '../hooks/useNow'
import { useTodayEntries } from '../hooks/useTodayEntries'
import {
  startTimer,
  stopTimer,
  switchTimerCategory,
} from '../services/timer'
import type { Category } from '../types'
import {
  formatClock,
  formatDate,
  formatDuration,
  formatTime,
} from '../utils/time'

export function DashboardPage() {
  const user = useUser()
  const uid = user.uid
  const { categories, active, loading: categoriesLoading } = useCategories(uid)
  const { timer } = useActiveTimer(uid)
  const { entries } = useTodayEntries(uid)
  const now = useNow(timer !== null)
  const [busy, setBusy] = useState(false)

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

      {timer && (
        <section className="card timer-card">
          <div className="timer-category">
            <span
              className="category-dot"
              style={{ background: timerCategory?.color ?? '#999' }}
            />
            <span className="timer-category-name">
              {timerCategory?.icon} {timerCategory?.name ?? 'Ukjent kategori'}
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
                    {c.icon} {c.name}
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
            <Link to="/kategorier" className="btn btn-primary">
              Opprett kategorier
            </Link>
          </div>
        ) : (
          <div className="quickstart-grid">
            {active.map((c) => (
              <button
                key={c.id}
                className="quickstart-btn"
                style={{ borderColor: c.color }}
                disabled={busy || timer?.categoryId === c.id}
                onClick={() => run(() => startTimer(uid, c.id))}
              >
                <span className="quickstart-icon">{c.icon}</span>
                <span>{c.name}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <h2>I dag</h2>
        <p className="today-total">{formatDuration(totalMs)}</p>
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
                  {category?.icon} {category?.name ?? 'Ukjent'}
                </span>
                <span className="summary-duration">{formatDuration(ms)}</span>
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

      <section className="card">
        <h2>Dagens registreringer</h2>
        {entries.length === 0 ? (
          <p className="text-muted">Ingen registreringer i dag ennå.</p>
        ) : (
          <ul className="entry-list">
            {entries.map((entry) => {
              const category = categoryById.get(entry.categoryId)
              return (
                <li key={entry.id} className="entry-row">
                  <span
                    className="category-dot"
                    style={{ background: category?.color ?? '#999' }}
                  />
                  <div className="entry-main">
                    <span className="entry-name">
                      {category?.icon} {category?.name ?? 'Ukjent'}
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
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
