export function aggregateAverage(rows: Array<{ key: string; value: number }>) {
  const map = new Map<string, { sum: number; n: number }>()
  for (const r of rows) {
    const k = r.key ?? ''
    const e = map.get(k) ?? { sum: 0, n: 0 }
    e.sum += r.value
    e.n += 1
    map.set(k, e)
  }
  return Array.from(map.entries()).map(([k, v]) => ({ x: k, y: v.n ? v.sum / v.n : 0 }))
}
