export interface SpeechRow {
  sitting_id: number
  index: number
  speaker_id: number | null
  timestamp: string
  speech: string
  speech_tokens: string[]
  length: number
  level_1: string | null
  level_2: string | null
  level_3: string | null
  is_annotation: boolean
}

export function buildSpeechRows(rawSpeechList: any[], sittingId: number, authorHistoryLookup: Map<number, number>): SpeechRow[] {
  return rawSpeechList
    .filter(row => !row?.is_annotation)
    .map(row => {
      const authorId = row?.speaker != null ? Number(row.speaker) : null
      const authorHistoryId = authorId != null ? (authorHistoryLookup.get(authorId) ?? null) : null
      return {
        sitting_id: sittingId,
        index: Number(row.index),
        speaker_id: authorHistoryId,
        timestamp: row.timestamp,
        speech: row.speech,
        speech_tokens: Array.isArray(row.speech_tokens) ? row.speech_tokens : [],
        length: Number(row.length ?? 0),
        level_1: row.level_1 ?? null,
        level_2: row.level_2 ?? null,
        level_3: row.level_3 ?? null,
        is_annotation: Boolean(row.is_annotation),
      }
    })
}
