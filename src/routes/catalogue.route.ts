import type { FastifyInstance } from 'fastify'

import { getCatalogue } from '@/controllers/catalogue.controller'
import { getCatalogueResponseSchema } from '@/schema'
import { catalogueQuerySchema } from '@/schema'

export async function registerCatalogueRoutes(app: FastifyInstance) {
  app.get(
    '/catalogue',
    {
      schema: {
        tags: ['Catalogue'],
        summary: 'List sittings catalogue',
        querystring: catalogueQuerySchema,
        response: { 200: getCatalogueResponseSchema },
      },
    },
    getCatalogue,
  )
}
