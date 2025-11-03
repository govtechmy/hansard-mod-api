import type { FastifyReply, FastifyRequest } from 'fastify'

import type { Author as AuthorEntity } from '@/types'
import { toPlainRows } from '@/utils'
// No specific query/body schema for authors list yet; could add if filtering is introduced.

export async function getAuthors(request: FastifyRequest, reply: FastifyReply) {
  try {
    const Author = request.server.models.Author
    const rows = await Author.findAll({ order: [['new_author_id', 'ASC']] })
    const payload = toPlainRows<AuthorEntity>(rows as unknown as Array<AuthorEntity & { toJSON?: () => AuthorEntity }>)
    return reply.send(payload)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bad Request'
    return reply.code(400).send({ error: message })
  }
}
