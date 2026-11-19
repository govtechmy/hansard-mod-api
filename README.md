# Hansard Mod API
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Fastify](https://img.shields.io/badge/Fastify-000000?style=flat&logo=fastify&logoColor=white)](https://fastify.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Bun](https://img.shields.io/badge/Bun-000000?style=flat&logo=bun&logoColor=white)](https://bun.sh/)

High-performance REST API for the Malaysian Hansard modernisation effort. Built with TypeScript, Fastify, Bun, and PostgreSQL, the service powers domain endpoints for parliamentary cycles, sittings, speeches, authorship history, search, and attendance while enforcing consistent validation and secure integrations.

## 🚀 Features

- **Fastify + Bun runtime** delivering low-latency, high-throughput HTTP services
- **Type-safe contracts** using `fastify-type-provider-zod` across routes and schemas
- **PostgreSQL via Sequelize** with optimized read-heavy access patterns
- **Hansard domain coverage**: parliamentary cycles, sittings, speeches, catalogue, authors, attendance, and search
- **Structured logging** with Pino and request correlation hooks
- **Environment parity** through AWS Secrets Manager support for runtime configuration
- **OpenAPI docs** served through Swagger UI for straightforward API exploration
- **Security middleware** (Helmet, CORS) with production-safe defaults

## 📊 Logging

Logging is powered by [Pino](https://getpino.io/) and extended with a request logging hook.

- **Correlation ready**: Fastify request IDs are propagated to every log entry
- **Structured events**: Method, URL, params, and sanitized bodies recorded as JSON
- **Dynamic formatting**: Pretty logs during development, JSON output in production
- **Custom transport**: Pretty printing handled via `pino-pretty` when `APP_ENV` is non-production
- **AWS friendly**: Logs are emitted to stdout, making them compatible with CloudWatch ingestion

Recommended practices:

- Use `request.log` inside controllers/services to include contextual identifiers (e.g., `sittingId`, `cycleId`)
- Prefer semantic levels: `info` for success paths, `warn` for unexpected-but-handled states, `error` for failures
- Surface caught exceptions via `request.log.error({ err })` to retain stack traces

## 📋 Prerequisites

- [Bun](https://bun.sh/) v1.3.1 or newer
- [Node.js](https://nodejs.org/) v18+ (optional, for tooling compatibility)
- [PostgreSQL](https://www.postgresql.org/) 13+ running locally or remotely
- AWS credentials (optional) when resolving environment configuration from Secrets Manager

## 🛠️ Installation

1. **Clone the repository**
	```bash
	git clone https://github.com/govtechmy/hansard-mod-api.git
	cd hansard-mod-api
	```

2. **Install dependencies**
	```bash
	bun install
	```

3. **Set up environment variables**
	```bash
	cp .env.example .env
	# Update .env with your local values
	```

## ⚙️ Configuration

Environment configuration is validated at boot using Zod. Populate `.env` (or the referenced AWS secret) with the variables below:

```env
# Application
APP_ENV=development # local | development | test | production
LOG_LEVEL=debug # fatal | error | warn | info | debug | trace | silent
PORT=3000

# Simple bearer auth
API_AUTH_TOKEN=changeme

# Database
DATABASE_URL=postgres://user:password@localhost:5432/hansard

# Frontend
FRONTEND_ORIGIN=http://localhost:5173 # Required when APP_ENV=production

# Optional AWS Secrets Manager
AWS_SECRET_NAME=hansard-mod-api/config
```

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `APP_ENV` | No | `local` | Sets runtime mode and influences logging/helmet behaviour |
| `LOG_LEVEL` | No | `debug` (non-prod) / `info` (prod) | Overrides logger verbosity |
| `PORT` | No | `3000` | Fastify listening port |
| `DATABASE_URL` | Yes | – | PostgreSQL connection string used by Sequelize |
| `FRONTEND_ORIGIN` | Yes (prod) | – | Allowed CORS origin in production |
| `API_AUTH_TOKEN` | Yes | – | Static bearer token required in `Authorization: Bearer <token>` for all `/api/*` routes |
| `AWS_SECRET_NAME` | No | – | AWS Secrets Manager secret resolved at startup |

When `AWS_SECRET_NAME` is supplied, the service tries to hydrate configuration from Secrets Manager first and falls back to process environment variables on failure.

## 🚀 Usage

### Development

```bash
# Start Fastify with hot reload
bun run dev
```

### Database migrations

```bash
# Apply pending migrations
bun run migrate:up

# Roll back last migration
bun run migrate:down

# Inspect migration status
bun run migrate:status
```

### Production

```bash
# Boot the server (expects env vars to be set)
bun run start
```

### API documentation

- **Swagger UI**: `http://localhost:3000/docs`
- **OpenAPI JSON**: `http://localhost:3000/docs/json`

## 📡 API Endpoints

All API endpoints are prefixed with `/api` and require Bearer token authentication.

### System
- `GET /health` - Health check endpoint

### Parliamentary Cycles
- `POST /api/parliamentary-cycle` - Create a new parliamentary cycle

### Authors
- `GET /api/author` - List all authors
- `GET /api/author-history` - List author history records

### Catalogue
- `GET /api/catalogue` - List sittings catalogue with filtering options

### Sittings
- `GET /api/sitting` - Get speeches and metadata for a specific sitting
- `POST /api/sitting` - Create or update a sitting and its speeches

### Speeches
- `POST /api/speech` - Bulk create speeches

### Search
- `GET /api/search` - Live search across speeches
- `GET /api/search/suggestion?q=harga%20minyk%20naik` - Suggest a typo-corrected query using Hansard vocabulary (fuzzy sugession)
- `GET /api/search-plot` - Search frequency time series and aggregates
- `GET /api/autocomplete` - Autocomplete keyword suggestions

### Attendance
- `GET /api/attendance` - Attendance statistics by term/session/meeting

For detailed request/response schemas and examples, visit the Swagger UI documentation at `http://localhost:3000/docs`.

### Search suggestions

Run `bun run migrate:up` before using `GET /api/search/suggestion?q=harga%20minyk%20naik`.
It returns `{ query, suggestions, did_you_mean }`; no correction returns `[]` and `null`.
Suggestions use an indexed Hansard dictionary and are spelling hints, not guaranteed phrase matches.
After speech imports or edits, run `bun run search:dictionary:refresh`. Initial builds can take time on large databases.

HTTP examples are in `test-case/search-suggestion.http` and `test-case/speech.http`.
For speech uploads, choose an existing `sitting_id` from the catalogue first. Requests labeled 400 intentionally test validation.

Run integration tests against an isolated database ending in `_test`:

```bash
SEARCH_SUGGESTION_TEST_DATABASE_URL=postgres://postgres:password@localhost:5432/hansard_test bun test test-case/search-suggestion.test.ts
```
