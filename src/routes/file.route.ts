import type { FastifyInstance } from 'fastify'
import { getFileDownloadLink } from 'src/controllers/file.controller'

import { fileDownloadRequestSchema, fileDownloadResponseSchema, standardErrorResponseSchema } from '@/schema'

import { withStandardErrors } from '../utils/swagger.util'

export async function registerFileRoutes(app: FastifyInstance) {
  app.post(
    '/file/download',
    {
      schema: {
        tags: ['File'],
        summary: 'Get download link',
        security: [{ bearerAuth: [] }],
        body: fileDownloadRequestSchema,
        response: withStandardErrors({
          200: fileDownloadResponseSchema.describe('Download link retrieved successfully'),
          404: standardErrorResponseSchema.describe('Link not found'),
        }),
      },
    },
    getFileDownloadLink,
  )
}
