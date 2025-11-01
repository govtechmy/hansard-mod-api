## HANSARD MOD API – Coding Rules and Project Conventions

This document defines the conventions for building and maintaining this API so new contributors can work effectively without seeing the codebase. Follow these rules to keep consistency and avoid regressions.

### Tech Stack Overview
- **Runtime/Framework**: Node.js with Fastify + TypeScript
- **Validation/Typing**: `zod` + `fastify-type-provider-zod`
- **Database/ODM**: MongoDB + Mongoose
- **Auth**: JWT (custom middleware), OAuth2 (Google, MyDigital)
- **Cloud Integrations**: AWS S3 (uploads), AWS SNS (async workflows)
- **API Docs**: Swagger/OpenAPI via Fastify plugins

### Path Aliases
- Use TypeScript path aliases for cross-cutting imports:
  - `@schemas` → `src/schemas/index.ts`
  - `@/…` → `src/…` (e.g., `@/types/enum`)
- Prefer aliases over deep relative paths for shared modules.

---

## Directory Structure and Responsibilities

```
src/
  config/        # Env and DB config (load, connect, disconnect)
  controllers/   # Request handlers (thin), orchestrate services/models
  middleware/    # Fastify middleware (auth, error handling, SNS auth)
  models/        # Mongoose schemas and models
  plugins/       # Fastify plugin registrations (swagger, security, oauth)
  routes/        # Route registration modules per feature
  schemas/       # zod schemas (request/response) per feature
  services/      # External integrations (S3, SNS, OAuth, Secrets)
  types/         # Domain types and enums
  utils/         # Pure helpers and small utilities
  server.ts      # Server bootstrap (plugins, routes, error handler)
```

### Controllers (`src/controllers/*`)
- Export named async functions per endpoint (e.g., `listTeras`, `getTerasById`).
- Keep controllers thin: parse params, call services/models, map results, return standardized responses.
- Always respond with the response helpers from `src/utils/response.util.ts`:
  - `createSuccessResponse(data, statusCode?)`
  - `createErrorResponse(message, code?, statusCode?, details?)`
- Use `request.user` (set by auth middleware) and avoid global state.

### Routes (`src/routes/*`)
- Each feature has a single route module named `<feature>.route.ts` exporting `register<Feature>Routes(app)`.
- Define endpoints using Fastify with schema, pre-handlers, and typed generics for params/body where helpful.
- Example pattern:

```ts
app.get(
  '/teras',
  {
    preHandler: [authMiddleware, requireRole([USER_ACTIONS.TERAS_VIEWER])],
    schema: {
      headers: authHeaderSchema,
      querystring: listTerasQuerySchema,
      tags: ['Teras'],
      summary: 'List teras',
      security: [{ bearerAuth: [] }],
      response: withStandardErrors({ 200: listTerasResponseSchema }),
    },
  },
  listTeras,
)
```

- Register all feature routes in `src/routes/index.route.ts` by importing and awaiting `register<Feature>Routes(app)`.
- Public endpoints (e.g., `/health`) should set `security: []` and avoid auth pre-handlers.

### Models (`src/models/*`)
- Use Mongoose `Schema` and `model<T>()` with domain interfaces from `src/types/entities.ts`.
- Import enums from `src/types/enum.ts` and use them in schema `enum` fields.
- Add common base fields by extending with `baseSchema` when appropriate.
- Export as `PascalCaseModel` (e.g., `TerasModel`).

### Schemas (`src/schemas/*`)
- Organize by feature directory containing:
  - `request.schema.ts` – all request schemas and inferred types
  - `response.schema.ts` – all response schemas and inferred types
  - `index.ts` – re-exports for the feature
- Re-export all feature indexes in `src/schemas/index.ts` so consumers import from `@schemas`.
- Use `zod` and the enums from `@/types/enum` via `z.enum(ENUM)`. Example:

```ts
export const updateTerasFileStatusBodySchema = z.object({
  fileStatus: z.enum(FILE_STATUS),
})
```

### Utilities (`src/utils/*`)
- Place small, stateless helper functions here. Typical files:
  - `response.util.ts` – standard success/error response builders
  - `jwt.util.ts` – token verification/parsing
  - `file.util.ts` – filename sanitization, etc.
  - `regex.util.ts` – regex escaping for search
  - `swagger.util.ts` – helpers for composing standard response sections
- Utilities should have no side effects or external I/O.

### Types and Enums (`src/types/*`)
- `entities.ts` – Domain interfaces used across controllers/models/services (e.g., `TerasEntity`, `ResponseModel`).
- `enum.ts` – Centralized enums (e.g., `USER_ACTIONS`, `FILE_STATUS`, `TERAS_STATUS`).
- Other groupings like `auth.ts`, `sns.ts` live here as needed.
- Prefer exporting interfaces and enums explicitly; avoid `any`.

### Middleware (`src/middleware/*`)
- Export plain async functions compatible with Fastify `preHandler` signature.
- Auth pattern:
  - `authMiddleware` validates JWT and populates `request.user`.
  - `requireRole([USER_ACTIONS.X, ...])` enforces authorization.
- Global error handler is registered once in `server.ts` via `registerErrorHandler`.

### Plugins (`src/plugins/*`)
- Encapsulate Fastify plugin setup (security, swagger, request logging, OAuth providers, env loader).
- Compose all plugins in `registerAllPlugins(app, isProduction)` and call from server bootstrap.

### Config (`src/config/*`)
- `env.config.ts` loads environment variables and secrets; `db.config.ts` handles DB connections.
- Server bootstrap (`src/server.ts`) calls `loadEnv`, `connectToDatabase`, registers plugins/routes, and starts listening.

---

## API Design & Patterns

### Request/Response Validation
- Use `zod` schemas for `headers`, `querystring`, `params`, and `body` in route options.
- Responses must be declared in the route `schema.response`, typically composed with `withStandardErrors({...})`.
- Prefer `baseResponseSchema` for success payloads and `standardErrorResponseSchema` for errors.

### Standardized Responses
- Success:

```ts
return reply.send(createSuccessResponse(data, 200))
```

- Error:

```ts
return reply.code(404).send(createErrorResponse('Not found', 'ERR_404', 404))
```

### Auth & Security
- Protect endpoints with `preHandler: [authMiddleware, requireRole([...])]`.
- Public endpoints must explicitly set `security: []` in the route schema.

### Pagination, Sorting, and Search (convention)
- Queries use `page`, `pageSize` (cap at 100), `sort` (comma-separated; prefix with `-` for DESC), and optional filters.
- When searching text fields, escape input using `escapeRegex` and use case-insensitive regex.
- Map DB results into clean response items and return ISO strings for dates.

### Error Handling
- Handle expected domain errors in controllers and return standardized error responses.
- Unexpected errors should be logged and returned as `ERR_500` with HTTP 500.

### Naming Conventions
- Files: kebab-case; suffix by responsibility:
  - `*.controller.ts`, `*.route.ts`, `*.model.ts`, `*.svc.ts`, `*.middleware.ts`, `*.plugin.ts`, `*.util.ts`
- Enums: `PascalCase` enum names with `UPPER_SNAKE_CASE` members.
- Models: `PascalCaseModel` exports (e.g., `UserModel`).
- Route registrars: `register<Feature>Routes`.

---

## Adding a New Feature (Checklist)
1. **Types/Enums** (if needed)
   - Add domain interfaces to `src/types/entities.ts` and enums to `src/types/enum.ts`.
2. **Model**
   - Create `src/models/<feature>.model.ts` with a Mongoose schema using your domain interface and enums.
3. **Schemas**
   - Create `src/schemas/<feature>/request.schema.ts` and `response.schema.ts`.
   - Re-export from `src/schemas/<feature>/index.ts`.
   - Add the feature export in `src/schemas/index.ts`.
4. **Controller**
   - Implement handlers in `src/controllers/<feature>.controller.ts` returning standardized responses.
5. **Routes**
   - Create `src/routes/<feature>.route.ts` exporting `register<Feature>Routes(app)`.
   - Define all endpoints with schema (headers/body/query), tags, summary, security, and `withStandardErrors`.
   - Use `authMiddleware` and `requireRole([...])` as appropriate.
6. **Register Routes**
   - Import and `await register<Feature>Routes(app)` in `src/routes/index.route.ts`.
7. **Services/Utils** (if needed)
   - Add external integrations under `src/services` and pure helpers under `src/utils`.

---

## Do/Don't Summary
- **Do**
  - Use zod schemas for all request/response validation.
  - Return responses via `createSuccessResponse`/`createErrorResponse`.
  - Keep controllers thin; push I/O to services and persistence to models.
  - Use path aliases (`@schemas`, `@/…`) for shared modules.
  - Re-export schemas via feature `index.ts` and root `src/schemas/index.ts`.

- **Don’t**
  - Bypass standardized response helpers.
  - Put business logic in routes; route files should only wire handlers, schema, and middleware.
  - Create utilities with side effects or external I/O.
  - Use deep relative imports for shared modules.

---

## Testing & Docs
- Use the `.http` files under `test/` to manually exercise endpoints.
- Keep route schema `tags`, `summary`, and `description` meaningful for Swagger generation.

---

## Review Checklist (per PR)
- Endpoints declare full schemas and use `withStandardErrors`.
- Controllers return standardized responses only.
- New schemas are exported via feature and root `schemas/index.ts`.
- Models align with domain interfaces and enums.
- Auth and authorization are applied correctly where required.
- Names and file placement follow conventions above.


