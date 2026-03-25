import { z } from 'zod'

export const searchResultItemSchema = z.object({
  index: z.number(),
  speaker: z.string().nullable().optional(),
  author_id: z.number().nullable().optional(),
  trimmed_speech: z.string(),
  relevance_score: z.number().nullable().optional(),
  house: z.number().nullable().optional(),
  sitting: z.object({
    date: z.string(),
    term: z.number(),
    session: z.number(),
    meeting: z.number(),
    house: z.number().nullable().optional(),
  }),
})

export const searchMPDocResultItemSchema = z.object({
  date: z.string(),
  term: z.number(),
  session: z.number(),
  meeting: z.number(),
  house: z.number().nullable().optional(),
})

// Raw payload for GET /search
export const searchResultsResponseSchema = z.object({
  results: z.array(searchResultItemSchema),
  count: z.number(),
  next: z.number().nullable(),
  previous: z.number().nullable(),
})

// Raw payload for GET /search
export const searchMPDocResultsResponseSchema = z.object({
  results: z.array(searchMPDocResultItemSchema),
  count: z.number(),
  next: z.number().nullable(),
  previous: z.number().nullable(),
})

// Raw payload for GET /search-plot
export const searchPlotResponseSchema = z.object({
  chart_data: z.object({ date: z.array(z.string()), freq: z.array(z.number()) }),
  total_results: z.number(),
  top_word_freq: z.record(z.string(), z.number()),
  top_speakers: z.array(z.record(z.string(), z.number())),
})
