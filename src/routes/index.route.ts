import type { FastifyInstance } from "fastify";

import { registerParliamentaryCycleRoutes } from "@/routes/parliamentary-cycle.route";
import { registerAuthorRoutes } from "@/routes/author.route";
import { registerAuthorHistoryRoutes } from "@/routes/author-history.route";

export async function registerApiRoutes(app: FastifyInstance) {
  app.get("/health", { schema: { tags: ["System"], summary: "Healthcheck" } }, async () => {
    try {
      await app.sequelize.authenticate();
      return { status: "ok", db: "connected" };
    } catch {
      return { status: "ok", db: "disconnected" };
    }
  });

  await registerParliamentaryCycleRoutes(app);
  await registerAuthorRoutes(app);
  await registerAuthorHistoryRoutes(app);
}


