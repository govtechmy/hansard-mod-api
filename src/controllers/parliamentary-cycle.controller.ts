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
    const ParliamentaryCycle = request.server.models.ParliamentaryCycle as any;
    const instance = await ParliamentaryCycle.create(request.body);
    const created = instance?.toJSON?.() ?? instance;
    return reply.code(201).send(created);
  } catch (err: any) {
    return reply.code(400).send({ error: err?.message ?? "Bad Request" });
  }
}


