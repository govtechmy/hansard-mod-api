import type { FastifyReply, FastifyRequest } from "fastify";
import { createErrorResponse, createSuccessResponse } from "@/utils/response.util";

export async function getAuthorHistory(request: FastifyRequest, reply: FastifyReply) {
  try {
    const AuthorHistory = request.server.models.AuthorHistory as any;
    const rows = await AuthorHistory.findAll({ order: [["record_id", "ASC"]] });
    const json = rows.map((r: any) => (r?.toJSON?.() ?? r));
    return reply.send(json);
  } catch (err: any) {
    return reply.code(400).send({ error: err?.message ?? "Bad Request" });
  }
}


