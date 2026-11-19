import type { Sequelize } from 'sequelize'
import { QueryTypes } from 'sequelize'

export async function refreshSearchDictionary(sequelize: Sequelize) {
  await sequelize.transaction(async transaction => {
    await sequelize.query('DELETE FROM api_search_dictionary', { transaction })

    let lastId = 0
    while (true) {
      const [batch] = await sequelize.query<{ last_id: number | null }>(
        `
        WITH batch AS MATERIALIZED (
          SELECT speech_id, speech, is_annotation FROM api_speech
          WHERE speech_id > :lastId ORDER BY speech_id LIMIT 5000
        ), inserted AS (
          INSERT INTO api_search_dictionary (word, frequency)
          SELECT tokens.word, count(*)
          FROM batch s
          CROSS JOIN LATERAL unnest(tsvector_to_array(to_tsvector('simple', coalesce(s.speech, '')))) AS tokens(word)
          WHERE s.is_annotation = false AND tokens.word ~ '^[[:alpha:]]{3,64}$'
          GROUP BY tokens.word
          ON CONFLICT (word) DO UPDATE
            SET frequency = api_search_dictionary.frequency + excluded.frequency
          RETURNING word
        )
        SELECT max(speech_id) AS last_id FROM batch
      `,
        { transaction, replacements: { lastId }, type: QueryTypes.SELECT },
      )
      if (batch?.last_id == null) break
      lastId = batch.last_id
    }
  })
}
