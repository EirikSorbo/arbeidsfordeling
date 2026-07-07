import { useUser } from '../auth/AuthContext'
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
              ⚠ Tidligere valg (utilgjengelig) — velg på nytt
            </option>
          )}
          {active.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.name}
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
    </div>
  )
}
