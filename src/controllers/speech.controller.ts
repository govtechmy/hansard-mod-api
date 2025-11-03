import type { FastifyReply, FastifyRequest } from 'fastify'

import type { Speech, SpeechBulkBody } from '@/types'
import { toPlainRows } from '@/utils'

export async function bulkCreateSpeeches(request: FastifyRequest<{ Body: SpeechBulkBody }>, reply: FastifyReply) {
  try {
    const { Speech: SpeechModel } = request.server.models
    if (!Array.isArray(request.body)) {
      return reply.code(400).send({ error: 'Bulk creation is required.' })
    }

    const payload = request.body as SpeechBulkBody
    const created = await SpeechModel.bulkCreate(payload as unknown as Parameters<typeof SpeechModel.bulkCreate>[0], {
      returning: true,
      validate: true,
    })
    const plain = toPlainRows<Speech>(created as unknown as Array<Speech & { toJSON?: () => Speech }>)
    return reply.code(201).send(plain)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bad Request'
    return reply.code(400).send({ error: message })
  }
}
