import { z } from "zod";
import { RESPONSE_STATUS } from "@/types/enum";

export const parliamentaryCycleItemSchema = z.object({
  cycle_id: z.number(),
  start_date: z.string(),
  end_date: z.string(),
  house: z.number(),
  term: z.number(),
  session: z.number(),
  meeting: z.number(),
});

export const createParliamentaryCycleResponseSchema = z.object({
  status: z.enum(RESPONSE_STATUS).default(RESPONSE_STATUS.SUCCESS),
  statusCode: z.number().default(201),
  data: parliamentaryCycleItemSchema,
});


