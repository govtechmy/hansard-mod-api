import type { FastifyInstance } from 'fastify'

import { createParliamentaryCycle } from '@/controllers/parliamentary-cycle.controller'
import { createCycleBodySchema, createParliamentaryCycleResponseSchema } from '@/schema'

export async function registerParliamentaryCycleRoutes(app: FastifyInstance) {
  app.post(
    '/parliamentary-cycle',
    {
      schema: {
        tags: ['ParliamentaryCycle'],
        summary: 'Create parliamentary cycle',
        body: createCycleBodySchema,
        response: { 201: createParliamentaryCycleResponseSchema.describe('Created parliamentary cycle') },
      },
    },
    createParliamentaryCycle,
  )
}
