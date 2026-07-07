import { useLayoutEffect, useRef, useState } from 'react'
import type { Category } from '../types'

interface Props {
  categories: Category[]
  onSelect: (id: string) => void
  /** Deaktiverer enkeltknapper (f.eks. kategorien en løpende timer bruker). */
  disabled?: (category: Category) => boolean
}

// Ønsket minstebredde per knapp og mellomrom (matcher CSS-gap 0.5rem).
const MIN_BTN = 120
const GAP = 8

/** Fordeler n knapper på r rader så jevnt som mulig, med flest øverst,
 *  slik at en eventuell kortere rad havner nederst. */
function rowSizes(n: number, cols: number): number[] {
  const rows = Math.max(1, Math.ceil(n / cols))
  const base = Math.floor(n / rows)
  const extra = n % rows
  return Array.from({ length: rows }, (_, r) => base + (r < extra ? 1 : 0))
}

/** Kategori-knapper der radene er så jevnt fordelt som mulig; knapper i
 *  samme rad er like brede, og en kortere nederste rad blir bredere så den
 *  fyller hele bredden. */
export function CategoryGrid({ categories, onSelect, disabled }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setWidth(el.clientWidth)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const n = categories.length
  // Antall knapper som får plass på en rad ved gjeldende bredde.
  const fit =
    width > 0 ? Math.floor((width + GAP) / (MIN_BTN + GAP)) : n
  const maxCols = Math.min(n, Math.max(1, fit))
  const sizes = rowSizes(n, maxCols)

  const rows: Category[][] = []
  let i = 0
  for (const size of sizes) {
    rows.push(categories.slice(i, i + size))
    i += size
  }

  return (
    <div className="quickstart" ref={ref}>
      {rows.map((row, ri) => (
        <div className="quickstart-row" key={ri}>
          {row.map((c) => (
            <button
              key={c.id}
              className="quickstart-btn"
              style={{ borderColor: c.color, background: `${c.color}22` }}
              disabled={disabled?.(c) ?? false}
              onClick={() => onSelect(c.id)}
            >
              <span>{c.name}</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}
