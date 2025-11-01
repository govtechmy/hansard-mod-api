import type { FastifyInstance } from "fastify";
import { getAutocomplete } from "@/controllers/autocomplete.controller";
import { autocompleteQuerySchema, autocompleteResponseSchema } from "@/schema";

export async function registerAutocompleteRoutes(app: FastifyInstance) {
  app.get(
    "/autocomplete",
    {
      schema: {
        tags: ["Search"],
        summary: "Autocomplete keyword suggestions",
        querystring: autocompleteQuerySchema,
        response: { 200: autocompleteResponseSchema },
      },
    },
    getAutocomplete,
  );
}


