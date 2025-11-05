import { z } from 'zod'

export const fileDownloadRequestSchema = z.object({
  url: z.string().min(1, 'URL is required'),
})
