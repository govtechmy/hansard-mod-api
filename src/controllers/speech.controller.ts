import type { FastifyReply, FastifyRequest } from 'fastify'

type SpeechItem = {
  sitting_id: number
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

export async function bulkCreateSpeeches(request: FastifyRequest<{ Body: SpeechItem[] | any }>, reply: FastifyReply) {
  try {
    const { Speech } = request.server.models as any
    const isArray = Array.isArray(request.body)
    if (!isArray) {
      return reply.code(400).send({ error: 'Bulk creation is required.' })
    }

    const payload = request.body as SpeechItem[]
    const created = await Speech.bulkCreate(payload, { returning: true, validate: true })
    return reply.code(201).send(created.map((r: any) => r?.toJSON?.() ?? r))
  } catch (err: any) {
    return reply.code(400).send({ error: err?.message ?? 'Bad Request' })
  }
}
