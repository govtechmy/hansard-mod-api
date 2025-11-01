import { z } from "zod";
import { RESPONSE_STATUS } from "@/types/enum";

export const sittingMetaSchema = z.object({
  sitting_id: z.number().optional(),
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

export const getSittingResponseSchema = z.object({
  status: z.enum(RESPONSE_STATUS).default(RESPONSE_STATUS.SUCCESS),
  statusCode: z.number().default(200),
  data: getSittingDataSchema,
});

export const upsertSittingResponseSchema = z.object({
  status: z.enum(RESPONSE_STATUS).default(RESPONSE_STATUS.SUCCESS),
  statusCode: z.number().default(201),
  data: z.union([sittingMetaSchema, z.object({ sitting: sittingMetaSchema, warning: z.string().optional(), speech_errors: z.any().optional() })]),
});


