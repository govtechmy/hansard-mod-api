import { z } from "zod";
import { RESPONSE_STATUS } from "@/types/enum";

export const sittingMetaSchema = z.object({
  sitting_id: z.number().optional(),
  cycle: z
    .object({
      cycle_id: z.number(),
      start_date: z.string(),
      end_date: z.string(),
      house: z.number(),
      term: z.number(),
      session: z.number(),
      meeting: z.number(),
    })
    .optional(),
  cycle_id: z.number().optional(),
  date: z.string(),
  filename: z.string(),
  has_dataset: z.boolean().optional(),
  is_final: z.boolean().optional(),
});

export const getSittingDataSchema = z.object({
  meta: sittingMetaSchema,
  speeches: z.any(),
});

// Raw payload for GET /sitting
export const getSittingResponseSchema = getSittingDataSchema;

// Raw payload for POST /sitting (either created meta or object with warning/speech_errors)
export const upsertSittingResponseSchema = z.union([
  sittingMetaSchema,
  z.object({ sitting: sittingMetaSchema, warning: z.string().optional(), speech_errors: z.any().optional() }),
]);


