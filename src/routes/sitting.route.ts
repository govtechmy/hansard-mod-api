import type { FastifyInstance } from 'fastify'

import { getSitting, getSittingList, upsertSitting } from '@/controllers/sitting.controller'
import {
  getSittingListQuerySchema,
  getSittingListResponseSchema,
  getSittingQuerySchema,
  getSittingResponseSchema,
  upsertSittingBodySchema,
  upsertSittingResponseSchema,
} from '@/schema'

export async function registerSittingRoutes(app: FastifyInstance) {
  app.get(
    '/sitting/list',
    {
      schema: {
        tags: ['Sitting'],
        summary: 'Get speeches and metadata for a list of sittings',
        querystring: getSittingListQuerySchema,
        response: { 200: getSittingListResponseSchema },
      },
    },
    getSittingList,
  )

  app.get(
    '/sitting',
    {
      schema: {
        tags: ['Sitting'],
        summary: 'Get speeches and metadata for a single sitting',
        querystring: getSittingQuerySchema,
        response: { 200: getSittingResponseSchema },
      },
    },
    getSitting,
  )

  app.post(
    '/sitting',
    {
      schema: {
        tags: ['Sitting'],
        summary: 'Create or update a sitting and speeches',
        body: upsertSittingBodySchema,
        response: { 201: upsertSittingResponseSchema },
      },
    },
    upsertSitting,
  )
}
