import { z } from "zod";

export const speechItemSchema = z.object({
  sitting_id: z.number(),
  index: z.number(),
  speaker_id: z.number().nullable(),
  timestamp: z.string(),
  speech: z.string().nullable(),
  speech_tokens: z.array(z.string()),
  length: z.number(),
  level_1: z.string().nullable(),
  level_2: z.string().nullable(),
  level_3: z.string().nullable(),
  is_annotation: z.boolean(),
});

export const speechBulkBodySchema = z.array(speechItemSchema);


