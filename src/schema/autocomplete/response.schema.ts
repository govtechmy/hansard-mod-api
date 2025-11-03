import { z } from 'zod'

// Raw payload for GET /autocomplete
export const autocompleteResponseSchema = z.object({
  suggestions: z.array(z.string()),
  query: z.string(),
})
