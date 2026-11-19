import { expect, test } from 'bun:test'

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
  for (const house of [0, 1, 2, 10]) {
    expect(createCycleBodySchema.safeParse({ ...cycle, house }).success).toBe(false)
  }
})

test('MMS catalogue preserves null dates and documents directly under Penggal', () => {
  const response = {
    catalogue_list: {
      15: {
        start_date: null,
        end_date: null,
        5: {
          start_date: null,
          end_date: null,
          sitting_list: [{ sitting_id: 1, date: '2026-09-29', filename: 'mms_2026-09-29', is_final: true }],
        },
      },
    },
    total_count: 1,
  }
  expect(JSON.stringify(getCatalogueResponseSchema.parse(response))).toBe(JSON.stringify(response))
})

test('MMS upserts require cycle identifiers and reject semua writes', () => {
  const body = { house: 'majlis-mengangkat-sumpah', filename: 'mms_2026-09-29', date: '2026-09-29', speech_data: '[]' }
  expect(upsertSittingBodySchema.safeParse(body).success).toBe(false)
  expect(upsertSittingBodySchema.safeParse({ ...body, term: 15, session: 5 }).success).toBe(true)
  expect(upsertSittingBodySchema.safeParse({ ...body, house: 'semua' }).success).toBe(false)
})
