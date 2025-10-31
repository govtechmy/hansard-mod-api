import type { FastifyInstance } from "fastify";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";

export async function registerSwaggerPlugins(app: FastifyInstance): Promise<void> {
  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title: "hansard Mod API",
        description: "API documentation for hansard Mod service",
        version: "1.0.0",
      },
    },
  });

  await app.register(fastifySwaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: true,
    },
    staticCSP: true,
  });
}


