import { useState } from 'react'
import { useUser } from '../auth/AuthContext'
import { useCategories } from '../hooks/useCategories'
import {
  createCategory,
  reorderCategories,
  setCategoryArchived,
  updateCategory,
} from '../services/categories'
import type { CategoryInput } from '../services/categories'
import type { Category } from '../types'

const COLORS = [
  '#5b86d6', '#46a6bd', '#4fb08a', '#8bbd63',
  '#e0a95c', '#d6786f', '#dd7897', '#c17ec2',
  '#9a86d6', '#7382cf', '#4fa89f', '#a8a29e',
]

interface FormProps {
  initial?: Category
  onSave: (input: CategoryInput) => Promise<void>
  onCancel: () => void
}

function CategoryForm({ initial, onSave, onCancel }: FormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [color, setColor] = useState(initial?.color ?? COLORS[0])
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    try {
      await onSave({ name: name.trim(), color })
    } catch (err) {
      console.error(err)
      alert('Kunne ikke lagre kategorien. Prøv igjen.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="category-form" onSubmit={handleSubmit}>
      <label>
        Navn
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="F.eks. Undervisning"
          autoFocus
          required
        />
      </label>

      <fieldset>
        <legend>Farge</legend>
        <div className="swatch-grid">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={c === color ? 'swatch swatch-selected' : 'swatch'}
              style={{ background: c }}
              onClick={() => setColor(c)}
              aria-label={`Farge ${c}`}
            />
          ))}
        </div>
      </fieldset>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {initial ? 'Lagre endringer' : 'Opprett kategori'}
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

export function CategoriesPage() {
  const user = useUser()
  const uid = user.uid
  const { categories, active, archived, loading } = useCategories(uid)
  const [showNewForm, setShowNewForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const nextOrder =
    categories.length > 0
      ? Math.max(...categories.map((c) => c.order)) + 1
      : 0

  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= active.length) return
    const ids = active.map((c) => c.id)
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    // Arkiverte beholder plass etter de aktive.
    await reorderCategories(uid, [...ids, ...archived.map((c) => c.id)])
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Kategorier</h1>
        {!showNewForm && (
          <button
            className="btn btn-primary"
            onClick={() => {
              setShowNewForm(true)
              setEditingId(null)
            }}
          >
            + Ny kategori
          </button>
        )}
      </div>

      {showNewForm && (
        <section className="card">
          <h2>Ny kategori</h2>
          <CategoryForm
            onSave={async (input) => {
              await createCategory(uid, input, nextOrder)
              setShowNewForm(false)
            }}
            onCancel={() => setShowNewForm(false)}
          />
        </section>
      )}

      <section className="card">
        {loading ? (
          <p className="text-muted">Laster …</p>
        ) : active.length === 0 ? (
          <p className="text-muted">
            Ingen kategorier ennå. Opprett den første med knappen over.
          </p>
        ) : (
          <ul className="category-list">
            {active.map((category, index) => (
              <li key={category.id} className="category-row">
                {editingId === category.id ? (
                  <CategoryForm
                    initial={category}
                    onSave={async (input) => {
                      await updateCategory(uid, category.id, input)
                      setEditingId(null)
                    }}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <>
                    <span
                      className="category-dot"
                      style={{ background: category.color }}
                    />
                    <span className="category-name">{category.name}</span>
                    <div className="category-actions">
                      <button
                        className="btn btn-icon"
                        aria-label="Flytt opp"
                        disabled={index === 0}
                        onClick={() => move(index, -1)}
                      >
                        ↑
                      </button>
                      <button
                        className="btn btn-icon"
                        aria-label="Flytt ned"
                        disabled={index === active.length - 1}
                        onClick={() => move(index, 1)}
                      >
                        ↓
                      </button>
                      <button
                        className="btn btn-ghost btn-small"
                        onClick={() => {
                          setEditingId(category.id)
                          setShowNewForm(false)
                        }}
                      >
                        Rediger
                      </button>
                      <button
                        className="btn btn-ghost btn-small"
                        onClick={() =>
                          setCategoryArchived(uid, category.id, true)
                        }
                      >
                        Arkiver
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {archived.length > 0 && (
        <section className="card">
          <h2>Arkiverte</h2>
          <ul className="category-list">
            {archived.map((category) => (
              <li key={category.id} className="category-row category-archived">
                <span
                  className="category-dot"
                  style={{ background: category.color }}
                />
                <span className="category-name">{category.name}</span>
                <div className="category-actions">
                  <button
                    className="btn btn-ghost btn-small"
                    onClick={() => setCategoryArchived(uid, category.id, false)}
                  >
                    Gjenopprett
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
