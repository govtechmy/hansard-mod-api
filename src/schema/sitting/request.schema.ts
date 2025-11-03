import { z } from 'zod'

import { HOUSE } from '@/types/enum'

export const getSittingQuerySchema = z.object({
  house: z.enum(HOUSE),
  date: z.string().min(1),
})

export const upsertSittingBodySchema = z.object({
  filename: z.string().min(1),
  house: z.enum(HOUSE),
  date: z.string().min(1),
  speech_data: z.string().min(1), // JSON string
})
