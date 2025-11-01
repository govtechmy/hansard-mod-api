import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { createParliamentaryCycle } from "@/controllers/parliamentary-cycle.controller";
import { withStandardErrors } from "@/utils/swagger.util";
import { standardResponseSchema } from "@/schema/shared";

const createCycleBodySchema = z.object({
  start_date: z.string().min(1),
  end_date: z.string().min(1),
  house: z.number().int().min(0).max(2),
  term: z.number().int(),
  session: z.number().int(),
  meeting: z.number().int(),
});

export async function registerParliamentaryCycleRoutes(app: FastifyInstance) {
  app.post(
    "/parliamentary-cycle",
    {
      schema: {
        tags: ["ParliamentaryCycle"],
        summary: "Create parliamentary cycle",
        body: createCycleBodySchema,
        response: withStandardErrors({ 201: standardResponseSchema }),
      },
    },
    createParliamentaryCycle,
  );
}


