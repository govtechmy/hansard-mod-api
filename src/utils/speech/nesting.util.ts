import type { RawSpeechRow } from './bulk-build.util'

export interface SpeechLeaf {
  speech: string | null
  author: string | null
  author_id: number | null
  timestamp: string
  is_annotation: boolean
  index: number
}

export type SpeechHierarchyEntry = SpeechLeaf | SpeechHierarchyBranch

export interface SpeechHierarchyBranch {
  [title: string]: SpeechHierarchyEntry[]
}

function isBranch(entry: SpeechHierarchyEntry): entry is SpeechHierarchyBranch {
  return typeof entry === 'object' && entry !== null && !('speech' in entry)
}

export function addToHierarchy(levels: (string | null)[], data: SpeechLeaf, result: SpeechHierarchyEntry[]) {
  if (!levels.some(Boolean)) {
    result.push(data)
    return
  }

  let currentLevel = result
  for (const level of levels) {
    if (!level) continue
    let branch = currentLevel.find(entry => isBranch(entry) && entry[level] !== undefined) as SpeechHierarchyBranch | undefined
    if (!branch) {
      branch = { [level]: [] }
      currentLevel.push(branch)
    }
    if (!branch[level]) {
      branch[level] = []
    }
    currentLevel = branch[level]!
  }
  currentLevel.push(data)
}

export function buildNestedSpeeches(raw: ReadonlyArray<RawSpeechRow>): SpeechHierarchyEntry[] {
  const result: SpeechHierarchyEntry[] = []
  for (const row of raw) {
    const speechDict: SpeechLeaf = {
      speech: row.proc_speech ?? row.speech ?? null,
      author: row.author ?? null,
      author_id: row.speaker != null ? Number(row.speaker) : null,
      timestamp: String(row.timestamp ?? ''),
      is_annotation: Boolean(row.is_annotation),
      index: Number(row.index ?? 0),
    }
    const levels: (string | null)[] = [row.level_1 ?? null, row.level_2 ?? null, row.level_3 ?? null]
    addToHierarchy(levels, speechDict, result)
  }
  return result
}
