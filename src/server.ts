import type { FastifyInstance } from 'fastify'
import Fastify from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod'

import * as config from './config/index.config'
import { registerErrorHandler } from './middleware/errorHandler'
import * as plugins from './plugins/index.plugin'
import { registerApiRoutes } from './routes/index.route'

async function buildServer(): Promise<FastifyInstance> {
  //build the server
  const { isProduction } = config.env
  const app = Fastify({ ignoreTrailingSlash: true, logger: config.loggerOptions(isProduction) }).withTypeProvider<ZodTypeProvider>()

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  await plugins.registerAllPlugins(app, isProduction)
  registerErrorHandler(app)
  await app.register(registerApiRoutes, { prefix: '/api' })
  return app
}

async function start() {
  // Load environment configuration (including secrets from AWS if configured)
  const env = await config.loadEnv()

  //start the server
  const portFromEnv = env.PORT

  await config.connectToDatabase()
  const app = await buildServer()

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    app.log.error(`Unhandled Rejection: ${JSON.stringify({ reason, promise })}`)
    process.exit(1)
  })

  // Handle uncaught exceptions
  process.on('uncaughtException', error => {
    app.log.error(`Uncaught Exception: ${JSON.stringify(error)}`)
    process.exit(1)
  })

  // Graceful shutdown handling
  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal}, shutting down gracefully`)
    try {
      await app.close()
      await config.disconnectFromDatabase()
      app.log.info('Server closed successfully')
      process.exit(0)
    } catch (err) {
      app.log.error(err, 'shutdown:error')
      process.exit(1)
    }
  }

  // Handle shutdown signals
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))

  try {
    await app.listen({ port: portFromEnv, host: '0.0.0.0' })
    app.log.info(`Server listening on port ${portFromEnv}`)

  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start() //start the server

export type { FastifyInstance }
