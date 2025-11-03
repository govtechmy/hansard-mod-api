import type { FastifyReply, FastifyRequest } from 'fastify'
import { QueryTypes } from 'sequelize'

import type { AutocompleteQuery, AutocompleteResponse, AutocompleteSpeechRow, SqlBindings } from '@/types'
import { type House, HOUSE_TO_CODE } from '@/types/enum'
import { buildPrefixTsQuery, extractSuggestions, normalizeQ } from '@/utils'

export async function getAutocomplete(request: FastifyRequest<{ Querystring: AutocompleteQuery }>, reply: FastifyReply) {
  try {
    const { sequelize } = request.server
    const rawQuery = normalizeQ(request.query.q)
    const maxSuggestions = Number(request.query.limit ?? 8)
    if (rawQuery.length < 2) {
      return reply.send({ suggestions: [], query: rawQuery })
    }

    const house = HOUSE_TO_CODE[(request.query.house ?? 'dewan-rakyat') as House] ?? 0

    // Attempt exact FTS match first
    const exactSql = `
      SELECT s.speech
      FROM api_speech s
      JOIN api_sitting si ON s.sitting_id = si.sitting_id
      JOIN api_parliamentary_cycle pc ON si.cycle_id = pc.cycle_id
      WHERE pc.house = :house AND s.is_annotation = false
        AND s.speech_vector @@ plainto_tsquery('english', :q)
      LIMIT 100
    `
    const exactReplacements: SqlBindings = { house, q: rawQuery }
    let speeches = await sequelize.query<AutocompleteSpeechRow>(exactSql, {
      replacements: exactReplacements,
      type: QueryTypes.SELECT,
    })

    if (!speeches.length) {
      // Fallback to prefix raw query
      const rawTs = buildPrefixTsQuery(rawQuery)
      const prefixSql = `
        SELECT s.speech
        FROM api_speech s
        JOIN api_sitting si ON s.sitting_id = si.sitting_id
        JOIN api_parliamentary_cycle pc ON si.cycle_id = pc.cycle_id
        WHERE pc.house = :house AND s.is_annotation = false
          AND s.speech_vector @@ to_tsquery('english', :raw)
        LIMIT 100
      `
      const prefixReplacements: SqlBindings = { house, raw: rawTs }
      speeches = await sequelize.query<AutocompleteSpeechRow>(prefixSql, {
        replacements: prefixReplacements,
        type: QueryTypes.SELECT,
      })
    }

    const speechStrings = speeches.map(r => r.speech ?? '')
    const suggestions = extractSuggestions(speechStrings, rawQuery, maxSuggestions)
    const res: AutocompleteResponse = { suggestions, query: rawQuery }
    return reply.send(res)
  } catch {
    const query = normalizeQ(request.query.q)
    const fallback: AutocompleteResponse = { suggestions: [], query }
    return reply.code(200).send(fallback)
  }
}
