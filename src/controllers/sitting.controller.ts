import type { FastifyReply, FastifyRequest } from 'fastify'
import { Op } from 'sequelize'

import type {
  AuthorHistory as AuthorHistoryEntity,
  GetSittingQuery,
  GetSittingResponse,
  ParliamentaryCycleRow,
  SittingWithCycleRow,
  UpsertSittingBody,
  UpsertSittingResponse,
} from '@/types'
import { type House, HOUSE_TO_CODE } from '@/types/enum'
import type { RawSpeechRow } from '@/utils'
import { buildNestedSpeeches, buildSpeechRows } from '@/utils'

function parseSpeechData(payload: string | null | undefined): RawSpeechRow[] | null {
  if (!payload) return null
  try {
    const parsed = JSON.parse(payload)
    return Array.isArray(parsed) ? (parsed as RawSpeechRow[]) : null
  } catch {
    return null
  }
}

// Using centralized inferred types

// Nested speech helpers refactored into utils (buildNestedSpeeches)

export async function getSitting(request: FastifyRequest<{ Querystring: GetSittingQuery }>, reply: FastifyReply) {
  try {
    const { Sitting, ParliamentaryCycle } = request.server.models
    const houseType = request.query.house as House | undefined
    const house = houseType != null ? HOUSE_TO_CODE[houseType] : null
    if (houseType == null || house == null) {
      return reply.code(400).type('text/plain').send('House type not valid.')
    }

    const dateStr = request.query.date
    const date = new Date(dateStr)
    if (Number.isNaN(date.getTime())) {
      return reply.code(400).type('text/plain').send('Invalid date format. Date should be in YYYY-MM-DD format.')
    }

    const sitting = (await Sitting.findOne({
      include: [{ model: ParliamentaryCycle, as: 'cycle', required: true, where: { house } }],
      where: { date: dateStr },
      raw: true,
      nest: true,
    })) as unknown as SittingWithCycleRow | null

    if (!sitting) {
      return reply.code(404).type('text/plain').send('Sitting ID does not exist.')
    }

    let speeches: unknown = []
    try {
      speeches = JSON.parse(sitting.speech_data ?? '[]')
    } catch {
      speeches = []
    }

    const data = {
      meta: {
        sitting_id: sitting.sitting_id,
        // Keep cycle_id for backward compatibility, but also include nested cycle object
        cycle: {
          cycle_id: sitting.cycle.cycle_id,
          start_date: sitting.cycle.start_date,
          end_date: sitting.cycle.end_date,
          house: sitting.cycle.house,
          term: sitting.cycle.term,
          session: sitting.cycle.session,
          meeting: sitting.cycle.meeting,
        },
        cycle_id: sitting.cycle_id,
        date: sitting.date,
        filename: sitting.filename,
        has_dataset: sitting.has_dataset,
        is_final: sitting.is_final,
      },
      speeches,
    }
    return reply.send(data as GetSittingResponse)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bad Request'
    return reply.code(400).send({ error: message })
  }
}

export async function upsertSitting(request: FastifyRequest<{ Body: UpsertSittingBody }>, reply: FastifyReply) {
  try {
    const { ParliamentaryCycle, Sitting, Speech, AuthorHistory } = request.server.models

    // Check existing by filename
    const { filename, house: houseType, date: dateStr } = request.body
    const house = HOUSE_TO_CODE[houseType]
    if (house == null) {
      return reply.code(400).send({ error: 'House type not valid.' })
    }
    const date = new Date(dateStr)
    if (Number.isNaN(date.getTime())) {
      return reply.code(400).send({ error: 'Invalid date format. Date should be in YYYY-MM-DD format.' })
    }

    const existing = await Sitting.findOne({ where: { filename } })

    // Resolve cycle_id for date range and house
    const cycle = (await ParliamentaryCycle.findOne({
      where: {
        house,
        start_date: { [Op.lte]: dateStr },
        end_date: { [Op.gte]: dateStr },
      },
      raw: true,
    })) as ParliamentaryCycleRow | null
    if (!cycle) {
      return reply.code(400).send({ error: 'Parliamentary cycle not found for date/house.' })
    }

    const speechList = parseSpeechData(request.body.speech_data) ?? []
    const hasSpeechPayload = speechList.length > 0
    const nestedSpeechJson = hasSpeechPayload ? buildNestedSpeeches(speechList) : []

    let sittingInstance = existing
    let sittingId: number
    if (sittingInstance) {
      const existingId = Number(sittingInstance.get('sitting_id'))
      sittingId = existingId
      await Speech.destroy({ where: { sitting_id: existingId } })
      await sittingInstance.update({
        date: dateStr,
        cycle_id: cycle.cycle_id,
        speech_data: JSON.stringify(nestedSpeechJson),
      })
    } else {
      sittingInstance = await Sitting.create({
        filename,
        date: dateStr,
        cycle_id: cycle.cycle_id,
        speech_data: JSON.stringify(nestedSpeechJson),
      })
      sittingId = Number(sittingInstance.get('sitting_id'))
    }

    const serializedSitting = sittingInstance?.toJSON?.() ?? sittingInstance

    if (!hasSpeechPayload) {
      return reply.code(201).send({ sitting: serializedSitting, speech_errors: 'Invalid JSON in speech_data' } as UpsertSittingResponse)
    }

    try {
      const authorIds = Array.from(
        new Set(
          speechList
            .map(row => (row.speaker != null ? Number(row.speaker) : null))
            .filter((value): value is number => value != null && Number.isFinite(value)),
        ),
      )

      const activeHistoryRecords = (await AuthorHistory.findAll({
        where: {
          author_id: { [Op.in]: authorIds },
          start_date: { [Op.lte]: dateStr },
          [Op.or]: [{ end_date: { [Op.gte]: dateStr } }, { end_date: { [Op.is]: null } }],
        },
        raw: true,
      })) as unknown as AuthorHistoryEntity[]

      const authorHistoryLookup = new Map<number, number>()
      for (const rec of activeHistoryRecords.filter(record => record.end_date != null)) {
        authorHistoryLookup.set(rec.author_id, rec.record_id)
      }
      for (const rec of activeHistoryRecords.filter(record => record.end_date == null)) {
        if (!authorHistoryLookup.has(rec.author_id)) {
          authorHistoryLookup.set(rec.author_id, rec.record_id)
        }
      }

      const speechRows = buildSpeechRows(speechList, sittingId, authorHistoryLookup)

      const created = await Speech.bulkCreate(speechRows as unknown as Parameters<typeof Speech.bulkCreate>[0], {
        returning: true,
        validate: true,
      })
      if (created.length !== speechRows.length) {
        return reply.code(201).send({
          sitting: serializedSitting,
          warning: `Data integrity issue: ${created.length} speeches created but ${speechRows.length} expected`,
        })
      }
      return reply.code(201).send(serializedSitting as UpsertSittingResponse)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e)
      return reply.code(201).send({ sitting: serializedSitting, speech_errors: message } as UpsertSittingResponse)
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bad Request'
    return reply.code(400).send({ error: message })
  }
}
