import { useMemo, useState } from 'react'
import { useUser } from '../auth/AuthContext'
import { useCategories } from '../hooks/useCategories'
import { useReportEntries } from '../hooks/useReportEntries'
import { useSettings } from '../hooks/useSettings'
import type { Category } from '../types'
import {
  aggregate,
  computePeriod,
  periodLabel,
  shiftReference,
  toSlices,
} from '../utils/reports'
import type { PeriodType } from '../utils/reports'
import { combineDateAndTime, formatDuration, startOfDay } from '../utils/time'

const PERIOD_LABELS: Record<PeriodType, string> = {
  day: 'Dag',
  week: 'Uke',
  month: 'Måned',
  custom: 'Egendefinert',
}

export function ReportsPage() {
  const uid = useUser().uid
  const { categories } = useCategories(uid)
  const { settings } = useSettings(uid)

  const [type, setType] = useState<PeriodType>('week')
  const [ref, setRef] = useState(() => startOfDay(new Date()))
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  const customParsed = useMemo(() => {
    if (type !== 'custom' || !customFrom || !customTo) return undefined
    return {
      from: combineDateAndTime(customFrom, '00:00'),
      to: combineDateAndTime(customTo, '00:00'),
    }
  }, [type, customFrom, customTo])

  const customOrderError =
    type === 'custom' && !!customParsed && customParsed.from > customParsed.to

  // period = null når egendefinert periode mangler datoer eller har feil rekkefølge.
  const period = useMemo(() => {
    if (type === 'custom') {
      if (!customParsed || customParsed.from > customParsed.to) return null
      return computePeriod('custom', ref, settings.weekStart, customParsed)
    }
    return computePeriod(type, ref, settings.weekStart)
  }, [type, ref, settings.weekStart, customParsed])

  const { entries, loading } = useReportEntries(
    uid,
    period ? period.start : null,
    period ? period.end : null,
  )

  const agg = useMemo(
    () => (period ? aggregate(entries, period.start, period.end) : null),
    [entries, period],
  )
  const slices = useMemo(() => (agg ? toSlices(agg) : []), [agg])
  const label = period ? periodLabel(period, settings.weekStart) : ''

  const categoryById = useMemo(
    () => new Map<string, Category>(categories.map((c) => [c.id, c])),
    [categories],
  )

  const shift = (dir: -1 | 1) => {
    if (!period) return
    setRef(shiftReference(type, period.start, dir))
  }

  const now = Date.now()
  const includesToday =
    period != null &&
    now >= period.start.getTime() &&
    now < period.end.getTime()

  return (
    <div className="page">
      <div className="page-header">
        <h1>Rapporter</h1>
      </div>

      <section className="card">
        <div className="segmented" role="tablist">
          {(Object.keys(PERIOD_LABELS) as PeriodType[]).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={type === t}
              className={
                type === t
                  ? 'segmented-btn segmented-btn-active'
                  : 'segmented-btn'
              }
              onClick={() => setType(t)}
            >
              {PERIOD_LABELS[t]}
            </button>
          ))}
        </div>

        {type === 'custom' ? (
          <div className="report-custom-range">
            <label className="filter-date">
              Fra
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
              />
            </label>
            <label className="filter-date">
              Til
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
              />
            </label>
          </div>
        ) : (
          <div className="period-nav">
            <button
              className="btn btn-icon"
              aria-label="Forrige periode"
              onClick={() => shift(-1)}
            >
              ‹
            </button>
            <span className="period-label">{label}</span>
            <button
              className="btn btn-icon"
              aria-label="Neste periode"
              onClick={() => shift(1)}
            >
              ›
            </button>
          </div>
        )}
      </section>

      {type === 'custom' && !customParsed ? (
        <section className="card">
          <p className="text-muted">
            Velg fra- og til-dato for å se rapporten.
          </p>
        </section>
      ) : customOrderError ? (
        <section className="card">
          <p className="text-muted">Fra-dato må være før til-dato.</p>
        </section>
      ) : loading ? (
        <section className="card">
          <p className="text-muted">Laster …</p>
        </section>
      ) : !agg || slices.length === 0 ? (
        <section className="card">
          <p className="text-muted">Ingen tid registrert i denne perioden.</p>
        </section>
      ) : (
        <>
          <section className="card report-total-card">
            {type === 'custom' && (
              <p className="report-period-label">{label}</p>
            )}
            <p className="report-total">{formatDuration(agg.totalMs)}</p>
            <p className="text-muted report-total-sub">totalt registrert</p>
            {includesToday && (
              <p className="text-muted report-total-sub">
                Løpende timer er ikke medregnet.
              </p>
            )}
          </section>

          <section className="card">
            <h2>Fordeling per kategori</h2>
            <ul className="summary-list">
              {slices.map((slice) => {
                const category = categoryById.get(slice.categoryId)
                return (
                  <li key={slice.categoryId} className="summary-row">
                    <span
                      className="category-dot"
                      style={{ background: category?.color ?? '#999' }}
                    />
                    <span className="summary-name">
                      {category?.icon} {category?.name ?? 'Ukjent'}
                    </span>
                    <span className="summary-duration">
                      {formatDuration(slice.ms)}
                      <span className="summary-pct">{slice.percent} %</span>
                    </span>
                    <span
                      className="summary-bar"
                      style={{
                        width: `${(slice.ms / agg.totalMs) * 100}%`,
                        background: category?.color ?? '#999',
                      }}
                    />
                  </li>
                )
              })}
            </ul>
          </section>
        </>
      )}
    </div>
  )
}
