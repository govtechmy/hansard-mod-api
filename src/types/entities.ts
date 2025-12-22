import type { RESPONSE_STATUS } from './enum'

export interface ResponseListModel {
  items: unknown[]
  totalRecords: number
  pageNumber: number
  pageSize: number
}

export interface ResponseModel {
  status: RESPONSE_STATUS
  statusCode: number
  data: unknown | ResponseListModel
  error?: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}

// Domain entities (mirror Django models for typing)

export interface Area {
  id: number
  name: string
  type: string
  state: string
}

export interface ParliamentaryCycle {
  cycle_id: number
  start_date: string
  end_date: string
  house: number
  term: number
  session: number
  meeting: number
}

export interface Sitting {
  sitting_id: number
  cycle_id: number
  date: string
  filename: string
  has_dataset: boolean
  is_final: boolean
  speech_data: string
}

export interface Author {
  new_author_id: number
  name: string
  birth_year: number | null
  ethnicity: string
  sex: 'm' | 'f'
}

export interface AuthorHistory {
  record_id: number
  author_id: number
  party: string | null
  area_id: number | null
  area_name: string | null
  exec_posts: string | null
  service_posts: string | null
  start_date: string
  end_date: string | null
}

export interface Attendance {
  author_id: number
  sitting_id: number
  attended: boolean
}

export interface Speech {
  speech_id: number
  sitting_id: number | null
  index: number
  speaker_id: number | null
  timestamp: string
  speech: string | null
  speech_tokens: string[]
  length: number
  level_1: string | null
  level_2: string | null
  level_3: string | null
  is_annotation: boolean
}
