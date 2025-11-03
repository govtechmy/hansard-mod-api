export interface PaginationResult {
  page: number
  totalPages: number
  offset: number
  next: number | null
  previous: number | null
}

export function paginate(total: number, pageInput: number, pageSize: number): PaginationResult {
  const safePageSize = pageSize > 0 ? pageSize : 10
  const totalPages = Math.max(1, Math.ceil(total / safePageSize))
  const page = Math.min(Math.max(1, pageInput), totalPages)
  const offset = (page - 1) * safePageSize
  const next = page < totalPages ? page + 1 : null
  const previous = page > 1 ? page - 1 : null
  return { page, totalPages, offset, next, previous }
}
