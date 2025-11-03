import type { FastifyReply, FastifyRequest } from 'fastify'
import type { CreateCycleBody } from '@/types'

export async function createParliamentaryCycle(request: FastifyRequest<{ Body: CreateCycleBody }>, reply: FastifyReply) {
  try {
    const ParliamentaryCycle = request.server.models.ParliamentaryCycle as any
    const instance = await ParliamentaryCycle.create(request.body)
    const created = instance?.toJSON?.() ?? instance
    return reply.code(201).send(created)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bad Request'
    return reply.code(400).send({ error: message })
  }
}
