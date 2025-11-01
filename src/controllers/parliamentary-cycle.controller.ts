import type { FastifyReply, FastifyRequest } from "fastify";
import { createErrorResponse, createSuccessResponse } from "@/utils/response.util";

type CreateCycleBody = {
  start_date: string;
  end_date: string;
  house: number;
  term: number;
  session: number;
  meeting: number;
};

export async function createParliamentaryCycle(
  request: FastifyRequest<{ Body: CreateCycleBody }>,
  reply: FastifyReply,
) {
  try {
    const [rows] = await request.server.sequelize.query(
      `INSERT INTO api_parliamentary_cycle (start_date, end_date, house, term, session, meeting)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING cycle_id, start_date, end_date, house, term, session, meeting`,
      {
        bind: [
          request.body.start_date,
          request.body.end_date,
          request.body.house,
          request.body.term,
          request.body.session,
          request.body.meeting,
        ],
      },
    );
    const created = Array.isArray(rows) ? rows[0] : rows;
    return reply.code(201).send(createSuccessResponse(created, 201));
  } catch (err: any) {
    return reply.code(400).send(createErrorResponse(err?.message ?? "Bad Request", "ERR_400", 400));
  }
}


