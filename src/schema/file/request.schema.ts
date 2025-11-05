import { z } from 'zod'

export const fileDownloadRequestSchema = z.object({
  key: z.string().min(1, 'File key/path is required'),
})
