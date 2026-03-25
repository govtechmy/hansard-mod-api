import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'

import { SearchService } from '@/services/search.svc'
import type { SearchMPDocResultsResponse, SearchQuery, SearchResultsResponse } from '@/types'
import { type House, HOUSE_CODE, HOUSE_TO_CODE } from '@/types/enum'
import { deriveDefaultStartDateDR } from '@/utils'

const DEFAULT_PAGE_SIZE = 9

function buildFilterClauses(server: Pick<FastifyInstance, 'models'>, query: SearchQuery) {
  let houses = [] as number[]
  if (query.house) {
    if (Array.isArray(query.house)) {
      houses = query.house.map(h => HOUSE_TO_CODE[`${h}` as House]).filter((code): code is number => code != null)
    } else {
      const houseCode = HOUSE_TO_CODE[`${query.house}` as House]
      if (houseCode == null) {
        houses = [HOUSE_CODE.DEWAN_NEGARA, HOUSE_CODE.DEWAN_RAKYAT, HOUSE_CODE.KAMAR_KHAS] // default to all houses if invalid
      } else if (houseCode === HOUSE_CODE.SEMUA) {
        houses = [HOUSE_CODE.DEWAN_NEGARA, HOUSE_CODE.DEWAN_RAKYAT, HOUSE_CODE.KAMAR_KHAS]
      } else {
        houses = [houseCode]
      }
    }
  }

  const startDatePromise = query.start_date ? Promise.resolve(query.start_date) : deriveDefaultStartDateDR(server.models)
  return { houses, startDatePromise }
}

export async function getSearchResults(request: FastifyRequest<{ Querystring: SearchQuery }>, reply: FastifyReply) {
  try {
    const { sequelize } = request.server

    const { houses, startDatePromise } = buildFilterClauses(request.server, request.query)
    const startDate = await startDatePromise
    const endDate = request.query.end_date ?? new Date().toISOString().slice(0, 10)
    const windowSize = Number(request.query.window_size ?? 120)
    const q = (request.query.q ?? '').toString().trim()
    const uid = request.query.uid ? Number(request.query.uid) : undefined
    const pageSize = Number(request.query.page_size ?? DEFAULT_PAGE_SIZE)
    const pageInput = Math.max(1, Number(request.query.page ?? 1))
    const searchSvc = new SearchService()
    const serviceResponse = await searchSvc.search(sequelize, request.query, {
      startDate,
      endDate,
      houses,
      windowSize,
      q,
      uid,
      pageSize,
      pageInput,
    })

    if (serviceResponse.error || !serviceResponse.success) {
      const { code, type, message } = serviceResponse.error ?? {
        code: 500,
        type: 'text/plain',
        message: 'Internal Server Error',
      }
      return reply.code(code).type(type).send(message)
    }

    const results = serviceResponse.success.results
    const total = serviceResponse.success.count
    const next = serviceResponse.success.next
    const previous = serviceResponse.success.previous
    const response: SearchResultsResponse = { results, count: total, next, previous }
    return reply.send(response)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bad Request'
    return reply.code(400).send({ error: message })
  }
}

export async function getSearchMPDocResults(request: FastifyRequest<{ Querystring: SearchQuery }>, reply: FastifyReply) {
  try {
    const { sequelize } = request.server

    const { houses, startDatePromise } = buildFilterClauses(request.server, request.query)
    const startDate = await startDatePromise
    const endDate = request.query.end_date ?? new Date().toISOString().slice(0, 10)
    const q = (request.query.q ?? '').toString().trim().toLowerCase()
    const uid = request.query.uid ? Number(request.query.uid) : undefined
    const pageSize = Number(request.query.page_size ?? DEFAULT_PAGE_SIZE)
    const pageInput = Math.max(1, Number(request.query.page ?? 1))

    const searchSvc = new SearchService()
    const serviceResponse = await searchSvc.searchMPDoc(sequelize, request.query, {
      startDate,
      endDate,
      houses,
      q,
      uid,
      pageSize,
      pageInput,
    })

    if (serviceResponse.error || !serviceResponse.success) {
      const { code, type, message } = serviceResponse.error ?? {
        code: 500,
        type: 'text/plain',
        message: 'Internal Server Error',
      }
      return reply.code(code).type(type).send(message)
    }

    const results = serviceResponse.success.results
    const total = serviceResponse.success.count
    const next = serviceResponse.success.next
    const previous = serviceResponse.success.previous
    const response: SearchMPDocResultsResponse = { results, count: total, next, previous }
    return reply.send(response)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bad Request'
    return reply.code(400).send({ error: message })
  }
}

export async function getSearchPlot(request: FastifyRequest<{ Querystring: SearchQuery }>, reply: FastifyReply) {
  try {
    const { sequelize } = request.server
    const { houses, startDatePromise } = buildFilterClauses(request.server, request.query)
    const startDate = await startDatePromise
    const endDate = request.query.end_date ?? new Date().toISOString().slice(0, 10)
    const q = (request.query.q ?? '').toString().trim().toLowerCase()
    const uid = request.query.uid ? Number(request.query.uid) : undefined

    const searchSvc = new SearchService()
    const serviceResponse = await searchSvc.searchPlot(sequelize, request.query, {
      startDate,
      endDate,
      houses,
      q,
      uid,
    })

    if (serviceResponse.error) {
      const { code, type, message } = serviceResponse.error
      return reply.code(code).type(type).send(message)
    }

    const plotResponse = serviceResponse.success
    return reply.send(plotResponse)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bad Request'
    return reply.code(400).send({ error: message })
  }
}
