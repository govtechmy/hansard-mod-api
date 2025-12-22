import type { FastifyReply, FastifyRequest } from 'fastify'

import type { AuthorHistory as AuthorHistoryEntity } from '@/types'
import { toPlainRows } from '@/utils'

export async function getAuthorHistory(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { AuthorHistory, Area } = request.server.models

    type AuthorHistoryWithArea = AuthorHistoryEntity & { area?: { name: string | null } }

    const rows = await AuthorHistory.findAll({
      include: [{ model: Area, as: 'area', attributes: ['name'] }],
      order: [['record_id', 'ASC']],
    })
    const plainRows = toPlainRows<AuthorHistoryWithArea>(
      rows as unknown as Array<AuthorHistoryWithArea & { toJSON?: () => AuthorHistoryWithArea }>,
    )
    const payload = plainRows.map(({ area, ...rest }) => ({ ...rest, area_name: area?.name ?? null }))
    return reply.send(payload)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bad Request'
    return reply.code(400).send({ error: message })
  }
}
