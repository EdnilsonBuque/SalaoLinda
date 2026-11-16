# Phase 1 Research: Foundation — Scaffold, Schema & Auth

**Phase:** 1 of 4  
**Goal:** Contas e sessão funcionam sobre uma base sólida — scaffold Vue 3 + Vuetify, schema MySQL e auth JWT/RBAC no servidor  
**Requirements:** AUTH-01, AUTH-02, AUTH-03, AUTH-04  
**Date:** 2026-11-16  
**Mode:** yolo / granularity coarse (reasonable defaults assumed; non-interactive)

## Scope

This phase delivers the irreversible foundation:
- Monorepo scaffold: `web/` (Vue 3 + Vuetify 4, Vite, Capacitor-ready structure) and `api/` (Express 5, ESM JS)
- MySQL 8.4 local dev setup + Knex migrations for core schema
- Auth: register/login, JWT access+refresh with rotation, logout/revocation, admin-only password reset for clients
- RBAC enforced server-side; session persistence client-side via Capacitor Preferences (with web fallback for dev)
- Base app shell (pt, mobile-first layout primitives, safe-area groundwork)

Out of scope for Phase 1: service CRUD/catalog, booking engine, dashboard, ratings, APK packaging (Phases 2-4).

## Key Decisions (defaults applied)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Repo layout | `web/` + `api/` at root | Clear separation; independent package.json/scripts; aligns with architecture research |
| API module style | ESM (`"type":"module"`) | Modern Node 26 LTS; consistent with Vite/frontend |
| Migrations | **Knex migrations** (`api/migrations/*.js`) | Project STACK chose Knex 3.3; versioned, reversible, plain JS |
| DB driver/query | mysql2 pool + Knex | Knex for migrations/query building; `knex.raw` available |
| Auth tokens | Access JWT (~15m) + refresh JWT (~30d) stored/rotated in `refresh_tokens` table | STACK §4.1; rotation limits replay; acceptable MVP security |
| Token storage (client) | `@capacitor/preferences` wrapper with localStorage fallback for browser dev | Native-safe path per security guidance; dev ergonomics |
| Passwords | bcryptjs cost 12 | Pure JS, no native build friction |
| Validation | zod schemas at route boundary | Consistent 400 errors / field-level messages |
| Timezone | `SALON_TZ=Africa/Maputo`, app/DB session set accordingly; store wall-clock `DATETIME` | Confirmed in PROJECT/STATE context; `TIMESTAMP` avoided |
| Money types | `DECIMAL(10,2)` from day one | Pitfall prevention (no FLOAT) |
| API base URL | `VITE_API_BASE_URL` required at build time; central `web/src/config.js` throws if missing | Prevent APK localhost trap later |
| Dev DB | Docker `mysql:8.4` via `docker-compose.yml` (root no password local socket/passwordless dev as requested) | Reproducible local setup; never `mysql:latest` |

## Schema (Phase 1 migrations)

Minimum tables to satisfy AUTH and unblock later phases:

1. **users**
   - `id` (PK, bigint/unsigned auto inc)
   - `name` varchar
   - `phone` varchar (contacto) — unique login identifier candidate
   - `email` varchar nullable (future-proof, optional now)
   - `password_hash` varchar
   - `role` enum('client','admin') default 'client' — **never client-settable on register**
   - `created_at`, `updated_at` DATETIME
   - indexes: unique(phone) (and/or email if used)

2. **refresh_tokens**
   - `id` PK
   - `user_id` FK -> users.id (cascade delete)
   - `token_hash` (store hash, not raw token) or token jti identifier
   - `expires_at` DATETIME
   - `revoked_at` DATETIME nullable
   - `created_at` DATETIME
   - indexes: user_id, token_hash/jti, expires_at

3. **services** (schema stub now; CRUD in Phase 2)
   - `id`, `name`, `description`, `price` DECIMAL(10,2), `duration_minutes` int, `image_path` nullable, `active` bool default true, timestamps

4. **appointments** (schema stub now; booking in Phase 2)
   - `id`, `user_id` FK, `service_id` FK
   - `starts_at` DATETIME, `ends_at` DATETIME
   - `status` enum('pendente','confirmada','rejeitada','cancelada','concluida')
   - `price_at_booking` DECIMAL(10,2), `duration_at_booking` int
   - `rejection_reason` varchar nullable
   - timestamps
   - indexes: `(starts_at, ends_at)`/`(status, starts_at)`, `(user_id, starts_at)`

5. **reviews** (schema stub now; Phase 3)
   - `id`, `appointment_id` FK unique, `user_id` FK, `rating` tinyint, `comment` text, timestamps

> Stubbing later-phase tables in Phase 1 avoids migration churn but keep columns minimal and aligned with research (snapshots, ENUM status, DECIMAL).

## API Surface (Phase 1)

- `POST /api/auth/register` — client signup (name, phone/contact, password) → tokens + user (role forced `client`)
- `POST /api/auth/login` — credentials → tokens + user
- `POST /api/auth/refresh` — rotate refresh token
- `POST /api/auth/logout` — revoke current refresh/session
- `GET /api/auth/me` — authenticated user profile
- `POST /api/admin/users/:id/reset-password` — **admin only**; sets new password for client (AUTH-04)

Middleware: `authenticate` (Bearer JWT verify, attach `req.user`), `requireAdmin`.  
Security: helmet, cors allow-list, rate-limit on auth routes, no password logging.

## Frontend (Phase 1)

- Vuetify app scaffold (pt locale), router, Pinia auth store
- Views: Login, Registo, shell/layout with logout action reachable from any screen
- Axios instance + interceptors (attach access token, 401 refresh retry once)
- Route guards: guest-only for login/register, auth-required for app, admin-guarded area placeholder
- Persist session across reopen via Preferences-backed storage

## Risks / Watchouts

- **Express 5 specifics:** named wildcards, `req.body` undefined if not parsed — use `express.json()` and follow v5 docs.
- **zod v4 API:** use current v4 error formatting (don't copy v3 snippets).
- **Scaffold correctness:** use `npm create vuetify@latest` for web to avoid Vite 8 cascade-layer issues.
- **Admin bootstrap:** first admin user — provide a seed/migration/script or documented SQL for dev (since no admin self-register). Plan must include deterministic admin creation.
- **Non-interactive defaults:** choices above are reasonable; adjust in Phase 1 execution if implementation reveals issues.

## Verification focus for Phase 1 plans

- Register/login/logout flows work end-to-end.
- Token persists across app/web reload; refresh works.
- Client cannot access admin endpoint (403 from server, not just hidden UI).
- Admin can reset a client password and client logs in with new one.
- Migrations run cleanly on fresh MySQL 8.4 (`up`/`down` sane).
- `SALON_TZ`/DATETIME convention present in config/migrations.
