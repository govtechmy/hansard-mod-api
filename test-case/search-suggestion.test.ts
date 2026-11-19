import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import Fastify from 'fastify'
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod'
import { Sequelize } from 'sequelize'

import { up } from '@/migrations/202611180001-search-dictionary'
import { initSpeechModel } from '@/models/speech.model'
import { registerSearchRoutes } from '@/routes/search.route'
import { registerSpeechRoutes } from '@/routes/speech.route'
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
    await up({ context: isolated.getQueryInterface() })
    app.setValidatorCompiler(validatorCompiler)
    app.setSerializerCompiler(serializerCompiler)
    app.decorate('sequelize', isolated)
    app.decorate('models', { Speech: speechModel } as typeof app.models)
    await app.register(registerSearchRoutes, { prefix: '/api' })
    await app.register(registerSpeechRoutes, { prefix: '/api' })
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

  test.each(['harga minyak naik', 'zzzzzzzzzz'])('leaves %s unchanged', async q => {
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

  const speech = {
    sitting_id: 1,
    index: 10,
    speaker_id: null,
    timestamp: '10:00:00',
    speech: 'Terima kasih.',
    speech_tokens: ['terima', 'kasih'],
    length: 2,
    level_1: 'UCAPAN',
    level_2: null,
    level_3: null,
    is_annotation: false,
  }

  test('speech page ranges are returned and persisted, including nulls', async () => {
    const payload = [
      { ...speech, source_page_start: 1, source_page_end: 2, pdf_page_start: 10, pdf_page_end: 11 },
      {
        ...speech,
        index: 11,
        speech: null,
        is_annotation: true,
        source_page_start: null,
        source_page_end: null,
        pdf_page_start: null,
        pdf_page_end: null,
      },
    ]
    const response = await app.inject({ method: 'POST', url: '/api/speech', payload })
    expect(response.statusCode).toBe(201)
    expect(response.json<unknown>()).toEqual(payload)
    const persisted = await speechModel.findOne({ where: { sitting_id: 1, index: 10 }, raw: true })
    expect(persisted).toMatchObject(payload[0]!)
  })

  test('existing speech clients may omit page ranges', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/speech', payload: [{ ...speech, index: 12 }] })
    expect(response.statusCode).toBe(201)
    expect(response.json()).toMatchObject([{ ...speech, index: 12, source_page_start: null, pdf_page_end: null }])
  })
})
