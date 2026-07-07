import { useEffect, useState } from 'react'
import { useUser } from '../auth/AuthContext'
import { CategoriesPage } from './CategoriesPage'
import { useCategories } from '../hooks/useCategories'
import { useEntries } from '../hooks/useEntries'
import { useSettings } from '../hooks/useSettings'
import { setDefaultCategory, setWeekStart } from '../services/settings'
import { exportEntriesCsv, exportEntriesJson } from '../utils/export'

export function SettingsPage() {
  const uid = useUser().uid
  const { active, categories } = useCategories(uid)
  const { settings, loading } = useSettings(uid)
  const { entries } = useEntries(uid)
  const [showCategories, setShowCategories] = useState(false)

  // Lukk kategori-popup med Escape, og lås bakgrunnsscroll mens den er åpen.
  useEffect(() => {
    if (!showCategories) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowCategories(false)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [showCategories])

  const orphanDefault =
    settings.defaultCategoryId != null &&
    !active.some((c) => c.id === settings.defaultCategoryId)

  const handleDefault = async (value: string) => {
    try {
      await setDefaultCategory(uid, value === '' ? null : value)
    } catch (err) {
      console.error(err)
      alert('Kunne ikke lagre standardkategori. Prøv igjen.')
    }
  }

  const handleWeek = async (value: string) => {
    try {
      await setWeekStart(uid, value === '0' ? 0 : 1)
    } catch (err) {
      console.error(err)
      alert('Kunne ikke lagre arbeidsuke. Prøv igjen.')
    }
  }

  return (
    <div className="page">
      <h1>Innstillinger</h1>

      <section className="card">
        <h2>Kategorier</h2>
        <button
          className="btn btn-primary"
          onClick={() => setShowCategories(true)}
        >
          Administrer kategorier
        </button>
        <p className="text-muted settings-help">
          Opprett, endre rekkefølge på og arkiver kategoriene dine.
        </p>
      </section>

      <section className="card">
        <h2>Standardkategori</h2>
        <select
          className="settings-select"
          value={settings.defaultCategoryId ?? ''}
          disabled={loading}
          onChange={(e) => handleDefault(e.target.value)}
        >
          <option value="">Ingen</option>
          {orphanDefault && (
            <option value={settings.defaultCategoryId ?? ''}>
              Tidligere valg (utilgjengelig) — velg på nytt
            </option>
          )}
          {active.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <p className="text-muted settings-help">
          Velges automatisk når du starter en ny registrering.
        </p>
      </section>

      <section className="card">
        <h2>Arbeidsuke</h2>
        <select
          className="settings-select"
          value={String(settings.weekStart)}
          disabled={loading}
          onChange={(e) => handleWeek(e.target.value)}
        >
          <option value="1">Mandag</option>
          <option value="0">Søndag</option>
        </select>
        <p className="text-muted settings-help">
          Bestemmer hvilken dag uken starter på i rapporter.
        </p>
      </section>

      <section className="card">
        <h2>Eksporter data</h2>
        <div className="settings-export-actions">
          <button
            className="btn btn-primary"
            disabled={entries.length === 0}
            onClick={() => exportEntriesCsv(entries, categories)}
          >
            Last ned CSV
          </button>
          <button
            className="btn btn-ghost"
            disabled={entries.length === 0}
            onClick={() => exportEntriesJson(entries, categories)}
          >
            Last ned JSON
          </button>
        </div>
        <p className="text-muted settings-help">
          Eksporterer de siste 1000 registreringene.
        </p>
      </section>

      {showCategories && (
        <div
          className="modal-overlay"
          onClick={() => setShowCategories(false)}
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Kategorier"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              aria-label="Lukk"
              onClick={() => setShowCategories(false)}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
            <CategoriesPage />
          </div>
        </div>
      )}
    </div>
  )
}
