import type { FastifyReply, FastifyRequest } from 'fastify'

import type { AuthorHistory as AuthorHistoryEntity } from '@/types'
import { toPlainRows } from '@/utils'

export async function getAuthorHistory(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { AuthorHistory, Area, Author } = request.server.models

    type AuthorHistoryWithJoins = AuthorHistoryEntity & {
      area?: { name: string | null }
      author?: { new_author_id: number }
    }

    const rows = await AuthorHistory.findAll({
      include: [
        { model: Area, as: 'area', attributes: ['name'] },
        { model: Author, as: 'author', attributes: ['new_author_id'] },
      ],
      order: [['record_id', 'ASC']],
    })
    const plainRows = toPlainRows<AuthorHistoryWithJoins>(
      rows as unknown as Array<AuthorHistoryWithJoins & { toJSON?: () => AuthorHistoryWithJoins }>,
    )
    const payload = plainRows.map(({ area, author, ...rest }) => ({
      ...rest,
      area_name: area?.name ?? null,
      new_author_id: author?.new_author_id ?? rest.author_id,
    }))
    return reply.send(payload)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bad Request'
    return reply.code(400).send({ error: message })
  }
}
