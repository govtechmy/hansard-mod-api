import type { FastifyReply, FastifyRequest } from "fastify";
import { createErrorResponse, createSuccessResponse } from "@/utils/response.util";

export async function getAuthors(request: FastifyRequest, reply: FastifyReply) {
  try {
    const [rows] = await request.server.sequelize.query(
      `SELECT new_author_id, name, birth_year, ethnicity, sex
       FROM api_author
       ORDER BY new_author_id ASC`,
    );
    return reply.send(createSuccessResponse(rows, 200));
  } catch (err: any) {
    return reply.code(400).send(createErrorResponse(err?.message ?? "Bad Request", "ERR_400", 400));
  }
}


