import { expect, mock, test } from 'bun:test'

import { getCatalogue } from '@/controllers/catalogue.controller'
import { upsertSitting } from '@/controllers/sitting.controller'
import { getCatalogueResponseSchema } from '@/schema/catalogue/response.schema'
import { createCycleBodySchema } from '@/schema/parliamentary/request.schema'
import { upsertSittingBodySchema } from '@/schema/sitting/request.schema'
import { HOUSE_TO_CODE } from '@/types/enum'
import { resolveHouses } from '@/utils/request/parse.util'

test('MMS and scalar/array semua resolve to database house codes', () => {
  expect(HOUSE_TO_CODE['majlis-mengangkat-sumpah']).toBe(3)
  expect(HOUSE_TO_CODE.semua).toBe(10)
  expect(resolveHouses('majlis-mengangkat-sumpah')).toEqual([3])
  expect(resolveHouses('semua')).toEqual([0, 1, 2, 3])
  expect(resolveHouses(['dewan-negara', 'semua'])).toEqual([0, 1, 2, 3])
})

test('only MMS cycle creation accepts null meeting and dates', () => {
  const cycle = { house: 3, term: 15, session: 5, meeting: null, start_date: null, end_date: null }
  expect(createCycleBodySchema.safeParse(cycle).success).toBe(true)
  for (const fields of [{ meeting: 1 }, { start_date: '2026-09-01' }, { end_date: '2026-09-30' }]) {
    expect(createCycleBodySchema.safeParse({ ...cycle, ...fields }).success).toBe(false)
  }
  for (const house of [0, 1, 2]) {
    expect(createCycleBodySchema.safeParse({ ...cycle, house, meeting: 1, start_date: '2026-09-01', end_date: '2026-09-30' }).success).toBe(
      true,
    )
  }
  for (const house of [0, 1, 2, 10]) {
    expect(createCycleBodySchema.safeParse({ ...cycle, house }).success).toBe(false)
  }
})

test('MMS upserts require cycle identifiers and reject semua writes', () => {
  const body = { house: 'majlis-mengangkat-sumpah', filename: 'mms_2026-09-29', date: '2026-09-29', speech_data: '[]' }
  expect(upsertSittingBodySchema.safeParse(body).success).toBe(false)
  expect(upsertSittingBodySchema.safeParse({ ...body, term: 15, session: 5 }).success).toBe(true)
  expect(upsertSittingBodySchema.safeParse({ ...body, house: 'semua' }).success).toBe(false)
})

for (const house of ['majlis-mengangkat-sumpah', 'dewan-rakyat'] as const) {
  for (const dropdown of [false, true]) {
    test(`${house} catalogue builds and attaches documents (dropdown=${dropdown})`, async () => {
      const mms = house === 'majlis-mengangkat-sumpah'
      const range = { start_date: mms ? null : '2026-09-01', end_date: mms ? null : '2026-09-30' }
      const sitting = { sitting_id: 1, date: '2026-09-29', filename: 'document', is_final: true }
      const findAll = mock(async (options: { group: string[] }) => {
        switch (options.group[0]) {
          case 'term':
            return [{ term: 15, ...range }]
          case 'session':
            return [{ session: 5, ...range }]
          default:
            return [{ meeting: 1, ...range }]
        }
      })
      const sittingFindAll = mock(async () => [{ ...sitting, cycle: { term: 15, session: 5, meeting: mms ? null : 1 } }])
      const request = {
        query: { house, term: 15, ...(dropdown ? { dropdown: 'true' } : {}) },
        server: { models: { ParliamentaryCycle: { findAll }, Sitting: { findAll: sittingFindAll, count: async () => 1 } } },
      }
      const reply = { send: mock(), code: mock() }
      await getCatalogue(request as unknown as Parameters<typeof getCatalogue>[0], reply as unknown as Parameters<typeof getCatalogue>[1])
      const documents = dropdown ? {} : { sitting_list: [sitting] }
      const session = mms ? { ...range, ...documents } : { ...range, 1: { ...range, ...documents } }
      const expected = { catalogue_list: { 15: { ...range, 5: session } }, total_count: 1 }
      expect(findAll).toHaveBeenCalledWith(expect.objectContaining({ where: { house: mms ? 3 : 0, term: 15 }, group: ['term'] }))
      expect(reply.send).toHaveBeenCalledWith(expected)
      expect(getCatalogueResponseSchema.safeParse(reply.send.mock.calls[0]?.[0]).success).toBe(true)
      expect(findAll).toHaveBeenCalledTimes(mms ? 2 : 3)
      expect(sittingFindAll).toHaveBeenCalledTimes(dropdown ? 0 : 1)
    })
  }
}

test('MMS upsert selects its term/session cycle and saves that cycle id', async () => {
  const findOne = mock(async () => ({ cycle_id: 42 }))
  const create = mock(async () => ({ get: () => 7, toJSON: () => ({ sitting_id: 7 }) }))
  const request = {
    body: { house: 'majlis-mengangkat-sumpah', term: 15, session: 5, date: '2026-09-29', filename: 'mms_2026-09-29', speech_data: '[]' },
    server: { models: { ParliamentaryCycle: { findOne }, Sitting: { findOne: async () => null, create } } },
  }
  const reply = { code: mock(), send: mock() }
  reply.code.mockReturnValue(reply)
  await upsertSitting(request as unknown as Parameters<typeof upsertSitting>[0], reply as unknown as Parameters<typeof upsertSitting>[1])
  expect(findOne).toHaveBeenCalledWith({ where: { house: 3, term: 15, session: 5 }, raw: true })
  expect(create).toHaveBeenCalledWith({ filename: 'mms_2026-09-29', date: '2026-09-29', cycle_id: 42, speech_data: '[]' })
  expect(reply.code).toHaveBeenCalledWith(201)
})
