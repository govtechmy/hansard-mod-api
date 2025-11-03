import type { FastifyReply, FastifyRequest } from 'fastify'
import { QueryTypes } from 'sequelize'

import type { SearchPlotResponse, SearchQuery, SearchResultsResponse } from '@/types'
import { type House, HOUSE_TO_CODE } from '@/types/enum'
import { buildHeadlineFragment, deriveDefaultStartDateDR, paginate, resampleSeries, translateAgeGroupToBirthYearBounds } from '@/utils'

// Using centralized inferred SearchQuery type

const DEFAULT_PAGE_SIZE = 9

function buildFilterClauses(server: any, query: SearchQuery) {
  const house = HOUSE_TO_CODE[(query.house ?? 'dewan-rakyat') as House] ?? 0
  const startDatePromise = query.start_date ? Promise.resolve(query.start_date) : deriveDefaultStartDateDR(server.models)
  return { house, startDatePromise }
}

export async function getSearchResults(request: FastifyRequest<{ Querystring: SearchQuery }>, reply: FastifyReply) {
  try {
    const { sequelize } = request.server as any
    const { house, startDatePromise } = buildFilterClauses(request.server, request.query)
    const startDate = await startDatePromise
    const endDate = request.query.end_date ?? new Date().toISOString().slice(0, 10)
    const windowSize = Number(request.query.window_size ?? 120)
    const q = (request.query.q ?? '').toString().trim().toLowerCase()
    const uid = request.query.uid ? Number(request.query.uid) : undefined
    const pageSize = Number(request.query.page_size ?? DEFAULT_PAGE_SIZE)
    const pageInput = Math.max(1, Number(request.query.page ?? 1))

    const whereParts: string[] = ['pc.house = :house', 'si.date >= :startDate', 'si.date <= :endDate']
    const repl: Record<string, any> = { house, startDate, endDate }

    if (request.query.party) {
      whereParts.push('ah.party = :party')
      repl.party = request.query.party
    }
    if (request.query.sex) {
      whereParts.push('a.sex = :sex')
      repl.sex = request.query.sex
    }
    if (request.query.ethnicity) {
      whereParts.push('a.ethnicity = :ethnicity')
      repl.ethnicity = request.query.ethnicity
    }
    if (request.query.age_group) {
      const grp = request.query.age_group
      const currentYear = new Date().getFullYear()
      const trans = translateAgeGroupToBirthYearBounds(grp, currentYear)
      if (trans) {
        whereParts.push(trans.clause)
        Object.assign(repl, trans.params)
      }
    }
    if (uid) {
      whereParts.push('a.new_author_id = :uid')
      repl.uid = uid
    }

    let selectHeadline = ''
    let selectRank = '0 as rank'
    let orderBy = 'si.date DESC'
    const headlineFragment = q ? buildHeadlineFragment(q, windowSize) : null
    if (headlineFragment) {
      selectHeadline = headlineFragment.select
      selectRank = headlineFragment.rankSelect
      orderBy = headlineFragment.order
      repl.q = q
      whereParts.push(headlineFragment.condition)
    }

    const baseFrom = `
      FROM api_speech s
      JOIN api_sitting si ON s.sitting_id = si.sitting_id
      JOIN api_parliamentary_cycle pc ON si.cycle_id = pc.cycle_id
      LEFT JOIN api_author_history ah ON s.speaker_id = ah.record_id
      LEFT JOIN api_author a ON ah.author_id = a.new_author_id
    `

    const whereSql = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : ''

    const countSql = `SELECT count(*) as count ${baseFrom} ${whereSql}`
    const [{ count }] = await sequelize.query(countSql, { replacements: repl, type: QueryTypes.SELECT })

    const total = Number(count ?? 0)
    if (total === 0) {
      return reply.code(404).type('text/plain').send('No speeches found with the given query.')
    }
    const { page, totalPages, offset, next, previous } = paginate(total, pageInput, pageSize)

    const selectSql = `
      SELECT s.index, a.name as speaker_name, a.new_author_id as author_id, s.speech, s.timestamp,
             si.date as sitting_date, pc.term, pc.session, pc.meeting
             ${selectHeadline} ${selectRank}
      ${baseFrom}
      ${whereSql}
      ORDER BY ${orderBy}
      LIMIT :limit OFFSET :offset
    `
    const rows: any[] = await sequelize.query(selectSql, {
      replacements: { ...repl, limit: pageSize, offset },
      type: QueryTypes.SELECT,
    })

    const results = rows
      .filter(r => r.speech != null)
      .map(r => ({
        index: Number(r.index),
        speaker: r.speaker_name,
        author_id: r.author_id,
        trimmed_speech: q ? r.headline : `${r.speech?.slice(0, windowSize) ?? ''}...`,
        relevance_score: q ? r.rank : null,
        sitting: { date: r.sitting_date, term: r.term, session: r.session, meeting: r.meeting },
      }))

    const response: SearchResultsResponse = { results, count: total, next, previous }
    return reply.send(response)
  } catch (err: any) {
    return reply.code(400).send({ error: err?.message ?? 'Bad Request' })
  }
}

export async function getSearchPlot(request: FastifyRequest<{ Querystring: SearchQuery }>, reply: FastifyReply) {
  try {
    const { sequelize } = request.server as any
    const { house, startDatePromise } = buildFilterClauses(request.server, request.query)
    const startDate = await startDatePromise
    const endDate = request.query.end_date ?? new Date().toISOString().slice(0, 10)
    const q = (request.query.q ?? '').toString().trim().toLowerCase()

    const whereParts: string[] = ['pc.house = :house', 'si.date >= :startDate', 'si.date <= :endDate']
    const repl: Record<string, any> = { house, startDate, endDate }

    if (request.query.party) {
      whereParts.push('ah.party = :party')
      repl.party = request.query.party
    }
    if (request.query.sex) {
      whereParts.push('a.sex = :sex')
      repl.sex = request.query.sex
    }
    if (request.query.ethnicity) {
      whereParts.push('a.ethnicity = :ethnicity')
      repl.ethnicity = request.query.ethnicity
    }
    if (request.query.age_group) {
      const grp = request.query.age_group
      const currentYear = new Date().getFullYear()
      const trans = translateAgeGroupToBirthYearBounds(grp, currentYear)
      if (trans) {
        whereParts.push(trans.clause)
        Object.assign(repl, trans.params)
      }
    }
    if (request.query.uid) {
      whereParts.push('a.new_author_id = :uid')
      repl.uid = Number(request.query.uid)
    }

    if (q) {
      whereParts.push("s.speech_vector @@ plainto_tsquery('english', :q)")
      repl.q = q
    }

    const baseFrom = `
      FROM api_speech s
      JOIN api_sitting si ON s.sitting_id = si.sitting_id
      JOIN api_parliamentary_cycle pc ON si.cycle_id = pc.cycle_id
      LEFT JOIN api_author_history ah ON s.speaker_id = ah.record_id
      LEFT JOIN api_author a ON ah.author_id = a.new_author_id
    `
    const whereSql = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : ''

    const seriesSql = q
      ? `SELECT si.date::date as date, count(s.speech_id) as count ${baseFrom} ${whereSql} GROUP BY si.date ORDER BY si.date`
      : `SELECT si.date::date as date, sum(s.length) as count ${baseFrom} ${whereSql} GROUP BY si.date ORDER BY si.date`
    const series: any[] = await sequelize.query(seriesSql, { replacements: repl, type: QueryTypes.SELECT })

    // Top N speakers
    const topSql = `
      SELECT a.new_author_id as author_id, count(*) as count
      ${baseFrom}
      ${whereSql}
      GROUP BY a.new_author_id
      ORDER BY count DESC
      LIMIT 5
    `
    const topRows: any[] = await sequelize.query(topSql, { replacements: repl, type: QueryTypes.SELECT })
    const top_speakers = topRows.map(r => ({ [r.author_id]: Number(r.count) }))

    // Word frequency
    const freqSql = `
      SELECT t.word, count(*) as c
      FROM (
        SELECT unnest(s.speech_tokens) as word
        ${baseFrom}
        ${whereSql}
      ) as t
      GROUP BY t.word
      ORDER BY c DESC
      LIMIT 20
    `
    const freqRows: any[] = await sequelize.query(freqSql, { replacements: repl, type: QueryTypes.SELECT })
    const top_word_freq: Record<string, number> = {}
    for (const r of freqRows) top_word_freq[r.word] = Number(r.c)

    if (!series.length) {
      return reply.code(404).type('text/plain').send('No speeches found with the given filters.')
    }

    const chart_data = resampleSeries(
      series.map(r => ({ date: r.date, count: Number(r.count) })),
      startDate,
      endDate,
    )

    const total_results = chart_data.freq.reduce((a, b) => a + b, 0)
    const plotResponse: SearchPlotResponse = { chart_data, total_results, top_word_freq, top_speakers }
    return reply.send(plotResponse)
  } catch (err: any) {
    return reply.code(400).send({ error: err?.message ?? 'Bad Request' })
  }
}
