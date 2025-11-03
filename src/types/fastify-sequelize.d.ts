import 'fastify'

import type { Model, ModelStatic, Sequelize } from 'sequelize'

declare module 'fastify' {
  interface FastifyInstance {
    sequelize: Sequelize
    models: Record<string, ModelStatic<Model>>
  }
}
