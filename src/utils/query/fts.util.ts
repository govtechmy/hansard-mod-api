import type { SqlBindings } from '@/types'

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&')
}

export function buildHeadlineFragment(
  q: string,
  windowSize: number,
): { select: string; rankSelect: string; order: string; params: SqlBindings; condition: string } | null {
  const trimmed = q.trim()
  if (!trimmed) return null
  const adjustedWindow = Math.max(10, windowSize - 10)

  const isQuoted = trimmed.startsWith('"') && trimmed.endsWith('"')
  if (isQuoted) {
    const literal = trimmed.slice(1, -1).trim().toLowerCase()
    if (!literal) return null

    return {
      select: `, ts_headline('english', s.speech, plainto_tsquery('english', :q), 'StartSel===, StopSel===, MinWords=${adjustedWindow}, MaxWords=${windowSize}') as headline`,
      rankSelect: ", ts_rank(s.speech_vector, plainto_tsquery('english', :q)) as rank",
      order: 'si.date DESC, rank DESC',
      params: {
        q: literal,
        qLiteral: `%${escapeLikePattern(literal)}%`,
      },
      condition: "LOWER(s.speech) LIKE :qLiteral ESCAPE '\\'",
    }
  }

  const normalized = trimmed.toLowerCase()
  return {
    select: `, ts_headline('english', s.speech, plainto_tsquery('english', :q), 'StartSel===, StopSel===, MinWords=${adjustedWindow}, MaxWords=${windowSize}') as headline`,
    rankSelect: ", ts_rank(s.speech_vector, plainto_tsquery('english', :q)) as rank",
    order: 'si.date DESC, rank DESC',
    params: { q: normalized },
    condition: "s.speech_vector @@ plainto_tsquery('english', :q)",
  }
}
