export interface SpeechRow {
  sitting_id: number
  index: number
  speaker_id: number | null
  timestamp: string
  speech: string | null
  speech_tokens: string[]
  length: number
  level_1: string | null
  level_2: string | null
  level_3: string | null
  is_annotation: boolean
}

export interface RawSpeechRow {
  index: number | string
  speaker: number | string | null
  timestamp: string
  speech?: string | null
  proc_speech?: string | null
  speech_tokens?: unknown
  length?: number | string | null
  level_1?: string | null
  level_2?: string | null
  level_3?: string | null
  is_annotation?: boolean
  author?: string | null
}

export function buildSpeechRows(
  rawSpeechList: ReadonlyArray<RawSpeechRow>,
  sittingId: number,
  authorHistoryLookup: Map<number, number>,
): SpeechRow[] {
  return rawSpeechList
    .filter(row => !row?.is_annotation)
    .map(row => {
      const authorId = row.speaker != null ? Number(row.speaker) : null
      const authorHistoryId = authorId != null ? (authorHistoryLookup.get(authorId) ?? null) : null
      return {
        sitting_id: sittingId,
        index: Number(row.index),
        speaker_id: authorHistoryId,
        timestamp: String(row.timestamp ?? ''),
        speech: row.speech ?? row.proc_speech ?? null,
        speech_tokens: Array.isArray(row.speech_tokens)
          ? row.speech_tokens.filter((token): token is string => typeof token === 'string')
          : [],
        length: Number(row.length ?? 0),
        level_1: row.level_1 ?? null,
        level_2: row.level_2 ?? null,
        level_3: row.level_3 ?? null,
        is_annotation: Boolean(row.is_annotation),
      }
    })
}
