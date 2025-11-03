export const AGE_GROUPS: Record<number, string> = {
  30: '18-29',
  40: '30-39',
  50: '40-49',
  60: '50-59',
  70: '60-69',
  999: '70+',
}

export function ageToGroup(age: number | null): string {
  if (age == null || Number.isNaN(age)) return '70+'
  const keys = Object.keys(AGE_GROUPS)
    .map(k => Number(k))
    .sort((a, b) => a - b)
  for (const k of keys) {
    if (age < k) return AGE_GROUPS[k]!
  }
  return AGE_GROUPS[Math.max(...keys)]!
}
