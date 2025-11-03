import type { FastifyReply, FastifyRequest } from 'fastify'
import { Op } from 'sequelize'

import { type House, HOUSE_TO_CODE } from '@/types/enum'
import { buildNestedSpeeches, buildSpeechRows } from '@/utils'
import type { GetSittingQuery, GetSittingResponse, UpsertSittingBody, UpsertSittingResponse } from '@/types'

// Using centralized inferred types

// Nested speech helpers refactored into utils (buildNestedSpeeches)

export async function getSitting(request: FastifyRequest<{ Querystring: GetSittingQuery }>, reply: FastifyReply) {
  try {
    const { Sitting, ParliamentaryCycle } = request.server.models as any
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

    const sitting = await Sitting.findOne({
      include: [{ model: ParliamentaryCycle, as: 'cycle', required: true, where: { house } }],
      where: { date: dateStr },
      raw: true,
      nest: true,
    })

    if (!sitting) {
      return reply.code(404).type('text/plain').send('Sitting ID does not exist.')
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
      speeches: JSON.parse(sitting.speech_data ?? '[]'),
    }
  return reply.send(data as GetSittingResponse)
  } catch (err: any) {
    return reply.code(400).send({ error: err?.message ?? 'Bad Request' })
  }
}

export async function upsertSitting(request: FastifyRequest<{ Body: UpsertSittingBody }>, reply: FastifyReply) {
  try {
    const { ParliamentaryCycle, Sitting, Speech, AuthorHistory } = request.server.models as any

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
    const cycle = await ParliamentaryCycle.findOne({
      where: {
        house,
        start_date: { [Op.lte]: dateStr },
        end_date: { [Op.gte]: dateStr },
      },
      raw: true,
    })
    if (!cycle) {
      return reply.code(400).send({ error: 'Parliamentary cycle not found for date/house.' })
    }

    // Prepare speech_data JSON for catalogue (nested levels)
    let rawSpeechList: any[] = []
    try {
      rawSpeechList = JSON.parse(request.body.speech_data ?? '[]')
    } catch {
      // If invalid JSON, still follow Django behavior: create/update sitting and return 201 with error
    }
    let nestedSpeechJson: any[] = []
    if (Array.isArray(rawSpeechList) && rawSpeechList.length) {
      nestedSpeechJson = buildNestedSpeeches(rawSpeechList)
    }

    let sitting: any
    if (existing) {
      await Speech.destroy({ where: { sitting_id: existing.sitting_id } })
      await existing.update({
        date: dateStr,
        cycle_id: cycle.cycle_id,
        speech_data: JSON.stringify(nestedSpeechJson),
      })
      sitting = existing
    } else {
      sitting = await Sitting.create({
        filename,
        date: dateStr,
        cycle_id: cycle.cycle_id,
        speech_data: JSON.stringify(nestedSpeechJson),
      })
    }

    // Try to bulk create Speech rows if we have valid raw speech list
    try {
      if (Array.isArray(rawSpeechList) && rawSpeechList.length) {
        // Identify active AuthorHistory records for the sitting date
        const authorIds = Array.from(
          new Set(
            rawSpeechList
              .map((r: any) => r?.speaker)
              .filter((v: any) => v !== null && v !== undefined)
              .map((v: any) => Number(v)),
          ),
        )

        const activeHistoryRecords = await AuthorHistory.findAll({
          where: {
            author_id: { [Op.in]: authorIds },
            start_date: { [Op.lte]: dateStr },
            [Op.or]: [{ end_date: { [Op.gte]: dateStr } }, { end_date: { [Op.is]: null } }],
          },
          raw: true,
        })

        const authorHistoryLookup = new Map<number, number>()
        // Prefer records with end_date (more specific) first
        for (const rec of activeHistoryRecords.filter((r: any) => r.end_date != null)) {
          authorHistoryLookup.set(rec.author_id, rec.record_id)
        }
        for (const rec of activeHistoryRecords.filter((r: any) => r.end_date == null)) {
          if (!authorHistoryLookup.has(rec.author_id)) authorHistoryLookup.set(rec.author_id, rec.record_id)
        }

        const speechRows = buildSpeechRows(rawSpeechList, sitting.sitting_id, authorHistoryLookup)

        const created = await Speech.bulkCreate(speechRows, { returning: true, validate: true })
        if (created.length !== speechRows.length) {
          return reply.code(201).send({
            sitting: sitting?.toJSON?.() ?? sitting,
            warning: `Data integrity issue: ${created.length} speeches created but ${speechRows.length} expected`,
          })
        }
  return reply.code(201).send((sitting?.toJSON?.() ?? sitting) as UpsertSittingResponse)
      }
      // No raw speech list (invalid JSON or empty)
  return reply.code(201).send({ sitting: sitting?.toJSON?.() ?? sitting, speech_errors: 'Invalid JSON in speech_data' } as UpsertSittingResponse)
    } catch (e: any) {
      // Speech creation failed; still return 201 with error details
  return reply.code(201).send({ sitting: sitting?.toJSON?.() ?? sitting, speech_errors: e?.message ?? String(e) } as UpsertSittingResponse)
    }
  } catch (err: any) {
    return reply.code(400).send({ error: err?.message ?? 'Bad Request' })
  }
}
