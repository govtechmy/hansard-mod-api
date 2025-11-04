import { timingSafeEqual } from 'node:crypto'

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'

/**
 * Registers a simple bearer token authorization hook.
 * Applies only to `/api/` routes so health checks & docs remain accessible.
 */
export function registerAuth(app: FastifyInstance, expectedToken: string, opts?: { verbose?: boolean }) {
  const normalizedExpected = expectedToken.trim()
  const expectedBuffer = Buffer.from(normalizedExpected)
  const verbose = Boolean(opts?.verbose)

  app.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip non-API routes (e.g., '/', '/docs', swagger assets)
    if (!request.url.startsWith('/api/')) return

    // Exclude health endpoint from auth entirely
    const pathOnly = request.url.split('?')[0]
    if (pathOnly === '/api/health') return

    const auth = request.headers.authorization
    if (!auth || !auth.startsWith('Bearer ')) {
      request.log.warn({ url: request.url, route: request.routeOptions.url }, 'auth:missing-or-malformed')
      reply.code(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Missing bearer token' })
      return
    }

    const token = auth.slice('Bearer '.length).trim()
    const tokenBuffer = Buffer.from(token)

    const valid = tokenBuffer.length === expectedBuffer.length && timingSafeEqual(tokenBuffer, expectedBuffer)
    if (!valid) {
      request.log.warn({ url: request.url, route: request.routeOptions.url }, 'auth:invalid-token')
      reply.code(401).send({ statusCode: 401, error: 'Unauthorized', message: 'Invalid bearer token' })
      return
    }
    if (verbose) {
      // Don't log the token; log metadata only
      request.log.info({ url: request.url, route: request.routeOptions.url }, 'auth:ok')
    }
    // Auth OK – continue
  })
}

export default registerAuth
