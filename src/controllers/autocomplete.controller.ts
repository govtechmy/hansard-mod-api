import type { FastifyReply, FastifyRequest } from 'fastify'
import { QueryTypes } from 'sequelize'

import { type House, HOUSE_TO_CODE } from '@/types/enum'
import { normalizeQ, buildPrefixTsQuery, extractSuggestions } from '@/utils'
import type { AutocompleteQuery, AutocompleteResponse } from '@/types'

export async function getAutocomplete(request: FastifyRequest<{ Querystring: AutocompleteQuery }>, reply: FastifyReply) {
  try {
    const { sequelize } = request.server as any
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
    let speeches: any[] = await sequelize.query(exactSql, {
      replacements: { house, q: rawQuery },
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
      speeches = await sequelize.query(prefixSql, {
        replacements: { house, raw: rawTs },
        type: QueryTypes.SELECT,
      })
    }

    const speechStrings = speeches.map(r => r.speech ?? '')
    const suggestions = extractSuggestions(speechStrings, rawQuery, maxSuggestions)
  const res: AutocompleteResponse = { suggestions, query: rawQuery }
  return reply.send(res)
  } catch {
    return reply.code(200).send({ suggestions: [], query: normalizeQ(request.query.q) } as AutocompleteResponse)
  }
}
