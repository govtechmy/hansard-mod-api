import { z } from 'zod'

import { HOUSE } from '@/types/enum'

export const createCycleBodySchema = z
  .object({
    start_date: z.string().min(1).nullable(),
    end_date: z.string().min(1).nullable(),
    house: z.number().int().min(0).max(3),
    term: z.number().int(),
    session: z.number().int(),
    meeting: z.number().int().nullable(),
  })
  .refine(cycle => cycle.house === 3 || (cycle.start_date != null && cycle.end_date != null && cycle.meeting != null), {
    message: 'Meeting and dates are required for DR, DN and KK',
  })

export const catalogueQuerySchema = z.object({
  house: z.enum(HOUSE).optional(),
  term: z.coerce.number().optional(),
  dropdown: z.string().optional(),
})
