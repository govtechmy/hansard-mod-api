import type { FastifyReply, FastifyRequest } from "fastify";
import { createErrorResponse, createSuccessResponse } from "@/utils/response.util";

export async function getAuthorHistory(request: FastifyRequest, reply: FastifyReply) {
  try {
    const [rows] = await request.server.sequelize.query(
      `SELECT record_id, author_id, party, area_id, exec_posts, service_posts, start_date, end_date
       FROM api_author_history
       ORDER BY record_id ASC`,
    );
    return reply.send(createSuccessResponse(rows, 200));
  } catch (err: any) {
    return reply.code(400).send(createErrorResponse(err?.message ?? "Bad Request", "ERR_400", 400));
  }
}


