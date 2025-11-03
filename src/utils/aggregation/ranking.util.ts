export function computeTieAwareRanks(values: number[]): Map<number, number> {
  const unique = Array.from(new Set(values)).sort((a, b) => b - a)
  const rankMap = new Map<number, number>()
  unique.forEach((v, idx) => rankMap.set(v, idx + 1))
  return rankMap
}
