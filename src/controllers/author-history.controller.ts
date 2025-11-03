import type { FastifyReply, FastifyRequest } from 'fastify'

import type { AuthorHistory as AuthorHistoryEntity } from '@/types'
import { toPlainRows } from '@/utils'

export async function getAuthorHistory(request: FastifyRequest, reply: FastifyReply) {
  try {
    const AuthorHistory = request.server.models.AuthorHistory
    const rows = await AuthorHistory.findAll({ order: [['record_id', 'ASC']] })
    const payload = toPlainRows<AuthorHistoryEntity>(rows as unknown as Array<AuthorHistoryEntity & { toJSON?: () => AuthorHistoryEntity }>)
    return reply.send(payload)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bad Request'
    return reply.code(400).send({ error: message })
  }
}
