import type { FastifyReply, FastifyRequest } from 'fastify'

import type { CatalogueQuery, CatalogueResponse, SqlBindings } from '@/types'
import { type House, HOUSE_CODE, HOUSE_TO_CODE } from '@/types/enum'
import { attachSittings, buildCycleMap } from '@/utils'
import type { CycleFilter } from '@/utils/catalogue/cycle-map.util'

export async function getCatalogue(request: FastifyRequest<{ Querystring: CatalogueQuery }>, reply: FastifyReply) {
  try {
    const { ParliamentaryCycle, Sitting } = request.server.models

    const houseType = (request.query.house ?? 'dewan-rakyat') as House
    const house = HOUSE_TO_CODE[houseType] ?? HOUSE_CODE.DEWAN_RAKYAT
    const isDropdown = request.query.dropdown ?? null
    const termFilter = request.query.term ? Number(request.query.term) : 15

    const baseWhere: CycleFilter = { house }
    if (termFilter) baseWhere.term = termFilter

    const cycleMap = await buildCycleMap(request.server.models, baseWhere, Boolean(isDropdown))

    // Sittings for this house (and term if provided)
    const sittingWhere: SqlBindings = { '$cycle.house$': house }
    if (termFilter) sittingWhere['$cycle.term$'] = termFilter

    await attachSittings(cycleMap, request.server.models, sittingWhere, Boolean(isDropdown))
    const countOptions = {
      include: [{ model: ParliamentaryCycle, as: 'cycle', required: true }],
      where: sittingWhere,
    } as unknown as Parameters<typeof Sitting.count>[0]
    const total_count = await Sitting.count(countOptions)

    const data: CatalogueResponse = { catalogue_list: cycleMap as CatalogueResponse['catalogue_list'], total_count }
    return reply.send(data)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bad Request'
    return reply.code(400).send({ error: message })
  }
}
