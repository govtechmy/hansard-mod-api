import type { QueryInterface } from 'sequelize'

import { refreshSearchDictionary } from '../services/search-dictionary.svc'

export async function up({ context }: { context: QueryInterface }) {
  await context.sequelize.transaction(async transaction => {
    await context.sequelize.query('CREATE EXTENSION IF NOT EXISTS pg_trgm', { transaction })
    await context.sequelize.query(
      `
      CREATE TABLE IF NOT EXISTS api_search_dictionary (
        word text PRIMARY KEY,
        frequency bigint NOT NULL
      )
    `,
      { transaction },
    )
    await context.sequelize.query(
      'CREATE INDEX IF NOT EXISTS api_search_dictionary_trgm ON api_search_dictionary USING gist (word gist_trgm_ops)',
      {
        transaction,
      },
    )
  })
  await refreshSearchDictionary(context.sequelize)
}

export async function down({ context }: { context: QueryInterface }) {
  await context.sequelize.query('DROP TABLE api_search_dictionary')
}
