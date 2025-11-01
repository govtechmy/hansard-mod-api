import type { FastifyReply, FastifyRequest } from "fastify";
import { listAuthors } from "@/models/author.model";
import { createErrorResponse, createSuccessResponse } from "@/utils/response.util";

export async function getAuthors(request: FastifyRequest, reply: FastifyReply) {
  try {
    const rows = await listAuthors(request.server);
    return reply.send(createSuccessResponse(rows, 200));
  } catch (err: any) {
    return reply.code(400).send(createErrorResponse(err?.message ?? "Bad Request", "ERR_400", 400));
  }
}


