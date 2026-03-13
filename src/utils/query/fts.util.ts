import type { SqlBindings } from '@/types'

export function buildHeadlineFragment(
  q: string,
  windowSize: number,
): { select: string; rankSelect: string; order: string; params: SqlBindings; condition: string } | null {
  const trimmed = q.trim().toLowerCase()
  if (!trimmed) return null
  const adjustedWindow = Math.max(10, windowSize - 10)
  return {
    select: `, ts_headline('english', s.speech, plainto_tsquery('english', :q), 'StartSel===, StopSel===, MinWords=${adjustedWindow}, MaxWords=${windowSize}') as headline`,
    rankSelect: ", ts_rank(s.speech_vector, plainto_tsquery('english', :q)) as rank",
    order: 'si.date DESC, rank DESC',
    params: { q: trimmed },
    condition: "s.speech_vector @@ plainto_tsquery('english', :q)",
  }
}
