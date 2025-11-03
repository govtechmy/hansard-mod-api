import { col, fn } from 'sequelize'

export interface SittingSummary {
  sitting_id: number
  date: string
  filename: string
  is_final: boolean
}

export type CycleMap = Record<number, any>

export async function buildCycleMap(models: any, baseWhere: any, includeDropdown: boolean): Promise<CycleMap> {
  const { ParliamentaryCycle, Sitting } = models as any
  const termRows = await ParliamentaryCycle.findAll({
    where: baseWhere,
    attributes: ['term', [fn('min', col('start_date')), 'start_date'], [fn('max', col('end_date')), 'end_date']],
    group: ['term'],
    raw: true,
  })

  const cycleMap: Record<string, any> = {}
  for (const term of termRows) {
    const termId = term.term
    cycleMap[termId] = { start_date: term.start_date, end_date: term.end_date } as any
    const sessionRows = await ParliamentaryCycle.findAll({
      where: { ...baseWhere, term: termId },
      attributes: ['session', [fn('min', col('start_date')), 'start_date'], [fn('max', col('end_date')), 'end_date']],
      group: ['session'],
      raw: true,
    })
    for (const session of sessionRows) {
      const sessionId = session.session
      cycleMap[termId][sessionId] = { start_date: session.start_date, end_date: session.end_date } as any
      const meetingRows = await ParliamentaryCycle.findAll({
        where: { ...baseWhere, term: termId, session: sessionId },
        attributes: ['meeting', [fn('min', col('start_date')), 'start_date'], [fn('max', col('end_date')), 'end_date']],
        group: ['meeting'],
        raw: true,
      })
      for (const meeting of meetingRows) {
        const meetingId = meeting.meeting
        cycleMap[termId][sessionId][meetingId] = {
          start_date: meeting.start_date,
          end_date: meeting.end_date,
        } as any
        if (!includeDropdown) cycleMap[termId][sessionId][meetingId]['sitting_list'] = []
      }
    }
  }
  return cycleMap
}

export async function attachSittings(cycleMap: CycleMap, models: any, sittingWhere: any, includeDropdown: boolean) {
  if (includeDropdown) return
  const { ParliamentaryCycle, Sitting } = models as any
  const sittings = await Sitting.findAll({
    include: [{ model: ParliamentaryCycle, as: 'cycle', attributes: ['term', 'session', 'meeting'], required: true }],
    where: sittingWhere,
    order: [['date', 'ASC']],
    raw: true,
    nest: true,
  })
  for (const s of sittings) {
    const term = s.cycle.term
    const session = s.cycle.session
    const meeting = s.cycle.meeting
    const sittingData: SittingSummary = {
      sitting_id: s.sitting_id,
      date: s.date,
      filename: s.filename,
      is_final: s.is_final,
    }
    cycleMap[term][session][meeting]['sitting_list'].push(sittingData)
  }
}
