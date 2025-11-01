import type { FastifyReply, FastifyRequest } from "fastify";
import { createErrorResponse, createSuccessResponse } from "@/utils/response.util";

export async function getAuthors(request: FastifyRequest, reply: FastifyReply) {
  try {
    const Author = request.server.models.Author as any;
    const rows = await Author.findAll({ order: [["new_author_id", "ASC"]] });
    const json = rows.map((r: any) => (r?.toJSON?.() ?? r));
    return reply.send(createSuccessResponse(json, 200));
  } catch (err: any) {
    return reply.code(400).send(createErrorResponse(err?.message ?? "Bad Request", "ERR_400", 400));
  }
}


