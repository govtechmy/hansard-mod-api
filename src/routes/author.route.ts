import type { FastifyInstance } from "fastify";
import { getAuthors } from "@/controllers/author.controller";
import { withStandardErrors } from "@/utils/swagger.util";
import { standardResponseSchema } from "@/schema/shared";

export async function registerAuthorRoutes(app: FastifyInstance) {
  app.get(
    "/author",
    {
      schema: {
        tags: ["Author"],
        summary: "List authors",
        response: withStandardErrors({ 200: standardResponseSchema }),
      },
    },
    getAuthors,
  );
}


