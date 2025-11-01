import type { FastifyInstance } from "fastify";
import { createParliamentaryCycle } from "@/controllers/parliamentary-cycle.controller";
import { withStandardErrors } from "@/utils/swagger.util";
import { standardErrorResponseSchema } from "@/schema/shared";
import { createCycleBodySchema, createParliamentaryCycleResponseSchema } from "@/schema";


export async function registerParliamentaryCycleRoutes(app: FastifyInstance) {
  app.post(
    "/parliamentary-cycle",
    {
      schema: {
        tags: ["ParliamentaryCycle"],
        summary: "Create parliamentary cycle",
        body: createCycleBodySchema,
        response: withStandardErrors({
          201: createParliamentaryCycleResponseSchema.describe("Created parliamentary cycle"),
          500: standardErrorResponseSchema.describe("Internal server error"),
        }),
      },
    },
    createParliamentaryCycle,
  );
}

