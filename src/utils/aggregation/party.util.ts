export interface PartyAggregate {
  party: string
  attendance_pct: number
  total_attended: number
  total: number
  total_seats: number
}

interface PartyAccumulator {
  attendance_pct_sum: number
  total_attended: number
  total: number
  total_seats: number
}

export function aggregatePartyStats(rows: Array<{ party: string; attendance_pct: number; total_attended: number; total: number }>): PartyAggregate[] {
  const partyMap = new Map<string, PartyAccumulator>()
  for (const r of rows) {
    const key = r.party ?? ''
    const e = partyMap.get(key) ?? { attendance_pct_sum: 0, total_attended: 0, total: 0, total_seats: 0 }
    e.attendance_pct_sum += r.attendance_pct
    e.total_attended += r.total_attended
    e.total += r.total
    e.total_seats += 1
    partyMap.set(key, e)
  }
  return Array.from(partyMap.entries()).map(([party, v]) => ({
    party,
    attendance_pct: v.total_seats ? v.attendance_pct_sum / v.total_seats : 0,
    total_attended: v.total_attended,
    total: v.total,
    total_seats: v.total_seats,
  }))
}
