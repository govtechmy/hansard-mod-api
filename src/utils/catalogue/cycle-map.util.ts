import { col, fn } from 'sequelize'

import type { AppModels } from '@/types/fastify-sequelize'
import type { SqlBindings } from '@/types/sql'

export interface SittingSummary {
  sitting_id: number
  date: string
  filename: string
  is_final: boolean
}

export interface MeetingNode {
  start_date: string | null
  end_date: string | null
  sitting_list?: SittingSummary[]
}

export interface SessionNode extends Record<number, MeetingNode> {
  start_date: string | null
  end_date: string | null
}

export interface TermNode extends Record<number, SessionNode> {
  start_date: string | null
  end_date: string | null
}

export type CycleMap = Record<number, TermNode>

interface AggregatedRangeRow {
  term?: number | string | null
  session?: number | string | null
  meeting?: number | string | null
  start_date: string | null
  end_date: string | null
}

interface SittingWithCycle {
  sitting_id: number
  date: string
  filename: string
  is_final: boolean
  cycle: {
    term: number
    session: number
    meeting: number
  }
}

export type CycleFilter = Partial<Record<'house' | 'term' | 'session' | 'meeting', number>>

export async function buildCycleMap(models: AppModels, baseWhere: CycleFilter, includeDropdown: boolean): Promise<CycleMap> {
  const { ParliamentaryCycle } = models
  const termRows = (await ParliamentaryCycle.findAll({
    where: baseWhere,
    attributes: ['term', [fn('min', col('start_date')), 'start_date'], [fn('max', col('end_date')), 'end_date']],
    group: ['term'],
    raw: true,
  })) as unknown as AggregatedRangeRow[]

  const cycleMap: CycleMap = {}
  for (const term of termRows) {
    const termId = Number(term.term) // 15
    if (Number.isNaN(termId)) continue

    const termNode = {
      start_date: term.start_date, // '2022-12-19'
      end_date: term.end_date, // '2025-08-28'
    } as TermNode

    cycleMap[`${termId}`] = termNode
    // cycleMap['15'] = {start_date: '2022-12-19', end_date: '2025-08-28'}

    // baseWhere = {house: 0}
    const sessionRows = (await ParliamentaryCycle.findAll({
      where: { ...baseWhere, term: termId },
      attributes: ['session', [fn('min', col('start_date')), 'start_date'], [fn('max', col('end_date')), 'end_date']],
      group: ['session'],
      raw: true,
    })) as unknown as AggregatedRangeRow[]

    for (const session of sessionRows) {
      const sessionId = Number(session.session)
      if (Number.isNaN(sessionId)) continue

      const sessionNode = {
        start_date: session.start_date,
        end_date: session.end_date,
      } as SessionNode
      termNode[`${sessionId}`] = sessionNode

      const meetingRows = (await ParliamentaryCycle.findAll({
        where: { ...baseWhere, term: termId, session: sessionId },
        attributes: ['meeting', [fn('min', col('start_date')), 'start_date'], [fn('max', col('end_date')), 'end_date']],
        group: ['meeting'],
        raw: true,
      })) as unknown as AggregatedRangeRow[]

      for (const meeting of meetingRows) {
        const meetingId = Number(meeting.meeting)
        if (Number.isNaN(meetingId)) continue
        const meetingNode: MeetingNode = {
          start_date: meeting.start_date,
          end_date: meeting.end_date,
        }
        if (!includeDropdown) meetingNode.sitting_list = []
        sessionNode[`${meetingId}`] = meetingNode
      }
    }
  }

  return cycleMap
}

export async function attachSittings(cycleMap: CycleMap, models: AppModels, sittingWhere: SqlBindings, includeDropdown: boolean) {
  if (includeDropdown) return

  const { ParliamentaryCycle, Sitting } = models

  // const query = Sitting.findAll({
  //   include: [{ model: ParliamentaryCycle, as: 'cycle', attributes: ['term', 'session', 'meeting'], required: true }],
  //   where: sittingWhere,
  //   order: [['date', 'ASC']],
  //   raw: true,
  //   nest: true,
  //   logging: console.log, // This will log the generated SQL query to the console
  // })

  const query = Sitting.findAll({
    attributes: ['sitting_id', 'date', 'filename', 'is_final'], // Only select needed columns
    include: [
      {
        model: ParliamentaryCycle,
        as: 'cycle',
        attributes: ['term', 'session', 'meeting'],
        required: true,
        where: sittingWhere,
      },
    ],
    where: sittingWhere, // Your existing filters
    order: [['date', 'ASC']],
    raw: true,
    nest: true,
  })

  const sittings = (await query) as unknown as SittingWithCycle[]

  for (const sitting of sittings) {
    const termId = Number(sitting.cycle.term)
    const sessionId = Number(sitting.cycle.session)
    const meetingId = Number(sitting.cycle.meeting)
    if (Number.isNaN(termId) || Number.isNaN(sessionId) || Number.isNaN(meetingId)) continue

    const termNode = cycleMap[`${termId}`]
    if (!termNode) continue
    const sessionNode = termNode[`${sessionId}`]
    if (!sessionNode) continue
    const meetingNode = sessionNode[`${meetingId}`]
    if (!meetingNode) continue

    const sittingData: SittingSummary = {
      sitting_id: sitting.sitting_id,
      date: sitting.date,
      filename: sitting.filename,
      is_final: sitting.is_final,
    }

    meetingNode.sitting_list?.push(sittingData)
  }
}
