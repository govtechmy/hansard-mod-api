import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import Fastify from 'fastify'
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod'
import { Sequelize } from 'sequelize'

import { up } from '@/migrations/202611180001-search-dictionary'
import { initSpeechModel } from '@/models/speech.model'
import { registerSearchRoutes } from '@/routes/search.route'
import { refreshSearchDictionary } from '@/services/search-dictionary.svc'

const databaseUrl = process.env.SEARCH_SUGGESTION_TEST_DATABASE_URL

describe.skipIf(!databaseUrl)('search suggestions with PostgreSQL', () => {
  const app = Fastify()
  const schema = `suggestion_test_${Date.now()}`

  // Each connection uses an isolated schema, leaving other test tables untouched.
  const isolated = new Sequelize(databaseUrl ?? 'postgres://localhost/hansard_test', {
    logging: false,
    dialectOptions: { options: `-c search_path=${schema},public` },
  })
  const speechModel = initSpeechModel(isolated)

  beforeAll(async () => {
    if (!new URL(databaseUrl!).pathname.endsWith('_test')) {
      throw new Error('Use a dedicated database whose name ends in _test')
    }
    await isolated.query(`CREATE SCHEMA ${schema}`)
    await speechModel.sync()
    await isolated.query(`INSERT INTO api_speech (index, timestamp, speech, is_annotation) VALUES
      (1, '10:00:00', 'harga minyak naik kerajaan ekonomi rakyat', false),
      (2, '10:01:00', 'harga minyak naik kerajaan', false),
      (3, '10:02:00', 'minyk harag kerjaan', true)`)
    await isolated.query(`INSERT INTO api_speech (index, timestamp, speech)
      SELECT n, '10:00:00', 'harga minyak naik kerajaan' FROM generate_series(4, 203) n`)
    await isolated.query(`INSERT INTO api_speech (index, timestamp, speech)
      VALUES (204, '10:00:00', 'minyk harag kerjaan minyakkah')`)
    await isolated.query(`INSERT INTO api_speech (index, timestamp, speech)
      VALUES (205, '10:00:00', 'akta kanak-kanak kenapa tahun ini'), (206, '10:00:00', 'knk')`)
    await up({ context: isolated.getQueryInterface() })
    app.setValidatorCompiler(validatorCompiler)
    app.setSerializerCompiler(serializerCompiler)
    app.decorate('sequelize', isolated)
    await app.register(registerSearchRoutes, { prefix: '/api' })
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
    await isolated.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`)
    await isolated.close()
  })

  test.each([
    ['harga minyk naik', 'harga minyak naik'],
    ['harga minyaakk naik', 'harga minyak naik'],
    ['harag minyak', 'harga minyak'],
    ['kerjaan', 'kerajaan'],
    ['aktag kanak knk', 'akta kanak-kanak'],
    ['aktag knk knk', 'akta kanak-kanak'],
    ['knp harga minyak naik thn ini', 'kenapa harga minyak naik tahun ini'],
    ['knk', 'kanak'],
    ['yg blm sblm', 'yang belum sebelum'],
    ['govt dept', 'government department'],
    ['PLS msg ASAP!', 'please message as soon as possible!'],
    ['krjn mlysia dgn rkyt', 'kerajaan malaysia dengan rakyat'],
    ['jbtn pnddkn utk knkknk', 'jabatan pendidikan untuk kanak-kanak'],
    ['nk tlng sblm tghari', 'hendak tolong sebelum tengah hari'],
    ['fyi intl mgmt mtg', 'for your information international management meeting'],
    ['rcvd addl appts', 'received additional appointments'],
  ])('corrects %s', async (q, corrected) => {
    const response = await app.inject({ url: '/api/search/suggestion', query: { q } })
    expect(response.statusCode).toBe(200)
    expect(response.json()).toMatchObject({ suggestions: [corrected], did_you_mean: corrected })
  })

  test('frequent correct spellings survive the candidate limit when distances tie', async () => {
    await isolated.query(`INSERT INTO api_search_dictionary (word, frequency) VALUES
      ('krajaan', 5), ('kkrajaan', 1), ('kekrajaan', 1), ('ktrajaan', 1),
      ('kěrajaan', 21), ('karajaan', 54), ('kirajaan', 4), ('kdrajaan', 1),
      ('kgrajaan', 9), ('kcrajaan', 676), ('kerajaan', 399778),
      ('malysia', 17), ('mlaysia', 3), ('malalysia', 1), ('maaysia', 2),
      ('mulaysia', 1), ('malàysia', 1), ('maldysia', 1), ('melaysia', 18),
      ('mataysia', 131), ('ysia', 9), ('malaysia', 277458)
      ON CONFLICT (word) DO UPDATE SET frequency = excluded.frequency`)
    const response = await app.inject({ url: '/api/search/suggestion', query: { q: 'krajaan mlysia' } })
    expect(response.statusCode).toBe(200)
    expect(response.json<unknown>()).toEqual({
      query: 'krajaan mlysia',
      suggestions: ['kerajaan malaysia'],
      did_you_mean: 'kerajaan malaysia',
    })
  })

  test.each(['harga minyak naik', 'zzzzzzzzzz', 'akta kanak-kanak', 'zzzzzzz zzzzzzz'])('leaves %s unchanged', async q => {
    const response = await app.inject({ url: '/api/search/suggestion', query: { q } })
    expect(response.statusCode).toBe(200)
    expect(response.json<{ query: string; suggestions: string[]; did_you_mean: string | null }>()).toEqual({
      query: q,
      suggestions: [],
      did_you_mean: null,
    })
  })

  test('rejects a missing query', async () => {
    const response = await app.inject({ url: '/api/search/suggestion' })
    expect(response.statusCode).toBe(400)
  })

  test('every high-frequency spelling wins among more than ten equal-distance candidates', async () => {
    const words = [
      'ktrajaan',
      'karajaan',
      'kirajaan',
      'kdrajaan',
      'kgrajaan',
      'kcrajaan',
      'kerajaan',
      'kbrajaan',
      'kfrajaan',
      'kprajaan',
      'kzrajaan',
      'klrajaan',
    ]
    for (const expected of words) {
      await isolated.query(
        `INSERT INTO api_search_dictionary (word, frequency)
        SELECT word, CASE WHEN word = :expected THEN 1000000 ELSE 1 END
        FROM unnest(ARRAY[:words]::text[]) AS input(word)
        ON CONFLICT (word) DO UPDATE SET frequency = excluded.frequency`,
        { replacements: { words, expected } },
      )
      const response = await app.inject({ url: '/api/search/suggestion', query: { q: 'krajaan' } })
      expect(response.statusCode).toBe(200)
      expect(response.json().did_you_mean).toBe(expected)
    }
  })

  test('refresh spans batches and preserves the dictionary on failure', async () => {
    await isolated.query("INSERT INTO api_speech (index, timestamp, speech) VALUES (4, '10:03:00', 'zzzzzzzzzz')")
    await isolated.query(`INSERT INTO api_speech (index, timestamp, speech)
      SELECT n, '10:00:00', 'perkataan' FROM generate_series(100, 5100) n`)
    await refreshSearchDictionary(isolated)
    const [frequencies] = await isolated.query("SELECT frequency FROM api_search_dictionary WHERE word = 'perkataan'")
    expect(frequencies).toEqual([{ frequency: '5001' }])
    const response = await app.inject({ url: '/api/search/suggestion', query: { q: 'zzzzzzzzz' } })
    expect(response.json().did_you_mean).toBe('zzzzzzzzzz')
    await isolated.query(`
      CREATE FUNCTION reject_dictionary_insert() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'test refresh failure'; END $$;
      CREATE TRIGGER reject_dictionary_insert BEFORE INSERT ON api_search_dictionary
      FOR EACH ROW EXECUTE FUNCTION reject_dictionary_insert();
    `)
    await expect(refreshSearchDictionary(isolated)).rejects.toThrow('test refresh failure')
    const [afterFailure] = await isolated.query("SELECT frequency FROM api_search_dictionary WHERE word = 'perkataan'")
    expect(afterFailure).toEqual(frequencies)
    await isolated.query('DROP TRIGGER reject_dictionary_insert ON api_search_dictionary; DROP FUNCTION reject_dictionary_insert()')
  })
})
