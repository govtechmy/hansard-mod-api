import type { FastifyInstance } from "fastify";
import { getSearchResults, getSearchPlot } from "@/controllers/search.controller";
import { searchQuerySchema, searchResultsResponseSchema, searchPlotQuerySchema, searchPlotResponseSchema } from "@/schema";

export async function registerSearchRoutes(app: FastifyInstance) {
  app.get(
    "/search",
    {
      schema: {
        tags: ["Search"],
        summary: "Live search across speeches",
        querystring: searchQuerySchema,
        response: { 200: searchResultsResponseSchema },
      },
    },
    getSearchResults,
  );

  app.get(
    "/search-plot",
    {
      schema: {
        tags: ["Search"],
        summary: "Search frequency time series and aggregates",
        querystring: searchPlotQuerySchema,
        response: { 200: searchPlotResponseSchema },
      },
    },
    getSearchPlot,
  );
}


