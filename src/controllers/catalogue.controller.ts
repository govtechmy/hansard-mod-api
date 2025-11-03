import type { FastifyReply, FastifyRequest } from 'fastify'
import { col, fn } from 'sequelize'

import { type House, HOUSE_CODE, HOUSE_TO_CODE } from '@/types/enum'
import { buildCycleMap, attachSittings } from '@/utils'
import type { CatalogueQuery, CatalogueResponse } from '@/types'

export async function getCatalogue(request: FastifyRequest<{ Querystring: CatalogueQuery }>, reply: FastifyReply) {
  try {
    const { ParliamentaryCycle, Sitting } = request.server.models as any

    const houseType = (request.query.house ?? 'dewan-rakyat') as House
    const house = HOUSE_TO_CODE[houseType] ?? HOUSE_CODE.DEWAN_RAKYAT
    const isDropdown = request.query.dropdown ?? null
    const termFilter = request.query.term ? Number(request.query.term) : 15

    const baseWhere = { house } as any
    if (termFilter) baseWhere.term = termFilter

    const cycleMap = await buildCycleMap(request.server.models, baseWhere, Boolean(isDropdown))

    // Sittings for this house (and term if provided)
    const sittingWhere: any = { '$cycle.house$': house }
    if (termFilter) sittingWhere['$cycle.term$'] = termFilter

    await attachSittings(cycleMap, request.server.models, sittingWhere, Boolean(isDropdown))
    const total_count = await Sitting.count({ include: [{ model: ParliamentaryCycle, as: 'cycle', required: true }], where: sittingWhere })

  const data: CatalogueResponse = { catalogue_list: cycleMap as any, total_count }
  return reply.send(data)
  } catch (err: any) {
    return reply.code(400).send({ error: err?.message ?? 'Bad Request' })
  }
}
