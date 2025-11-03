export function addToHierarchy(levels: (string | null)[], data: any, result: any[]) {
  if (!levels.filter(Boolean).length) {
    result.push(data)
    return
  }
  let currentLevel = result as any[]
  for (const level of levels) {
    if (!level) continue
    let found: any = null
    for (const item of currentLevel) {
      if (level in item) {
        found = item
        break
      }
    }
    if (!found) {
      const newEntry: Record<string, any[]> = { [level]: [] }
      currentLevel.push(newEntry)
      currentLevel = newEntry[level]!
    } else {
      currentLevel = found[level]!
    }
  }
  currentLevel.push(data)
}

export function buildNestedSpeeches(raw: any[]): any[] {
  const result: any[] = []
  for (const row of raw) {
    const speechDict = {
      speech: row['proc_speech'] ?? row['speech'],
      author: row['author'] ?? null,
      author_id: row['speaker'] != null ? Number(row['speaker']) : null,
      timestamp: row['timestamp'],
      is_annotation: Boolean(row['is_annotation']),
      index: Number(row['index']),
    }
    const levels = [row['level_1'], row['level_2'], row['level_3']] as (string | null)[]
    addToHierarchy(levels, speechDict, result)
  }
  return result
}
