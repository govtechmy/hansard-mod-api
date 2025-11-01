import type { FastifyInstance } from "fastify";
import { getAuthors } from "@/controllers/author.controller";
import { withStandardErrors } from "@/utils/swagger.util";
import { standardErrorResponseSchema } from "@/schema/shared";
import { getAuthorsResponseSchema } from "@/schema";

export async function registerAuthorRoutes(app: FastifyInstance) {
  app.get(
    "/author",
    {
      schema: {
        tags: ["Author"],
        summary: "List authors",
        response: withStandardErrors({
          200: getAuthorsResponseSchema.describe("List of authors"),
          500: standardErrorResponseSchema.describe("Internal server error"),
        }),
      },
    },
    getAuthors,
  );
}


