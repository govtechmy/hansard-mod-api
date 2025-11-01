import type { FastifyInstance } from "fastify";
import { getAutocomplete } from "@/controllers/autocomplete.controller";
import { withStandardErrors } from "@/utils/swagger.util";
import { autocompleteQuerySchema, autocompleteResponseSchema } from "@/schema";

export async function registerAutocompleteRoutes(app: FastifyInstance) {
  app.get(
    "/autocomplete",
    {
      schema: {
        tags: ["Search"],
        summary: "Autocomplete keyword suggestions",
        querystring: autocompleteQuerySchema,
        response: withStandardErrors({ 200: autocompleteResponseSchema }),
      },
    },
    getAutocomplete,
  );
}


