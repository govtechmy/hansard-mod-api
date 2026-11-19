import { getSequelizeClient } from '../config/db.config'
import { refreshSearchDictionary } from '../services/search-dictionary.svc'

const sequelize = getSequelizeClient()
try {
  await refreshSearchDictionary(sequelize)
  process.stdout.write('Search dictionary refreshed\n')
} finally {
  await sequelize.close()
}
