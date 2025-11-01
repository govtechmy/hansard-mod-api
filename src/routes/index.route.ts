import type { FastifyInstance } from "fastify";
import "@fastify/postgres";


export async function registerApiRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", { schema: { tags: ["System"], summary: "Healthcheck" } }, async () => {
    try {
      await app.pg.query("SELECT 1");
      return { status: "ok", db: "connected" };
    } catch {
      return { status: "ok", db: "disconnected" };
    }
  });


}


