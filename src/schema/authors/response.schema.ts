import { z } from 'zod'

export const authorItemSchema = z.object({
  new_author_id: z.number(),
  name: z.string().nullable().optional(),
  birth_year: z.number().nullable().optional(),
  ethnicity: z.string().nullable().optional(),
  sex: z.enum(['m', 'f']).nullable().optional(),
})

// Raw payload for GET /author
export const getAuthorsResponseSchema = z.array(authorItemSchema)
