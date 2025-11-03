/* eslint-disable no-console */
import { Sequelize } from 'sequelize'

import { env } from './env.config'

let sequelize: Sequelize | null = null
let isAuthenticated = false

export function getSequelizeClient(): Sequelize {
  if (!sequelize) {
    sequelize = new Sequelize(env.DATABASE_URL, {
      dialect: 'postgres',
      logging: false,
    })
  }

  return sequelize
}

export async function connectToDatabase(): Promise<Sequelize> {
  const client = getSequelizeClient()

  if (isAuthenticated) {
    return client
  }

  try {
    await client.authenticate()
    console.log('PostgreSQL connected via Sequelize')
    isAuthenticated = true
  } catch (error) {
    console.error(`Error connecting to PostgreSQL: ${JSON.stringify(error)}`)
    throw error
  }

  return client
}

export async function disconnectFromDatabase(): Promise<void> {
  if (!sequelize) {
    console.log('PostgreSQL connection already closed')
    return
  }

  await sequelize.close()
  console.log('PostgreSQL connection closed')
  sequelize = null
  isAuthenticated = false
}
