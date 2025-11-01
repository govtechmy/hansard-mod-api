import type { FastifyReply, FastifyRequest } from "fastify";
import { Sequelize, QueryTypes } from "sequelize";
import { createErrorResponse, createSuccessResponse } from "@/utils/response.util";
import { HOUSE_TO_CODE, type House } from "@/types/enum";

type AutocompleteQuery = { q?: string; limit?: string | number; house?: House };

export async function getAutocomplete(
  request: FastifyRequest<{ Querystring: AutocompleteQuery }>,
  reply: FastifyReply,
) {
  try {
    const { sequelize } = request.server as any;
    const rawQuery = (request.query.q ?? "").toString().trim().toLowerCase();
    const maxSuggestions = Number(request.query.limit ?? 8);
    if (rawQuery.length < 2) {
      return reply.send(createSuccessResponse({ suggestions: [], query: rawQuery }, 200));
    }

    const house = HOUSE_TO_CODE[(request.query.house ?? "dewan-rakyat") as House] ?? 0;

    // Attempt exact FTS match first
    const exactSql = `
      SELECT s.speech
      FROM api_speech s
      JOIN api_sitting si ON s.sitting_id = si.sitting_id
      JOIN api_parliamentary_cycle pc ON si.cycle_id = pc.cycle_id
      WHERE pc.house = :house AND s.is_annotation = false
        AND s.speech_vector @@ plainto_tsquery('english', :q)
      LIMIT 100
    `;
    let speeches: any[] = await sequelize.query(exactSql, {
      replacements: { house, q: rawQuery },
      type: QueryTypes.SELECT,
    });

    if (!speeches.length) {
      // Fallback to prefix raw query: words -> w:* & ...
      const words = rawQuery.split(/\s+/).filter(Boolean);
      const raw = words.length ? words.map((w) => `${w}:*`).join(" & ") : `${rawQuery}:*`;
      const prefixSql = `
        SELECT s.speech
        FROM api_speech s
        JOIN api_sitting si ON s.sitting_id = si.sitting_id
        JOIN api_parliamentary_cycle pc ON si.cycle_id = pc.cycle_id
        WHERE pc.house = :house AND s.is_annotation = false
          AND s.speech_vector @@ to_tsquery('english', :raw)
        LIMIT 100
      `;
      speeches = await sequelize.query(prefixSql, {
        replacements: { house, raw },
        type: QueryTypes.SELECT,
      });
    }

    const wordsSet = new Set<string>();
    const qWords = rawQuery.split(/\s+/).filter(Boolean);
    for (const row of speeches) {
      const speech: string = row.speech ?? "";
      const speechLower = speech.toLowerCase();
      if (qWords.length > 1) {
        const phrase = qWords.join(" ");
        if (speechLower.includes(phrase) && wordsSet.size < maxSuggestions * 3) wordsSet.add(phrase);
      }
      for (const word of speechLower.split(/\s+/)) {
        const clean = word.replace(/[^a-z]/g, "");
        for (const qw of qWords) {
          if (clean.length > 2 && clean.startsWith(qw) && wordsSet.size < maxSuggestions * 3) {
            wordsSet.add(clean);
          }
        }
      }
    }

    const uniqueSuggestions = Array.from(wordsSet).filter((s) => s !== rawQuery && s.length > 1);
    const result = { suggestions: uniqueSuggestions.slice(0, maxSuggestions), query: rawQuery };
    return reply.send(createSuccessResponse(result, 200));
  } catch (err: any) {
    return reply.code(200).send(createSuccessResponse({ suggestions: [], query: (request.query.q ?? "").toString() }, 200));
  }
}


