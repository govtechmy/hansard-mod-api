import { z } from 'zod'

export const parliamentaryCycleItemSchema = z.object({
  cycle_id: z.number(),
  start_date: z.string(),
  end_date: z.string(),
  house: z.number(),
  term: z.number(),
  session: z.number(),
  meeting: z.number(),
})

// Raw payload for POST /parliamentary-cycle
export const createParliamentaryCycleResponseSchema = parliamentaryCycleItemSchema
