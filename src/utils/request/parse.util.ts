import { type House, HOUSE_TO_CODE } from '@/types/enum'

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
