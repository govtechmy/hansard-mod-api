import { ALL_HOUSE_CODES, type House, HOUSE_TO_CODE } from '@/types/enum'

export function parseNumber(value: unknown, fallback?: number): number {
  if (value == null) return fallback as number
  const n = Number(value)
  return Number.isNaN(n) ? (fallback as number) : n
}

export function normalizeQueryString(v: unknown): string {
  return (v ?? '').toString().trim()
}

export function resolveHouse(house?: House): number {
  return HOUSE_TO_CODE[(house ?? 'dewan-rakyat') as House] ?? 0
}

export function resolveHouses(house?: House | House[]): number[] {
  if (!house) return ALL_HOUSE_CODES
  const values = Array.isArray(house) ? house : [house]
  return values.includes('semua') ? ALL_HOUSE_CODES : [...new Set(values.map(value => resolveHouse(value)))]
}
