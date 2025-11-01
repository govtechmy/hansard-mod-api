import type { FastifyInstance } from "fastify";
import { getAuthorHistory } from "@/controllers/author-history.controller";
import { withStandardErrors } from "@/utils/swagger.util";
import { standardResponseSchema } from "@/schema/shared";

export async function registerAuthorHistoryRoutes(app: FastifyInstance) {
  app.get(
    "/author-history",
    {
      schema: {
        tags: ["AuthorHistory"],
        summary: "List author history records",
        response: withStandardErrors({ 200: standardResponseSchema }),
      },
    },
    getAuthorHistory,
  );
}


