import { z } from "zod";
import { RESPONSE_STATUS } from "@/types/enum";

export const searchResultItemSchema = z.object({
  index: z.number(),
  speaker: z.string().nullable().optional(),
  author_id: z.number().nullable().optional(),
  trimmed_speech: z.string(),
  relevance_score: z.number().nullable().optional(),
  sitting: z.object({
    date: z.string(),
    term: z.number(),
    session: z.number(),
    meeting: z.number(),
  }),
});

export const searchResultsResponseSchema = z.object({
  status: z.enum(RESPONSE_STATUS).default(RESPONSE_STATUS.SUCCESS),
  statusCode: z.number().default(200),
  data: z.object({
    results: z.array(searchResultItemSchema),
    count: z.number(),
    next: z.number().nullable(),
    previous: z.number().nullable(),
  }),
});

export const searchPlotResponseSchema = z.object({
  status: z.enum(RESPONSE_STATUS).default(RESPONSE_STATUS.SUCCESS),
  statusCode: z.number().default(200),
  data: z.object({
    chart_data: z.object({ date: z.array(z.string()), freq: z.array(z.number()) }),
    total_results: z.number(),
    top_word_freq: z.record(z.string(), z.number()),
    top_speakers: z.array(z.record(z.string(), z.number())),
  }),
});


