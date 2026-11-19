import { z } from 'zod'

export const parliamentaryCycleItemSchema = z.object({
  cycle_id: z.number(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  house: z.number(),
  term: z.number(),
  session: z.number(),
  meeting: z.number().nullable(),
})

// Raw payload for POST /parliamentary-cycle
export const createParliamentaryCycleResponseSchema = parliamentaryCycleItemSchema
