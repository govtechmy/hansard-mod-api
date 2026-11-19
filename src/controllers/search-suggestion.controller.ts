import type { FastifyReply, FastifyRequest } from 'fastify'
import { QueryTypes } from 'sequelize'
import type { z } from 'zod'

import type { searchSuggestionQuerySchema } from '@/schema/search'

export async function getSearchSuggestion(
  request: FastifyRequest<{ Querystring: z.infer<typeof searchSuggestionQuerySchema> }>,
  reply: FastifyReply,
) {
  const query = request.query.q.trim().toLowerCase().replace(/\s+/gu, ' ')
  const words = [...new Set(query.match(/\p{L}+/gu) ?? [])].filter(word => word.length >= 3 && word.length <= 64)
  if (words.length === 0) {
    return reply.send({ query, suggestions: [], did_you_mean: null })
  }

  // shortcut: dictionary is a corpus snapshot, automate refreshes if imports become frequent.
  const rows = await request.server.sequelize.query<{ original: string; correction: string }>(
    `
    SELECT input.word AS original, coalesce(fuzzy.word, input.word) AS correction
    FROM unnest(ARRAY[:words]::text[]) AS input(word)
    LEFT JOIN api_search_dictionary exact ON exact.word = input.word
    LEFT JOIN LATERAL (
      SELECT candidate.word
      FROM (
        SELECT word, frequency, word <-> input.word AS distance
        FROM api_search_dictionary
        ORDER BY word <-> input.word, frequency DESC, word
        LIMIT 10
      ) candidate
      WHERE candidate.distance <= 0.8
        AND abs(char_length(candidate.word) - char_length(input.word)) <= 2
        AND candidate.word <> input.word
        AND (exact.word IS NULL OR candidate.frequency >= exact.frequency * 100)
      ORDER BY (1 - candidate.distance) * ln(1 + candidate.frequency) DESC, candidate.distance, candidate.word
      LIMIT 1
    ) fuzzy ON true
  `,
    { replacements: { words }, type: QueryTypes.SELECT },
  )

  const corrections = new Map(rows.map(row => [row.original, row.correction]))
  const corrected = query.replace(/\p{L}+/gu, word => corrections.get(word) ?? word)
  const suggestion = corrected === query ? null : corrected
  return reply.send({ query, suggestions: suggestion ? [suggestion] : [], did_you_mean: suggestion })
}
