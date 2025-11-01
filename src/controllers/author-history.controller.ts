import type { FastifyReply, FastifyRequest } from "fastify";
import { listAuthorHistory } from "@/models/author-history.model";
import { createErrorResponse, createSuccessResponse } from "@/utils/response.util";

export async function getAuthorHistory(request: FastifyRequest, reply: FastifyReply) {
  try {
    const rows = await listAuthorHistory(request.server);
    return reply.send(createSuccessResponse(rows, 200));
  } catch (err: any) {
    return reply.code(400).send(createErrorResponse(err?.message ?? "Bad Request", "ERR_400", 400));
  }
}


