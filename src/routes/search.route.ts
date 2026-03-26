import type { FastifyInstance } from 'fastify'

import { getSearchCounter, getSearchMPDocResults, getSearchPlot, getSearchResults } from '@/controllers/search.controller'
import {
  searchCounterQuerySchema,
  searchCounterResponseSchema,
  searchMPDocResultsResponseSchema,
  searchPlotQuerySchema,
  searchPlotResponseSchema,
  searchQuerySchema,
  searchResultsResponseSchema,
} from '@/schema'

export async function registerSearchRoutes(app: FastifyInstance) {
  app.get(
    '/search',
    {
      schema: {
        tags: ['Search'],
        summary: 'Live search across speeches',
        querystring: searchQuerySchema,
        response: { 200: searchResultsResponseSchema },
      },
    },
    getSearchResults,
  )

  app.get(
    '/search/counter',
    {
      schema: {
        tags: ['Search'],
        summary: 'Keyword result counter by house',
        querystring: searchCounterQuerySchema,
        response: { 200: searchCounterResponseSchema },
      },
    },
    getSearchCounter,
  )

  app.get(
    '/search-mp-doc',
    {
      schema: {
        tags: ['Search'],
        summary: 'Search for documents of an MP',
        querystring: searchQuerySchema,
        response: { 200: searchMPDocResultsResponseSchema },
      },
    },
    getSearchMPDocResults,
  )

  app.get(
    '/search-plot',
    {
      schema: {
        tags: ['Search'],
        summary: 'Search frequency time series and aggregates',
        querystring: searchPlotQuerySchema,
        response: { 200: searchPlotResponseSchema },
      },
    },
    getSearchPlot,
  )
}
