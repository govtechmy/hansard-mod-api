import type { FastifyReply, FastifyRequest } from 'fastify'
import { QueryTypes } from 'sequelize'

import type { AttendanceQuery, AttendanceResponse } from '@/types'
import { type House, HOUSE_TO_CODE } from '@/types/enum'
import { ageToGroup, aggregateAverage, aggregatePartyStats, computeTieAwareRanks } from '@/utils'

const ageGroups: Record<number, string> = {
  30: '18-29',
  40: '30-39',
  50: '40-49',
  60: '50-59',
  70: '60-69',
  999: '70+',
}

// Local constants kept temporarily for backward compatibility; will be replaced by AGE_GROUPS from utils if needed.

export async function getAttendance(request: FastifyRequest<{ Querystring: AttendanceQuery }>, reply: FastifyReply) {
  try {
    const { sequelize } = request.server as any
    const house = HOUSE_TO_CODE[(request.query.house ?? 'dewan-rakyat') as House]
    if (house == null) return reply.code(400).type('text/plain').send('House type not valid.')

    const term = request.query.term ? Number(request.query.term) : undefined
    const session = request.query.session ? Number(request.query.session) : undefined
    const meeting = request.query.meeting ? Number(request.query.meeting) : undefined

    const whereParts: string[] = ['pc.house = :house']
    const repl: Record<string, any> = { house }
    if (term != null) {
      whereParts.push('pc.term = :term')
      repl.term = term
    }
    if (session != null) {
      whereParts.push('pc.session = :session')
      repl.session = session
    } else if (term === 14) {
      // Special handling: only include session >= 4 for 14th parliament
      whereParts.push('pc.session >= 4')
    }
    if (meeting != null) {
      whereParts.push('pc.meeting = :meeting')
      repl.meeting = meeting
    }

    const baseJoin = `
      FROM api_author_history ah
      JOIN api_attendance att ON att.author_id = ah.record_id
      JOIN api_sitting si ON si.sitting_id = att.sitting_id
      JOIN api_parliamentary_cycle pc ON pc.cycle_id = si.cycle_id
      JOIN api_author a ON a.new_author_id = ah.author_id
      LEFT JOIN api_area ar ON ar.id = ah.area_id
    `
    const whereSql = `WHERE ${whereParts.join(' AND ')}`

    const totalSql = `SELECT count(*)::int as total FROM api_sitting si JOIN api_parliamentary_cycle pc ON pc.cycle_id = si.cycle_id ${whereSql}`
    const [{ total }] = await sequelize.query(totalSql, { replacements: repl, type: QueryTypes.SELECT })
    const total_sittings = Number(total ?? 0)

    const mainSql = `
      SELECT
        a.name as name,
        a.ethnicity as ethnicity,
        a.sex as sex,
        (extract(year from now())::int - a.birth_year) as age,
        ah.party as party,
        ar.name as area,
        sum(CASE WHEN att.attended THEN 1 ELSE 0 END)::int as total_attended,
        (sum(CASE WHEN att.attended THEN 1 ELSE 0 END) * 100.0 / NULLIF(:total_sittings, 0))::float as attendance_pct
      ${baseJoin}
      ${whereSql}
      GROUP BY a.name, a.ethnicity, a.sex, a.birth_year, ah.party, ar.name
      ORDER BY attendance_pct DESC
    `
    const rows: any[] = await sequelize.query(mainSql, {
      replacements: { ...repl, total_sittings },
      type: QueryTypes.SELECT,
    })

    if (!rows.length || total_sittings === 0) {
      return reply.code(404).type('text/plain').send('No attendance data found with the given query.')
    }

    const enriched = rows.map(r => ({
      name: r.name,
      ethnicity: r.ethnicity,
      sex: r.sex,
      age: r.age != null ? Number(r.age) : null,
      party: r.party,
      area: r.area ?? null,
      total_attended: Number(r.total_attended),
      attendance_pct: Number(r.attendance_pct),
      total: total_sittings,
      rank: 0,
      age_group: '',
    }))

    // Compute tie-aware ranks and age groups via utils
    enriched.sort((a, b) => b.attendance_pct - a.attendance_pct)
    const rankMap = computeTieAwareRanks(enriched.map(r => r.attendance_pct))
    enriched.forEach(r => {
      r.rank = rankMap.get(r.attendance_pct) ?? 0
      r.age_group = ageToGroup(r.age)
    })

    // Party aggregates
    const tab_party = aggregatePartyStats(
      enriched.map(r => ({ party: r.party, attendance_pct: r.attendance_pct, total_attended: r.total_attended, total: r.total })),
    )

    // Charts
    const chart_sex = aggregateAverage(enriched.map(r => ({ key: r.sex, value: r.attendance_pct })))
    const chart_age = aggregateAverage(enriched.map(r => ({ key: r.age_group, value: r.attendance_pct })))
    const chart_ethnicity = aggregateAverage(enriched.map(r => ({ key: r.ethnicity, value: r.attendance_pct })))

    const payload: AttendanceResponse = {
      charts: { sex: chart_sex, age: chart_age, ethnicity: chart_ethnicity },
      tab_individual: enriched,
      tab_party,
    }
    return reply.send(payload)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bad Request'
    return reply.code(400).send({ error: message })
  }
}
