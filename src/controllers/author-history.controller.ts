import type { FastifyReply, FastifyRequest } from 'fastify'
import { toPlainRows } from '@/utils'

export async function getAuthorHistory(request: FastifyRequest, reply: FastifyReply) {
  try {
    const AuthorHistory = request.server.models.AuthorHistory as any
  const rows = await AuthorHistory.findAll({ order: [['record_id', 'ASC']] })
  return reply.send(toPlainRows(rows))
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bad Request'
    return reply.code(400).send({ error: message })
  }
}
