import type { FastifyReply, FastifyRequest } from 'fastify'
import { createErrorResponse, createSuccessResponse } from 'src/utils/response.util'

import { S3Service } from '../services/s3.svc'

export async function getFileDownloadLink(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { url } = request.body as { url: string }

    if (!url) {
      const response = createErrorResponse('Missing url in request body', 'ERR_400', 400)
      return reply.code(400).send(response)
    }

    const s3svc = new S3Service()
    const key = s3svc.extractKeyFromUrl(url)
    const s3Url = await s3svc.getGeneratedObjectUrl(key)

    return createSuccessResponse({ url: s3Url })
  } catch (error) {
    request.log.error(`Failed to get S3 download link: ${JSON.stringify(error)}`)
    const response = createErrorResponse('Failed to get S3 download link', 'ERR_500', 500)
    return reply.code(500).send(response)
  }
}
