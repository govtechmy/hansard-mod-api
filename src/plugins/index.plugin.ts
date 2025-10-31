import type { FastifyInstance } from "fastify";
import { registerSecurityPlugins } from "./security";
import { registerRequestLogging } from "./request-logging";
import { registerSwaggerPlugins } from "./swagger";

export async function registerAllPlugins(app: FastifyInstance, isProduction: boolean): Promise<void> {
  await registerSecurityPlugins(app, isProduction);
  registerRequestLogging(app);
  await registerSwaggerPlugins(app);
}


