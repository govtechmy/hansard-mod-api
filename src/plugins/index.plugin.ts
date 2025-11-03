import type { FastifyInstance } from 'fastify'

import { registerRequestLogging } from './request-logging'
import { registerSecurityPlugins } from './security'
import { registerSequelize } from './sequelize'
import { registerSwaggerPlugins } from './swagger'

export async function registerAllPlugins(app: FastifyInstance, isProduction: boolean): Promise<void> {
  await registerSequelize(app)
  await registerSecurityPlugins(app, isProduction)
  registerRequestLogging(app)
  await registerSwaggerPlugins(app)
}
