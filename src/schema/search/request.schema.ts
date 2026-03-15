import { z } from 'zod'

import { HOUSE } from '@/types/enum'

export const searchQuerySchema = z.object({
  house: z.union([z.enum(HOUSE), z.array(z.enum(HOUSE))]).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  window_size: z.coerce.number().optional(),
  party: z.string().optional(),
  age_group: z.string().optional(),
  sex: z.enum(['m', 'f']).optional(),
  ethnicity: z.string().optional(),
  q: z.string().optional(),
  uid: z.coerce.number().optional(),
  page: z.coerce.number().optional(),
  page_size: z.coerce.number().optional(),
})

export const searchPlotQuerySchema = searchQuerySchema
