import type { FastifyInstance } from "fastify";
import { registerSecurityPlugins } from "./security";
import { registerRequestLogging } from "./request-logging";
import { registerSwaggerPlugins } from "./swagger";
import { env } from "../config/env.config";
import { registerSequelize } from "./sequelize";

export async function registerAllPlugins(app: FastifyInstance, isProduction: boolean): Promise<void> {
  await registerSequelize(app);
  await registerSecurityPlugins(app, isProduction);
  registerRequestLogging(app);
  await registerSwaggerPlugins(app);
}


