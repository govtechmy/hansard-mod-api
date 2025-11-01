import type { FastifyInstance } from "fastify";
import { bulkCreateSpeeches } from "@/controllers/speech.controller";
import { withStandardErrors } from "@/utils/swagger.util";
import { speechBulkBodySchema, speechBulkResponseSchema } from "@/schema";

export async function registerSpeechRoutes(app: FastifyInstance) {
  app.post(
    "/speech",
    {
      schema: {
        tags: ["Speech"],
        summary: "Bulk create speeches",
        body: speechBulkBodySchema,
        response: withStandardErrors({ 201: speechBulkResponseSchema }),
      },
    },
    bulkCreateSpeeches,
  );
}


