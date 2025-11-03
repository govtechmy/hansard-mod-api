import type { FastifyInstance } from 'fastify'

export function registerRequestLogging(app: FastifyInstance): void {
  app.addHook('preHandler', (request, _reply, done) => {
    const logBody = request.body && !Buffer.isBuffer(request.body) ? request.body : '[omitted]'
    request.log.info(
      `request payload: ${JSON.stringify({ params: request.params, body: logBody, method: request.method, url: request.url })}`,
    )
    done()
  })
}
