import type { FastifyReply } from 'fastify'

export function mapError(err: unknown, defaultMsg = 'Bad Request'): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  return defaultMsg
}

export function sendError(reply: FastifyReply, status: number, err: unknown) {
  return reply.code(status).send({ error: mapError(err) })
}
