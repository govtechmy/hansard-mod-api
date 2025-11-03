import type { FastifyReply, FastifyRequest } from 'fastify'

export async function getAuthors(request: FastifyRequest, reply: FastifyReply) {
  try {
    const Author = request.server.models.Author as any
    const rows = await Author.findAll({ order: [['new_author_id', 'ASC']] })
    const json = rows.map((r: any) => r?.toJSON?.() ?? r)
    return reply.send(json)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bad Request'
    return reply.code(400).send({ error: message })
  }
}
