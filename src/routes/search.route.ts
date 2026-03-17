import type { FastifyInstance } from 'fastify'

import { getSearchMPDocResults, getSearchPlot, getSearchResults } from '@/controllers/search.controller'
import {
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
