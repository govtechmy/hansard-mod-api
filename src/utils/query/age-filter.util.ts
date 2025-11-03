export function translateAgeGroupToBirthYearBounds(
  grp: string,
  currentYear: number,
): { clause: string; params: Record<string, number> } | null {
  if (!grp) return null
  if (grp === 'unknown') return { clause: 'a.birth_year IS NULL', params: {} }
  if (grp === '70') return { clause: 'a.birth_year <= :ageEnd', params: { ageEnd: currentYear - 70 } }
  if (grp.includes('-')) {
    const [loStr, hiStr] = grp.split('-')
    const lo = Number(loStr)
    const hi = Number(hiStr)
    if (!Number.isNaN(lo) && !Number.isNaN(hi)) {
      return {
        clause: 'a.birth_year BETWEEN :ageStart AND :ageEnd',
        params: { ageStart: currentYear - hi, ageEnd: currentYear - lo },
      }
    }
  }
  return null
}
