import type { FastifyInstance } from 'fastify'

import { registerAttendanceRoutes } from './attendance.route'
import { registerAuthorRoutes } from './author.route'
import { registerAuthorHistoryRoutes } from './author-history.route'
import { registerAutocompleteRoutes } from './autocomplete.route'
import { registerCatalogueRoutes } from './catalogue.route'
import { registerFileRoutes } from './file.route'
import { registerParliamentaryCycleRoutes } from './parliamentary-cycle.route'
import { registerSearchRoutes } from './search.route'
import { registerSittingRoutes } from './sitting.route'
import { registerSpeechRoutes } from './speech.route'

export async function registerApiRoutes(app: FastifyInstance) {
  app.get('/health', { schema: { tags: ['System'], summary: 'Healthcheck' } }, async () => {
    return { status: 'healthy' }
  })

  await registerParliamentaryCycleRoutes(app)
  await registerAuthorRoutes(app)
  await registerAuthorHistoryRoutes(app)
  await registerCatalogueRoutes(app)
  await registerSittingRoutes(app)
  await registerSearchRoutes(app)
  await registerAutocompleteRoutes(app)
  await registerAttendanceRoutes(app)
  await registerSpeechRoutes(app)
  await registerFileRoutes(app)
}
