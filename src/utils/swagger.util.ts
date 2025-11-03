import { standardErrorResponseSchema } from '@/schema/shared'

export const stdAuthResponses = {
  401: standardErrorResponseSchema.describe('Unauthorized or invalid/expired token'),
}

export const stdServerErrorResponses = {
  500: standardErrorResponseSchema.describe('Internal Server Error'),
}

export function withStandardErrors(responses: Record<string, unknown> | Record<number, unknown>) {
  return { ...responses, ...stdAuthResponses, ...stdServerErrorResponses }
}
