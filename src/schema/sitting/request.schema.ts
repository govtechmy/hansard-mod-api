import { z } from 'zod'

import { HOUSE } from '@/types/enum'

export const getSittingQuerySchema = z.object({
  house: z.enum(HOUSE),
  date: z.string().min(1),
})

export const upsertSittingBodySchema = z
  .object({
    filename: z.string().min(1),
    house: z.enum(HOUSE),
    date: z.string().min(1),
    speech_data: z.string().min(1), // JSON string
    term: z.number().int().optional(),
    session: z.number().int().optional(),
    summary_status: z.string().optional(),
  })
  .refine(body => body.house !== 'semua', { message: 'A specific house is required', path: ['house'] })
  .refine(body => body.house !== 'majlis-mengangkat-sumpah' || (body.term != null && body.session != null), {
    message: 'MMS requires term and session',
    path: ['term'],
  })

export const getSittingListQuerySchema = z.object({
  house: z.union([z.enum(HOUSE), z.array(z.enum(HOUSE))]).optional(),
})
