import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { QueryTypes } from 'sequelize'

import type {
  SearchCountRow,
  SearchFrequencyRow,
  SearchPlotResponse,
  SearchQuery,
  SearchResultsResponse,
  SearchSeriesRow,
  SearchSpeechRow,
  SearchTopSpeakerRow,
  SqlBindings,
} from '@/types'
import { type House, HOUSE_TO_CODE } from '@/types/enum'
import { buildHeadlineFragment, deriveDefaultStartDateDR, paginate, resampleSeries, translateAgeGroupToBirthYearBounds } from '@/utils'

// Using centralized inferred SearchQuery type

const DEFAULT_PAGE_SIZE = 9

function buildFilterClauses(server: Pick<FastifyInstance, 'models'>, query: SearchQuery) {
  const house = HOUSE_TO_CODE[(query.house ?? 'dewan-rakyat') as House] ?? 0
  const startDatePromise = query.start_date ? Promise.resolve(query.start_date) : deriveDefaultStartDateDR(server.models)
  return { house, startDatePromise }
}

export async function getSearchResults(request: FastifyRequest<{ Querystring: SearchQuery }>, reply: FastifyReply) {
  try {
    const { sequelize } = request.server
    const { house, startDatePromise } = buildFilterClauses(request.server, request.query)
    const startDate = await startDatePromise
    const endDate = request.query.end_date ?? new Date().toISOString().slice(0, 10)
    const windowSize = Number(request.query.window_size ?? 120)
    const q = (request.query.q ?? '').toString().trim().toLowerCase()
    const uid = request.query.uid ? Number(request.query.uid) : undefined
    const pageSize = Number(request.query.page_size ?? DEFAULT_PAGE_SIZE)
    const pageInput = Math.max(1, Number(request.query.page ?? 1))

    const whereParts: string[] = ['pc.house = :house', 'si.date >= :startDate', 'si.date <= :endDate']
    const repl: SqlBindings = { house, startDate, endDate }

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
    const countRows = await sequelize.query<SearchCountRow>(countSql, { replacements: repl, type: QueryTypes.SELECT })

    const total = Number(countRows[0]?.count ?? 0)
    if (total === 0) {
      return reply.code(404).type('text/plain').send('No speeches found with the given query.')
    }
    const {
      // page,
      // totalPages,
      offset,
      next,
      previous,
    } = paginate(total, pageInput, pageSize)

    const selectSql = `
      SELECT s.index, a.name as speaker_name, a.new_author_id as author_id, s.speech, s.timestamp,
             si.date as sitting_date, pc.term, pc.session, pc.meeting
             ${selectHeadline} ${selectRank}
      ${baseFrom}
      ${whereSql}
      ORDER BY ${orderBy}
      LIMIT :limit OFFSET :offset
    `
    const selectReplacements: SqlBindings = { ...repl, limit: pageSize, offset }
    const rows = await sequelize.query<SearchSpeechRow>(selectSql, {
      replacements: selectReplacements,
      type: QueryTypes.SELECT,
    })

    const results: SearchResultsResponse['results'] = rows
      .filter(r => r.speech != null || r.headline != null)
      .map(r => ({
        index: Number(r.index),
        speaker: r.speaker_name,
        author_id: r.author_id != null ? Number(r.author_id) : null,
        trimmed_speech: q ? (r.headline ?? '') : `${(r.speech ?? '').slice(0, windowSize)}...`,
        relevance_score: q ? (r.rank != null ? Number(r.rank) : null) : null,
        sitting: {
          date: r.sitting_date,
          term: Number(r.term ?? 0),
          session: Number(r.session ?? 0),
          meeting: Number(r.meeting ?? 0),
        },
      }))

    const response: SearchResultsResponse = { results, count: total, next, previous }
    return reply.send(response)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bad Request'
    return reply.code(400).send({ error: message })
  }
}

export async function getSearchPlot(request: FastifyRequest<{ Querystring: SearchQuery }>, reply: FastifyReply) {
  try {
    const { sequelize } = request.server
    const { house, startDatePromise } = buildFilterClauses(request.server, request.query)
    const startDate = await startDatePromise
    const endDate = request.query.end_date ?? new Date().toISOString().slice(0, 10)
    const q = (request.query.q ?? '').toString().trim().toLowerCase()

    const whereParts: string[] = ['pc.house = :house', 'si.date >= :startDate', 'si.date <= :endDate']
    const repl: SqlBindings = { house, startDate, endDate }

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
    `
    const whereSql = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : ''

    const seriesSql = q
      ? `SELECT si.date::date as date, count(s.speech_id) as count ${baseFrom} ${whereSql} GROUP BY si.date ORDER BY si.date`
      : `SELECT si.date::date as date, sum(s.length) as count ${baseFrom} ${whereSql} GROUP BY si.date ORDER BY si.date`

    // Top N speakers
    const topSql = `
      SELECT a.new_author_id as author_id, count(*) as count
      ${baseFrom}
      LEFT JOIN api_author_history ah ON s.speaker_id = ah.record_id
      LEFT JOIN api_author a ON ah.author_id = a.new_author_id
      ${whereSql}
      GROUP BY a.new_author_id
      ORDER BY count DESC
      LIMIT 5
    `

    // Word frequency
    const freqSql = `
      SELECT unnest(s.speech_tokens) as word, count(*) as c
      FROM api_speech s
      JOIN api_sitting si ON s.sitting_id = si.sitting_id
      JOIN api_parliamentary_cycle pc ON si.cycle_id = pc.cycle_id
      ${whereSql}
      GROUP BY word
      ORDER BY c DESC
      LIMIT 20
    `

    // Run queries in parallel to improve performance
    const [seriesResult, topRowsResult, freqRowsResult] = await Promise.allSettled([
      sequelize.query<SearchSeriesRow>(seriesSql, { replacements: repl, type: QueryTypes.SELECT }),
      sequelize.query<SearchTopSpeakerRow>(topSql, { replacements: repl, type: QueryTypes.SELECT }),
      sequelize.query<SearchFrequencyRow>(freqSql, { replacements: repl, type: QueryTypes.SELECT }),
    ])

    const series = seriesResult.status === 'fulfilled' ? seriesResult.value : []
    const topRows = topRowsResult.status === 'fulfilled' ? topRowsResult.value : []
    const freqRows = freqRowsResult.status === 'fulfilled' ? freqRowsResult.value : []

    const top_speakers = topRows.map(row => {
      const key = row.author_id != null ? String(row.author_id) : 'unknown'
      return { [key]: Number(row.count ?? 0) }
    })

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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bad Request'
    return reply.code(400).send({ error: message })
  }
}
