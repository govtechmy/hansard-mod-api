import type { FastifyInstance } from 'fastify'

import { disconnectFromDatabase, getSequelizeClient } from '@/config/db.config'
import { initAreaModel } from '@/models/area.model'
import { initAttendanceModel } from '@/models/attendance.model'
import { initAuthorModel } from '@/models/author.model'
import { initAuthorHistoryModel } from '@/models/author-history.model'
import { initParliamentaryCycleModel } from '@/models/parliamentary-cycle.model'
import { initSittingModel } from '@/models/sitting.model'
import { initSpeechModel } from '@/models/speech.model'

export async function registerSequelize(app: FastifyInstance) {
  const sequelize = getSequelizeClient()

  const Area = initAreaModel(sequelize)
  const ParliamentaryCycle = initParliamentaryCycleModel(sequelize)
  const Sitting = initSittingModel(sequelize)
  const Author = initAuthorModel(sequelize)
  const AuthorHistory = initAuthorHistoryModel(sequelize)
  const Speech = initSpeechModel(sequelize)
  const Attendance = initAttendanceModel(sequelize)

  // Associations (minimal, for future use; controllers keep raw SQL)
  Sitting.belongsTo(ParliamentaryCycle, { foreignKey: 'cycle_id', as: 'cycle' })
  AuthorHistory.belongsTo(Author, { foreignKey: 'author_id', as: 'author' })
  AuthorHistory.belongsTo(Area, { foreignKey: 'area_id', as: 'area' })
  Speech.belongsTo(Sitting, { foreignKey: 'sitting_id', as: 'sitting' })
  Speech.belongsTo(AuthorHistory, { foreignKey: 'speaker_id', as: 'speaker' })
  Attendance.belongsTo(AuthorHistory, { foreignKey: 'author_id', as: 'author' })
  Attendance.belongsTo(Sitting, { foreignKey: 'sitting_id', as: 'sitting' })

  app.decorate('sequelize', sequelize)
  app.decorate('models', { Area, ParliamentaryCycle, Sitting, Author, AuthorHistory, Speech, Attendance })

  app.addHook('onClose', async () => {
    await disconnectFromDatabase()
  })
}
