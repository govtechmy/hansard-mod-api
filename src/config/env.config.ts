import { z } from 'zod'

import { SecretsManagerService } from '../services/secrets-manager.svc'
import { parseWithSchemaOrThrow } from '../utils/env-parse.util'

// Only keep the required keys as requested
const EnvSchema = z.object({
  APP_ENV: z.enum(['production', 'development', 'test', 'local']).default('local'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).optional(),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  FRONTEND_ORIGIN: z.string().min(1).optional(),
})

function mapSecrets(secrets: Record<string, unknown>) {
  return {
    APP_ENV: secrets.APP_ENV,
    LOG_LEVEL: secrets.LOG_LEVEL,
    PORT: secrets.PORT,
    DATABASE_URL: secrets.DATABASE_URL,
    FRONTEND_ORIGIN: secrets.FRONTEND_ORIGIN,
  }
}

async function resolveEnv() {
  const secretName = process.env.AWS_SECRET_NAME

  let parsed: z.infer<typeof EnvSchema>

  if (secretName) {
    try {
      const secretsManager = new SecretsManagerService()
      const secrets = await secretsManager.getSecret(secretName)
      const mapped = mapSecrets(secrets)
      parsed = parseWithSchemaOrThrow(EnvSchema, mapped)
    } catch (error) {
      const name = error instanceof Error ? error.name : 'UnknownError'
      const message = error instanceof Error ? error.message : String(error)
      process.stderr.write(`[env] Failed to load AWS Secrets (name="${secretName}"): ${name}: ${message}\n`)
      parsed = parseWithSchemaOrThrow(EnvSchema, process.env)
    }
  } else {
    parsed = parseWithSchemaOrThrow(EnvSchema, process.env)
  }

  const isProduction = parsed.APP_ENV === 'production'
  const logLevel = parsed.LOG_LEVEL ?? (isProduction ? 'info' : 'debug')

  return {
    APP_ENV: parsed.APP_ENV,
    LOG_LEVEL: parsed.LOG_LEVEL,
    PORT: parsed.PORT,
    DATABASE_URL: parsed.DATABASE_URL,
    FRONTEND_ORIGIN: parsed.FRONTEND_ORIGIN,
    isProduction,
    logLevel,
  }
}

export function loadEnv(): typeof env {
  return env
}

export const env = await resolveEnv()

export type Env = typeof env
