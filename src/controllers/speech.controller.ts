import type { FastifyReply, FastifyRequest } from "fastify";
import { createErrorResponse, createSuccessResponse } from "@/utils/response.util";

type SpeechItem = {
  sitting_id: number;
  index: number;
  speaker_id: number | null;
  timestamp: string;
  speech: string | null;
  speech_tokens: string[];
  length: number;
  level_1: string | null;
  level_2: string | null;
  level_3: string | null;
  is_annotation: boolean;
};

export async function bulkCreateSpeeches(
  request: FastifyRequest<{ Body: SpeechItem[] | any }>,
  reply: FastifyReply,
) {
  try {
    const { Speech } = request.server.models as any;
    const isArray = Array.isArray(request.body);
    if (!isArray) {
      return reply.code(400).send(createErrorResponse("Bulk creation is required.", "ERR_400", 400));
    }

    const payload = request.body as SpeechItem[];
    const created = await Speech.bulkCreate(payload, { returning: true, validate: true });
    return reply.code(201).send(createSuccessResponse(created.map((r: any) => (r?.toJSON?.() ?? r)), 201));
  } catch (err: any) {
    return reply.code(400).send(createErrorResponse(err?.message ?? "Bad Request", "ERR_400", 400));
  }
}


