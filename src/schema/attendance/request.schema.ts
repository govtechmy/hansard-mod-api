import { z } from 'zod'

import { HOUSE } from '@/types/enum'

export const attendanceQuerySchema = z.object({
  house: z.enum(HOUSE).optional(),
  term: z.string().optional(),
  session: z.string().optional(),
  meeting: z.string().optional(),
})

