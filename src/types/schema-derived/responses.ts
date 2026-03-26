import { z } from 'zod'

import { attendanceResponseSchema } from '@/schema/attendance/response.schema'
import { autocompleteResponseSchema } from '@/schema/autocomplete/response.schema'
import { getCatalogueResponseSchema } from '@/schema/catalogue/response.schema'
import {
  searchCounterResponseSchema,
  searchMPDocResultsResponseSchema,
  searchPlotResponseSchema,
  searchResultsResponseSchema,
} from '@/schema/search/response.schema'
import { getSittingResponseSchema, upsertSittingResponseSchema } from '@/schema/sitting/response.schema'

export type AttendanceResponse = z.infer<typeof attendanceResponseSchema>
export type SearchResultsResponse = z.infer<typeof searchResultsResponseSchema>
export type SearchMPDocResultsResponse = z.infer<typeof searchMPDocResultsResponseSchema>
export type SearchCounterResponse = z.infer<typeof searchCounterResponseSchema>
export type SearchPlotResponse = z.infer<typeof searchPlotResponseSchema>
export type GetSittingResponse = z.infer<typeof getSittingResponseSchema>
export type UpsertSittingResponse = z.infer<typeof upsertSittingResponseSchema>
export type CatalogueResponse = z.infer<typeof getCatalogueResponseSchema>
export type AutocompleteResponse = z.infer<typeof autocompleteResponseSchema>
