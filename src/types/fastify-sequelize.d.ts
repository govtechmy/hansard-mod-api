import "fastify";
import type { Sequelize, ModelStatic, Model } from "sequelize";

declare module "fastify" {
  interface FastifyInstance {
    sequelize: Sequelize;
    models: Record<string, ModelStatic<Model>>;
  }
}


