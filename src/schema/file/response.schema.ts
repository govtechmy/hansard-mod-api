import { z } from 'zod'

import { RESPONSE_STATUS } from '@/types/enum'

// The actual data payload inside the standard response wrapper
export const fileDownloadLinkDataSchema = z.object({
  url: z.string(),
})

// Standard wrapped response for POST /file/download (matches createSuccessResponse structure)
export const fileDownloadResponseSchema = z.object({
  status: z.enum(RESPONSE_STATUS),
  statusCode: z.number(),
  data: fileDownloadLinkDataSchema,
})
