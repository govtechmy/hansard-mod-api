import type { FastifyInstance } from "fastify";
import { getAuthorHistory } from "@/controllers/author-history.controller";
import { withStandardErrors } from "@/utils/swagger.util";
import { standardErrorResponseSchema } from "@/schema/shared";
import { getAuthorHistoryResponseSchema } from "@/schema";

export async function registerAuthorHistoryRoutes(app: FastifyInstance) {
  app.get(
    "/author-history",
    {
      schema: {
        tags: ["AuthorHistory"],
        summary: "List author history records",
        response: withStandardErrors({
          200: getAuthorHistoryResponseSchema.describe("List of author history records"),
          500: standardErrorResponseSchema.describe("Internal server error"),
        }),
      },
    },
    getAuthorHistory,
  );
}


