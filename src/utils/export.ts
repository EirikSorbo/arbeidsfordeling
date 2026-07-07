import type { Category, TimeEntry } from '../types'
import { toDateInputValue, toTimeInputValue } from './time'

function durationMinutes(entry: TimeEntry): number {
  const ms = Math.max(0, entry.end.getTime() - entry.start.getTime())
  return Math.round(ms / 60000)
}

// Nøytraliser regneark-formelinjeksjon: felt som starter med = + - @ (eller
// kontrolltegn) får en ledende apostrof før CSV-siteringen.
function guardInjection(value: string): string {
  if (value && /^[=+\-@\t\r]/.test(value)) return `'${value}`
  return value
}

// RFC-4180: siter felt som inneholder komma, anførselstegn, CR eller LF, og
// doble interne anførselstegn. Injeksjonsvakten havner inni sitatet.
function csvField(value: string): string {
  const guarded = guardInjection(value)
  if (/[",\r\n]/.test(guarded)) return `"${guarded.replace(/"/g, '""')}"`
  return guarded
}

function sortedAscending(entries: TimeEntry[]): TimeEntry[] {
  return [...entries].sort((a, b) => a.start.getTime() - b.start.getTime())
}

function nameResolver(categories: Category[]): (id: string) => string {
  const byId = new Map(categories.map((c) => [c.id, c.name]))
  return (id) => byId.get(id) ?? 'Ukjent'
}

function exportFilename(ext: 'csv' | 'json'): string {
  return `arbeidsfordeling-${toDateInputValue(new Date())}.${ext}`
}

function download(content: string, name: string, mime: string): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function exportEntriesCsv(
  entries: TimeEntry[],
  categories: Category[],
): void {
  const nameOf = nameResolver(categories)
  const header = ['dato', 'start', 'slutt', 'varighet_minutter', 'kategori', 'notat']
  const lines = [header.join(',')]
  for (const e of sortedAscending(entries)) {
    lines.push(
      [
        toDateInputValue(e.start),
        toTimeInputValue(e.start),
        toTimeInputValue(e.end),
        String(durationMinutes(e)),
        csvField(nameOf(e.categoryId)),
        csvField(e.note ?? ''),
      ].join(','),
    )
  }
  // UTF-8 BOM så Excel på Windows viser æøå; CRLF mellom rader (Excel-vennlig).
  const content = '﻿' + lines.join('\r\n')
  download(content, exportFilename('csv'), 'text/csv;charset=utf-8')
}

export function exportEntriesJson(
  entries: TimeEntry[],
  categories: Category[],
): void {
  const nameOf = nameResolver(categories)
  const rows = sortedAscending(entries).map((e) => ({
    date: toDateInputValue(e.start),
    start: toTimeInputValue(e.start),
    end: toTimeInputValue(e.end),
    durationMinutes: durationMinutes(e),
    categoryId: e.categoryId,
    category: nameOf(e.categoryId),
    note: e.note ?? '',
  }))
  const payload = {
    exportedAt: new Date().toISOString(),
    app: 'Arbeidsfordeling',
    count: rows.length,
    entries: rows,
  }
  download(
    JSON.stringify(payload, null, 2),
    exportFilename('json'),
    'application/json',
  )
}
