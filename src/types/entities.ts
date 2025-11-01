import type { RESPONSE_STATUS } from "./enum"

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
  