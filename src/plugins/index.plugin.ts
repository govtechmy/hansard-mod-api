import type { FastifyInstance } from "fastify";
import { registerSecurityPlugins } from "./security";
import { registerRequestLogging } from "./request-logging";
import { registerSwaggerPlugins } from "./swagger";
import fastifyPostgres from "@fastify/postgres";
import { env } from "../config/env";

export async function registerAllPlugins(app: FastifyInstance, isProduction: boolean): Promise<void> {
  await app.register(fastifyPostgres, { connectionString: env.DATABASE_URL });
  await registerSecurityPlugins(app, isProduction);
  registerRequestLogging(app);
  await registerSwaggerPlugins(app);
}


