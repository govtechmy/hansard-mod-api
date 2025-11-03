import type { FastifyReply, FastifyRequest } from 'fastify'
import type { SpeechBulkBody } from '@/types'

export async function bulkCreateSpeeches(request: FastifyRequest<{ Body: SpeechBulkBody | any }>, reply: FastifyReply) {
  try {
    const { Speech } = request.server.models as any
    const isArray = Array.isArray(request.body)
    if (!isArray) {
      return reply.code(400).send({ error: 'Bulk creation is required.' })
    }

  const payload = request.body as SpeechBulkBody
    const created = await Speech.bulkCreate(payload, { returning: true, validate: true })
    return reply.code(201).send(created.map((r: any) => r?.toJSON?.() ?? r))
  } catch (err: any) {
    return reply.code(400).send({ error: err?.message ?? 'Bad Request' })
  }
}
