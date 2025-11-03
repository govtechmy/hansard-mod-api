import { Sequelize } from 'sequelize'
import { SequelizeStorage, Umzug } from 'umzug'

import { env } from '@/config/env.config'

async function getUmzug() {
  const sequelize = new Sequelize(env.DATABASE_URL, { dialect: 'postgres', logging: false })
  const umzug = new Umzug({
    migrations: {
      glob: 'src/migrations/*.ts',
    },
    context: sequelize.getQueryInterface(),
    storage: new SequelizeStorage({ sequelize }),
    logger: console,
  })
  return { umzug, sequelize }
}

async function run() {
  const cmd = process.argv[2]
  const { umzug, sequelize } = await getUmzug()
  try {
    if (cmd === 'up') {
      await umzug.up()
    } else if (cmd === 'down') {
      await umzug.down({ step: 1 })
    } else if (cmd === 'status') {
      const [executed, pending] = await Promise.all([umzug.executed(), umzug.pending()])
      console.log({ executed: executed.map(m => m.name), pending: pending.map(m => m.name) })
    } else {
      console.log('Usage: bun src/scripts/migrate.ts <up|down|status>')
    }
  } finally {
    await sequelize.close()
  }
}

run()
