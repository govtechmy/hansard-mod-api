import type { FastifyInstance } from "fastify";

import { registerParliamentaryCycleRoutes } from "./parliamentary-cycle.route";
import { registerAuthorRoutes } from "./author.route";
import { registerAuthorHistoryRoutes } from "./author-history.route";
import { registerCatalogueRoutes } from "./catalogue.route";

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
  await registerCatalogueRoutes(app);
}


