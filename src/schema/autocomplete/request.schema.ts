import { z } from 'zod'

import { HOUSE } from '@/types/enum'

export const autocompleteQuerySchema = z.object({
  q: z.string().optional(),
  limit: z.coerce.number().optional(),
  house: z.enum(HOUSE).optional(),
})
