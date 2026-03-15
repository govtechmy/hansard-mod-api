export interface AttendanceTotalRow {
  total: number | string | null
}

export interface AttendanceQueryRow {
  name: string
  ethnicity: string | null
  sex: string | null
  age: number | null
  party: string | null
  area: string | null
  total_attended: number | string
  attendance_pct: number | string
}

export interface AutocompleteSpeechRow {
  speech: string | null
}

export interface SearchCountRow {
  count: number | string | null
}

export interface SearchSpeechRow {
  index: number | string
  speaker_name: string | null
  author_id: number | string | null
  speech: string | null
  timestamp: string
  sitting_date: string
  house: number | null
  term: number | string | null
  session: number | string | null
  meeting: number | string | null
  headline?: string | null
  rank?: number | string | null
}

export interface SearchSeriesRow {
  date: string
  count: number | string
}

export interface SearchTopSpeakerRow {
  author_id: number | string | null
  count: number | string
}

export interface SearchFrequencyRow {
  word: string
  c: number | string
}

export interface SittingWithCycleRow {
  sitting_id: number
  cycle_id: number
  date: string
  filename: string
  has_dataset: boolean
  is_final: boolean
  speech_data: string | null
  summary_status?: string
  cycle: {
    cycle_id: number
    start_date: string
    end_date: string | null
    house: number
    term: number
    session: number
    meeting: number
  }
}

export interface ParliamentaryCycleRow {
  cycle_id: number
  start_date: string
  end_date: string | null
  house: number
  term: number
  session: number
  meeting: number
}
