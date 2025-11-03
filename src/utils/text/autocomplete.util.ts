export function normalizeQ(raw: unknown): string {
  return (raw ?? '').toString().trim().toLowerCase()
}

export function buildPrefixTsQuery(raw: string): string {
  const words = raw.split(/\s+/).filter(Boolean)
  return words.length ? words.map(w => `${w}:*`).join(' & ') : `${raw}:*`
}

export function extractSuggestions(speeches: string[], query: string, max: number): string[] {
  const wordsSet = new Set<string>()
  const qWords = query.split(/\s+/).filter(Boolean)
  for (const speech of speeches) {
    const speechLower = speech.toLowerCase()
    if (qWords.length > 1) {
      const phrase = qWords.join(' ')
      if (speechLower.includes(phrase) && wordsSet.size < max * 3) wordsSet.add(phrase)
    }
    for (const word of speechLower.split(/\s+/)) {
      const clean = word.replace(/[^a-z]/g, '')
      for (const qw of qWords) {
        if (clean.length > 2 && clean.startsWith(qw) && wordsSet.size < max * 3) {
          wordsSet.add(clean)
        }
      }
    }
  }
  return Array.from(wordsSet)
    .filter(s => s !== query && s.length > 1)
    .slice(0, max)
}
