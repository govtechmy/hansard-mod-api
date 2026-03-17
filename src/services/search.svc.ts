import { QueryTypes, type Sequelize } from 'sequelize'

import type {
  SearchCountRow,
  SearchFrequencyRow,
  SearchMPDocResultsResponse,
  SearchPlotResponse,
  SearchQuery,
  SearchResultsResponse,
  SearchSeriesRow,
  SearchSpeechRow,
  SearchTopSpeakerRow,
  SqlBindings,
} from '@/types'
import { buildHeadlineFragment, paginate, resampleSeries, translateAgeGroupToBirthYearBounds } from '@/utils'

export interface SearchServiceResponse {
  success?: SearchResultsResponse
  error?: {
    code: number
    type: string
    message: string
  }
}

export interface SearchMPDocServiceResponse {
  success?: SearchMPDocResultsResponse
  error?: {
    code: number
    type: string
    message: string
  }
}

export interface SearchServicePlotResponse {
  success?: SearchPlotResponse
  error?: {
    code: number
    type: string
    message: string
  }
}

export class SearchService {
  private async generateYearRange(startDate: Date, endDate: Date, yearsBatchSize = 5) {
    const ranges = []
    let currentStartYear = startDate.getFullYear()
    const endYear = endDate.getFullYear()

    while (currentStartYear <= endYear) {
      const currentEndYear = Math.min(currentStartYear + yearsBatchSize - 1, endYear)
      ranges.push({
        start: new Date(currentStartYear, 0, 1).toISOString().slice(0, 10),
        end: new Date(currentEndYear, 11, 31).toISOString().slice(0, 10),
      })
      currentStartYear += yearsBatchSize
    }

    return ranges
  }

  public async search(
    sequelize: Sequelize,
    query: SearchQuery,
    parameters: {
      startDate: string
      endDate: string
      houses: number[]
      windowSize: number
      q: string
      uid?: number
      pageSize: number
      pageInput: number
    },
  ): Promise<SearchServiceResponse> {
    const response = {} as SearchServiceResponse

    const whereParts: string[] = ['pc.house IN (:houses)', 'si.date >= :startDate', 'si.date <= :endDate']
    const repl: SqlBindings = {
      houses: parameters.houses,
      startDate: parameters.startDate,
      endDate: parameters.endDate,
    }

    if (query.party) {
      whereParts.push('ah.party = :party')
      repl.party = query.party
    }

    if (query.sex) {
      whereParts.push('a.sex = :sex')
      repl.sex = query.sex
    }

    if (query.ethnicity) {
      whereParts.push('a.ethnicity = :ethnicity')
      repl.ethnicity = query.ethnicity
    }

    if (query.age_group) {
      const grp = query.age_group
      const currentYear = new Date().getFullYear()
      const trans = translateAgeGroupToBirthYearBounds(grp, currentYear)
      if (trans) {
        whereParts.push(trans.clause)
        Object.assign(repl, trans.params)
      }
    }

    if (parameters.uid) {
      whereParts.push('a.new_author_id = :uid')
      repl.uid = parameters.uid
    }

    let selectHeadline = ''
    let selectRank = ''
    let orderBy = 'si.date DESC'
    const headlineFragment = parameters.q ? buildHeadlineFragment(parameters.q, parameters.windowSize) : null
    if (headlineFragment) {
      selectHeadline = headlineFragment.select
      selectRank = headlineFragment.rankSelect
      orderBy = headlineFragment.order
      repl.q = parameters.q
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
      response.error = {
        code: 404,
        type: 'text/plain',
        message: 'No speeches found with the given query.',
      }
      return response
    }

    const { offset, next, previous } = paginate(total, parameters.pageInput, parameters.pageSize)
    const selectSql = `
      SELECT s.index, a.name as speaker_name, a.new_author_id as author_id, s.speech, s.timestamp,
             si.date as sitting_date, pc.term, pc.session, pc.meeting, pc.house
             ${selectHeadline} ${selectRank}
      ${baseFrom}
      ${whereSql}
      ORDER BY ${orderBy}
      LIMIT :limit OFFSET :offset
    `

    const selectReplacements: SqlBindings = { ...repl, limit: parameters.pageSize, offset }
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
        trimmed_speech: parameters.q ? (r.headline ?? '') : `${(r.speech ?? '').slice(0, parameters.windowSize)}...`,
        relevance_score: parameters.q ? (r.rank != null ? Number(r.rank) : null) : null,
        house: r.house,
        sitting: {
          date: r.sitting_date,
          term: Number(r.term ?? 0),
          session: Number(r.session ?? 0),
          meeting: Number(r.meeting ?? 0),
        },
      }))

    response.success = { count: total, next, previous, results }
    return response
  }

  public async searchMPDoc(
    sequelize: Sequelize,
    query: SearchQuery,
    parameters: {
      startDate: string
      endDate: string
      houses: number[]
      q: string
      uid?: number
      pageSize: number
      pageInput: number
    },
  ): Promise<SearchMPDocServiceResponse> {
    const response = {} as SearchMPDocServiceResponse

    const whereParts: string[] = ['pc.house IN (:houses)', 'si.date >= :startDate', 'si.date <= :endDate']
    const repl: SqlBindings = {
      houses: parameters.houses,
      startDate: parameters.startDate,
      endDate: parameters.endDate,
    }

    if (query.party) {
      whereParts.push('ah.party = :party')
      repl.party = query.party
    }

    if (query.sex) {
      whereParts.push('a.sex = :sex')
      repl.sex = query.sex
    }

    if (query.ethnicity) {
      whereParts.push('a.ethnicity = :ethnicity')
      repl.ethnicity = query.ethnicity
    }

    if (query.age_group) {
      const grp = query.age_group
      const currentYear = new Date().getFullYear()
      const trans = translateAgeGroupToBirthYearBounds(grp, currentYear)
      if (trans) {
        whereParts.push(trans.clause)
        Object.assign(repl, trans.params)
      }
    }

    if (parameters.uid) {
      whereParts.push('a.new_author_id = :uid')
      repl.uid = parameters.uid
    }

    const orderBy = 'si.date DESC'

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
      response.error = {
        code: 404,
        type: 'text/plain',
        message: 'No speeches found with the given query.',
      }
      return response
    }

    const { offset, next, previous } = paginate(total, parameters.pageInput, parameters.pageSize)
    const selectSql = `
      SELECT DISTINCT  si.date as sitting_date, pc.term, pc.session, pc.meeting,  pc.house
      ${baseFrom}
      ${whereSql}
      ORDER BY ${orderBy}
      LIMIT :limit OFFSET :offset
    `

    const selectReplacements: SqlBindings = { ...repl, limit: parameters.pageSize, offset }
    const rows = await sequelize.query<SearchSpeechRow>(selectSql, {
      replacements: selectReplacements,
      type: QueryTypes.SELECT,
    })

    const results: SearchMPDocResultsResponse['results'] = rows.map(r => ({
      date: r.sitting_date,
      term: Number(r.term ?? 0),
      session: Number(r.session ?? 0),
      meeting: Number(r.meeting ?? 0),
      house: r.house,
    }))

    response.success = { count: total, next, previous, results }
    return response
  }

  public async searchPlot(
    sequelize: Sequelize,
    query: SearchQuery,
    parameters: {
      startDate: string
      endDate: string
      houses: number[]
      q: string
      uid?: number
    },
  ): Promise<SearchServicePlotResponse> {
    const whereParts: string[] = ['pc.house IN (:houses)', 'si.date >= :startDate', 'si.date <= :endDate']
    const repl: SqlBindings = {
      houses: parameters.houses,
      startDate: parameters.startDate,
      endDate: parameters.endDate,
    }

    if (query.party) {
      whereParts.push('ah.party = :party')
      repl.party = query.party
    }

    if (query.sex) {
      whereParts.push('a.sex = :sex')
      repl.sex = query.sex
    }

    if (query.ethnicity) {
      whereParts.push('a.ethnicity = :ethnicity')
      repl.ethnicity = query.ethnicity
    }

    if (query.age_group) {
      const grp = query.age_group
      const currentYear = new Date().getFullYear()
      const trans = translateAgeGroupToBirthYearBounds(grp, currentYear)
      if (trans) {
        whereParts.push(trans.clause)
        Object.assign(repl, trans.params)
      }
    }

    if (query.uid) {
      whereParts.push('a.new_author_id = :uid')
      repl.uid = Number(query.uid)
    }

    if (parameters.q) {
      whereParts.push("s.speech_vector @@ plainto_tsquery('english', :q)")
      repl.q = parameters.q
    }

    const whereSql = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : ''
    const baseFrom = `
      FROM api_speech s
      JOIN api_sitting si ON s.sitting_id = si.sitting_id
      JOIN api_parliamentary_cycle pc ON si.cycle_id = pc.cycle_id
      LEFT JOIN api_author_history ah ON s.speaker_id = ah.record_id
      LEFT JOIN api_author a ON ah.author_id = a.new_author_id
    `

    const seriesSql = parameters.q
      ? `SELECT si.date::date as date, count(s.speech_id) as count ${baseFrom} ${whereSql} GROUP BY si.date ORDER BY si.date`
      : `SELECT si.date::date as date, sum(s.length) as count ${baseFrom} ${whereSql} GROUP BY si.date ORDER BY si.date`

    // Top N speakers
    const topSql = `
        SELECT a.new_author_id as author_id, count(*) as count
        ${baseFrom}
        ${whereSql}
        GROUP BY a.new_author_id
        ORDER BY count DESC
        LIMIT 5
      `

    const freqBindings: SqlBindings = { ...repl }
    if (!query.start_date) {
      // set hard limit for performance
      freqBindings.startDate = '2008-01-01'
    }
    const freqSql = `
      SELECT unnest(s.speech_tokens) as word, count(*) as c
      ${baseFrom}
      ${whereSql}
      GROUP BY word
      ORDER BY c DESC
      LIMIT 20
    `

    // Run queries in parallel to improve performance
    const [seriesResult, topRowsResult, freqRowsResult] = await Promise.allSettled([
      sequelize.query<SearchSeriesRow>(seriesSql, { replacements: repl, type: QueryTypes.SELECT }),
      sequelize.query<SearchTopSpeakerRow>(topSql, { replacements: repl, type: QueryTypes.SELECT }),
      sequelize.query<SearchFrequencyRow>(freqSql, { replacements: freqBindings, type: QueryTypes.SELECT }),
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
      return {
        error: {
          code: 404,
          type: 'text/plain',
          message: 'No speeches found with the given filters.',
        },
      }
    }

    const chart_data = resampleSeries(
      series.map(r => ({ date: r.date, count: Number(r.count) })),
      parameters.startDate,
      parameters.endDate,
    )

    const total_results = chart_data.freq.reduce((a, b) => a + b, 0)
    const plotResponse: SearchPlotResponse = { chart_data, total_results, top_word_freq, top_speakers }
    return { success: plotResponse }
  }
}
