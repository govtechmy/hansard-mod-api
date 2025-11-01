import type { FastifyInstance } from "fastify";
import { getAuthors } from "@/controllers/author.controller";
import { getAuthorsResponseSchema } from "@/schema";

export async function registerAuthorRoutes(app: FastifyInstance) {
  app.get(
    "/author",
    {
      schema: {
        tags: ["Author"],
        summary: "List authors",
        response: { 200: getAuthorsResponseSchema.describe("List of authors") },
      },
    },
    getAuthors,
  );
}


