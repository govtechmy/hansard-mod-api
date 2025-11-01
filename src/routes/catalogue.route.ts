import type { FastifyInstance } from "fastify";
import { getCatalogue } from "@/controllers/catalogue.controller";
import { withStandardErrors } from "@/utils/swagger.util";
import { getCatalogueResponseSchema } from "@/schema";
import { catalogueQuerySchema } from "@/schema";

export async function registerCatalogueRoutes(app: FastifyInstance) {
  app.get(
    "/catalogue",
    {
      schema: {
        tags: ["Catalogue"],
        summary: "List sittings catalogue",
        querystring: catalogueQuerySchema,
        response: withStandardErrors({ 200: getCatalogueResponseSchema }),
      },
    },
    getCatalogue,
  );
}


