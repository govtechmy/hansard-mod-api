import { z } from 'zod'

import { attendanceQuerySchema } from '@/schema/attendance/request.schema'
import { searchQuerySchema, searchPlotQuerySchema } from '@/schema/search/request.schema'
import { autocompleteQuerySchema } from '@/schema/autocomplete/request.schema'
import { getSittingQuerySchema, upsertSittingBodySchema } from '@/schema/sitting/request.schema'
import { createCycleBodySchema, catalogueQuerySchema } from '@/schema/parliamentary/request.schema'
import { speechBulkBodySchema } from '@/schema/speech/request.schema'

export type AttendanceQuery = z.infer<typeof attendanceQuerySchema>
export type SearchQuery = z.infer<typeof searchQuerySchema>
export type SearchPlotQuery = z.infer<typeof searchPlotQuerySchema>
export type AutocompleteQuery = z.infer<typeof autocompleteQuerySchema>
export type GetSittingQuery = z.infer<typeof getSittingQuerySchema>
export type UpsertSittingBody = z.infer<typeof upsertSittingBodySchema>
export type CreateCycleBody = z.infer<typeof createCycleBodySchema>
export type CatalogueQuery = z.infer<typeof catalogueQuerySchema>
export type SpeechBulkBody = z.infer<typeof speechBulkBodySchema>
