import type { FastifyInstance } from 'fastify'

import { getAuthorHistory } from '@/controllers/author-history.controller'
import { getAuthorHistoryResponseSchema } from '@/schema'

export async function registerAuthorHistoryRoutes(app: FastifyInstance) {
  app.get(
    '/author-history',
    {
      schema: {
        tags: ['AuthorHistory'],
        summary: 'List author history records',
        response: { 200: getAuthorHistoryResponseSchema.describe('List of author history records') },
      },
    },
    getAuthorHistory,
  )
}
