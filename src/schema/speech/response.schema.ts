import { z } from 'zod'

import { speechItemSchema } from './request.schema'

// Raw payload for POST /speech
export const speechBulkResponseSchema = z.array(speechItemSchema.partial({ sitting_id: true }))
