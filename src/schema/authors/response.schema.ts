import { z } from 'zod'

export const authorItemSchema = z.object({
  new_author_id: z.number(),
  name: z.string(),
  birth_year: z.number().nullable(),
  ethnicity: z.string(),
  sex: z.enum(['m', 'f']),
})

// Raw payload for GET /author
export const getAuthorsResponseSchema = z.array(authorItemSchema)
