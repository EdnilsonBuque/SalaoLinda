<!-- GSD:project-start source:PROJECT.md -->
## Project

**Salão Linda - Gestão e Marcações**

Aplicação móvel (APK Android) para o Salão Linda, um salão de beleza de bairro que faz cortes, tranças, manicure, pedicure e maquilhagem. Clientes criam conta, veem serviços (foto, preço, duração), marcam hora e avaliam o atendimento; a dona (admin) gere serviços, confirma/rejeita marcações e acompanha os ganhos do dia/semana. As marcações deixam de ser por chamada/WhatsApp/boca e passam a ter registo organizado.

**Core Value:** O cliente marca o seu serviço no telemóvel sem espera confusa e a dona sabe no fim do dia quanto faturou — sem isso, o produto não serve.

### Constraints

- **Tech stack**: Vue.js + Vuetify (frontend), Capacitor (APK Android), Node.js + Express + MySQL (backend/API), JavaScript/HTML/CSS — pedido explícito do utilizador
- **Banco de dados**: MySQL 8.4 LTS — pedido explícito ("Bd: MySQL para um apk android"); dev local sem password (root via socket)
- **Fuso horário do salão**: `Africa/Maputo` (confirmado pelo utilizador) — modelo wall-clock + IANA, datas `DATE`/`DATETIME` (não `TIMESTAMP`), `TZ` fixado no servidor
- **UI**: "lindo design" — interface cuidada, moderna, mobile-first, em português
- **Ambiente**: projeto greenfield, sem código existente
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### Core Technologies
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Node.js | **26.x LTS** (26.13.1 current LTS) | Backend runtime | Current LTS per nodejs.org (Nov 2026). Capacitor 8 requires Node ≥22, Express 5 requires ≥18 — 26 LTS satisfies both with years of support. Node 24.x LTS also acceptable. **HIGH** |
| Vue | **3.5.45** | Frontend framework | Current stable. 3.6.0 is still RC (`3.6.0-rc.15`) — do not build on an RC. Vuetify 4 peers on `^3.5.0`. **HIGH** |
| Vuetify | **4.3.3** | UI component library | Current stable major (v4 released Feb 2026, actively patched — 4.3.3 published 2026-11-09). Material Design 3, weekly releases. Greenfield project should start on v4, not v3. Gives the "lindo design" requirement for free: cards, lists, dialogs, date/time pickers, bottom-nav mobile patterns. **HIGH** |
| Vite | **8.3.8** + `@vitejs/plugin-vue` 6.0.11 + `vite-plugin-vuetify` 2.1.3 | Build/dev server | Current stable; `@vitejs/plugin-vue` 6 peers explicitly support Vite `^8.0.0`. **HIGH** |
| Capacitor | **8.6.2** (`core` + `cli` + `android`) | Android APK wrapper | Current stable (8.6.2 published 2026-11-12). Requires Android Studio Otter 2025.2.1+, AGP 8.13, Gradle 8.14.3, minSdk 24 (Android 7+, ~99% market), compileSdk/targetSdk 36. A v9 is in "next" docs — do not chase it. **HIGH** |
| Express | **5.3.0** | REST API framework | Current stable (`latest` tag). Express 4 is past its security-maintenance window (schedule ended Oct 2026) and gets no async error handling: Express 5 auto-forwards rejected promises from `async` handlers to your error middleware — no `try/catch` or `express-async-errors` wrapper per route. **HIGH** |
| MySQL | **8.4 LTS** (8.4.13) | Database | 8.0 is EOL (April 2026, last release 8.0.46). 8.4 is a supported LTS (Premier to April 2029) and the newest GA major on RDS/Aurora — maximum host compatibility. 9.7 LTS also fine for self-managed. Use Docker tag `mysql:8.4`, never `mysql:latest` (Innovation track, changes quarterly). **HIGH** |
| mysql2 | **3.24.6** | MySQL driver | Pure-JS driver, promise API (`pool.promise()`), supports `caching_sha2_password` (MySQL 8 default). Already chosen in PROJECT.md Key Decisions. Knex uses it as its MySQL client, so both decisions coexist. **HIGH** |
| Knex | **3.3.0** | Query builder + migration runner | Actively maintained (3.3.0 June 2026). Solves the two things a greenfield app actually needs: (1) versioned migrations (`knex migrate:latest`), (2) safe parameterized queries without string concatenation. Drop down to `knex.raw` for the dashboard aggregates. See decision §4.2. **MEDIUM-HIGH** |
### Supporting Libraries
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vue-router | 5.5.1 | Client routing | Always. Peers on vue `^3.5.34` — compatible with 3.5.45. Route guards for auth/role (admin routes). |
| pinia | 4.1.0 | State management | Auth state (user, role, tokens) + cached services/bookings. Only store what must survive navigation. |
| axios | 1.21.1 | HTTP client | Always. One interceptor attaches `Authorization: Bearer`, one retries a 401 once after token refresh, one normalizes errors to pt messages. (Plain `fetch` works too — see Alternatives.) |
| jsonwebtoken | 9.0.3 | JWT sign/verify (HS256) | Server-side auth tokens. 9.0.3 published 2025-12-04 — maintained. Use HS256 with a long random `JWT_SECRET` from env. |
| bcryptjs | 3.0.3 | Password hashing | Always. Pure JS — no native compilation (this is why `bcryptjs` over `bcrypt`: keeps the whole stack `npm install`-able anywhere). Cost factor 12. |
| zod | 4.6.7 | Request validation | Validate `req.body`/`params`/`query` at the route boundary with one schema per endpoint. See decision §4.3. |
| multer | 2.5.0 | Multipart file upload | Service photo uploads only. **Must be 2.x** — npm's own deprecation notice on 1.x: "impacted by a number of vulnerabilities, which have been patched in 2.x." |
| dayjs | 1.11.23 | Date/time handling | Booking dates, slot generation, display formatting. Plugins: `customParseFormat`, `utc`, `timezone`, `weekday`. Built-in `pt` locale. See decision §4.5. |
| @capacitor/camera | 8.2.6 | Photo pick/capture | Admin picks service photos from gallery (Android Photo Picker, no storage permission gymnastics). |
| @capacitor/preferences | 8.0.1 | Native key-value storage | Persist JWT/refresh token. Native API, survives WebView data clears. |
| helmet | 8.3.0 | Security headers | `app.use(helmet())` — one line, sensible CSP/headers for an API. |
| cors | 2.8.6 | CORS middleware | Explicit allow-list (see §8). Needed if the WebView uses plain `fetch`; also for any browser dev access. |
| express-rate-limit | 8.7.4 | Brute-force protection | Login/register endpoints: ~10 requests / 15 min / IP. |
| morgan | 1.12.1 | Request logging | Dev only (`morgan('dev')`). |
| dotenv | 18.0.10 | `.env` loading | Or skip entirely: Node ≥20 supports `node --env-file=.env src/server.js` (zero-dep). Either is fine; pick one and be consistent. |
| sharp *(optional)* | 0.35.5 | Server-side image resize | Only if client-side downscaling proves insufficient (see §4.4). Adds a native binary — off by default to keep the stack pure JS. |
### Development Tools
| Tool | Purpose | Notes |
|------|---------|-------|
| `create-vuetify` 3.2.1 (`npm create vuetify@latest`) | Project scaffold | **Use this to start the web app.** Vuetify's Sept 2026 blog: Vite 8 no longer guarantees CSS import order in production, breaking Vuetify 4 cascade layers — fixed *for projects matching `@vuetify/cli` templates*. Hand-rolled scaffolds hit "wrong colors/wrong text size" bugs that take hours to diagnose. |
| ESLint 10.15 + `eslint-plugin-vue` 10.12.1 + Prettier 3.10.1 | Lint/format | Flat config. Standard for Vue apps. |
| Vitest 5.1.0 + `@vue/test-utils` 2.6.0 | Frontend tests | Only where it pays: component logic for slot rendering. |
| supertest 7.3.2 | API integration tests | Highest-value tests for this project: auth flow, booking overlap rejection, admin role guard. |
| `node --watch` (built-in) or nodemon 3.1.14 | Dev auto-restart | `node --watch src/server.js` = zero-dep. nodemon if you want glob filtering. |
| Android Studio Otter 2025.2.1+ | APK build | Required by Capacitor 8. Run AGP Upgrade Assistant → AGP 8.13, Gradle 8.14.3. `npx cap open android` or `npx cap run android`. |
## Domain Decisions (the five questions)
### §4.1 Auth: JWT (not sessions) — access + refresh
- `POST /api/auth/register`, `POST /api/auth/login` → `{ accessToken, refreshToken, user }`
- `POST /api/auth/refresh` → rotates refresh token (old one invalidated; reuse = kill session)
- Middleware chain: `authenticate` (verify JWT, attach `req.user`) → `requireAdmin`
- Passwords: bcryptjs cost 12; never log them; rate-limit auth routes
- **Device storage:** `@capacitor/preferences`, *not* `localStorage` — Capacitor's security guide directs sensitive tokens toward Keychain/Keystore-backed storage; Preferences is the portable plugin choice (on Android it maps to SharedPreferences — acceptable here because the access token is short-lived and the refresh token is revocable server-side). (HIGH — capacitorjs.com/docs/guides/security)
- **HTTPS is mandatory:** Android blocks cleartext by default (`server.cleartext: false` default; API 28+ enforces it). Never ship the APK pointed at `http://`.
### §4.2 Query layer: Knex over mysql2 (not Prisma, not raw-only)
| Option | Verdict | Reasoning |
|--------|---------|-----------|
| **Knex + mysql2** | ✅ **Chosen** | Migrations for free on a greenfield schema (users, services, bookings, reviews, refresh_tokens — the schema *will* shift week to week). Parameterized queries by default. Transactions for the double-booking-critical booking insert. Zero codegen, zero build step, works in plain JS. Actively maintained (3.3.0, June 2026). |
| Prisma 7 | ❌ Not now | The facts (verified in Prisma's v7 upgrade guide): driver adapters are now **mandatory** (MySQL needs `@prisma/adapter-mariadb` + `mariadb`), config moved to `prisma.config.ts`, the generated client **must** live at an explicit path outside `node_modules`, env loading is manual, auto-seeding was removed — and **Prisma 8 is already at RC** (`8.0.0-rc.33`), meaning major churn on top of major churn. Crucially, Prisma's headline benefit is TypeScript type-safety — and this project is explicitly JavaScript, so you pay all the toolchain cost and collect none of the payoff. (HIGH — prisma.io upgrade docs + npm) |
| Raw mysql2 only | ⚠️ Acceptable fallback | Fewer deps, full control. Cost: hand-rolling a migration runner (a real distraction in YOLO mode) and more verbose CRUD. Choose this only if the team is confident writing SQL daily. |
### §4.3 Validation: zod
- Single library for body + params + query (`z.object` schemas composed with `.extend()`).
- Error output maps cleanly to Vuetify's form validation (`fieldErrors` from the 400 JSON).
- v4 is the current major (published Oct 2026) — fast, tree-shakeable, and the ecosystem default in 2025/2026.
- Same schemas can be reused to parse query filters on `/api/bookings?from=&to=`.
- Alternative: `express-validator@7.3.2` (middleware-style, classic Express) — fine, but zod is the more future-proof, composable default.
### §4.4 File upload: service photos
### §4.5 Date/time for bookings
- **Column type: `DATETIME`, not `TIMESTAMP`.** `TIMESTAMP` converts through the session time zone on read/write — a classic source of ±1–2h booking drift. A single physical salon has exactly one wall-clock time; store naive local datetimes (`starts_at`, `ends_at`) and everything (dashboard sums, day boundaries, "today's queue") is trivial. (MEDIUM-HIGH — well-known MySQL behavior; recommendation is design judgment)
- **One `SALON_TZ` env var** (likely `Europe/Lisbon` given pt-PT wording — *confirm with the user*; also confirm UTC offset/DST expectations). Convert only at display edges if ever needed (`dayjs.tz`). The salon is single-location, so no multi-timezone math exists in this product.
- **Slot generation lives on the server:** opening hours − existing bookings (`pendente`+`confirmada`) − past time − minimum lead time → array of `{ start, end }` for a given date. The client only *renders* these buttons. On submit, the server re-validates the slot is still free **inside a transaction with `SELECT ... FOR UPDATE`** (or serializable isolation) — never trust a client-supplied time, or two clients double-book the same chair.
- **Overlap predicate:** `WHERE starts_at < :newEnd AND ends_at > :newStart AND status IN ('pendente','confirmada')`.
- **UI:** `VDatePicker` (core component) for the day, then a grid of slot buttons showing `HH:mm` — better salon UX than a clock picker (it also makes availability visible at a glance, which is half the product's value). `VTimePicker` *is* available (promoted from labs to core in v3.9, July 2025) if free-form times are ever wanted; `VTimeInput` is still Labs (v4.3.0+) — avoid Labs components for the booking flow. (HIGH — Vuetify release notes)
- **Formatting:** `dayjs.locale('pt')` for `DD [de] MMMM`-style labels; Vuetify locale `pt` exists and verified shipped at `vuetify/lib/locale/pt.js` — set `locale: 'pt'` in `createVuetify`. (HIGH)
## Installation
# ── Web app (scaffold, then add Capacitor) ─────────────────
# Core (scaffold already includes vue/vuetify/vite — verify versions)
# Capacitor 8 (Android)
# ── API ────────────────────────────────────────────────────
# ── Dev tooling (both packages) ────────────────────────────
# ── Database (Docker) ──────────────────────────────────────
# ── Build + APK ────────────────────────────────────────────
# Release: set android.buildOptions.releaseType = 'APK' in capacitor.config
# (default is AAB; APK is what "gerar APK" means for sideloading)
## Alternatives Considered
| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Knex + mysql2 | Prisma 7 | Only if the project migrates to TypeScript — that's when Prisma's generated types pay for the adapter/config/codegen overhead. |
| Knex + mysql2 | Raw mysql2 + hand-rolled `.sql` migration runner | Team wants zero query-builder abstraction and is comfortable writing all SQL. |
| JWT access+refresh | Single long-lived JWT (7–14 d) | MVP speed first (fits YOLO coarse mode); revisit if token theft becomes a concern. |
| JWT | Session cookies + `SameSite` juggling | Never for the APK; only if a future browser-based admin web app demanded it. |
| axios | Native `fetch` + small wrapper | If minimizing deps matters more than the 401-retry interceptor conveniences. |
| dayjs | date-fns 4.4.0 | If you prefer tree-shakeable pure functions over the moment-style chained API. Both are current; luxon is heavier than this app needs. |
| bcryptjs | bcrypt (native) | If hashing throughput ever mattered (it won't at this scale); native build breaks more CI environments. |
| Client canvas downscale | sharp 0.35.5 server-side | If server CPU/bandwidth is cheaper to you than shipping slightly imperfect JPEGs. |
| zod | express-validator 7.3.2 / joi | If you prefer middleware-chain validation over schema-first parsing. |
| `node --env-file` / dotenv | — | Either; just don't invent a third env-loading mechanism. |
| Capacitor `CapacitorHttp` flag (see §8) | Server-side CORS allow-list only | If you want native requests to bypass CORS entirely vs. configuring origins. |
## What NOT to Use
| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **multer 1.x** | npm deprecation notice is explicit: "Multer 1.x is impacted by a number of vulnerabilities, which have been patched in 2.x." | `multer@^2.5.0` |
| **Express 4** | Security-maintenance window ended (schedule: no earlier than Oct 2026); no async error handling → `try/catch` boilerplate in every handler. | `express@^5.3.0` |
| **Prisma / TypeORM / Sequelize** | Prisma 7 = mandatory driver adapters + `prisma.config.ts` + out-of-tree generated client + Prisma 8 RC already pending; TypeORM/Sequelize are heavier and TS-friendly first. Overhead with no type-safety payoff in a JS project. | Knex (§4.2) |
| **Session cookies for the APK** | WebView origin `https://localhost` ≠ API origin → cross-site cookie rules, Capacitor cookie-store quirks, shared server-side session store. | JWT Bearer tokens (§4.1) |
| **`localStorage` for tokens** | Capacitor security guidance pushes sensitive tokens to Keychain/Keystore-backed storage; WebView storage is script-accessible and can be cleared. | `@capacitor/preferences` |
| **Moment.js** | Deprecated upstream, mutable globals, 2× the size, no plugin model. | dayjs |
| **vue-i18n** | Single locale (pt). An i18n layer for one language is pure overhead — hardcode pt strings in components. (Vuetify's own component strings: `locale: 'pt'`.) | Hardcoded pt strings |
| **`@capacitor/http` npm package** | Version 0.0.2 — dead package. (The *core config flag* `plugins.CapacitorHttp.enabled` is alive and different — see §8.) | Core `CapacitorHttp` config flag, or server CORS |
| **MySQL 8.0 / `mysql:latest`** | 8.0 EOL April 2026 (no more Oracle fixes, incl. security). `mysql:latest` tracks the Innovation train (now calendar-versioned 26.x) which changes behavior quarterly. | `mysql:8.4` image (LTS) |
| **Firebase / Supabase / any BaaS** | Explicitly ruled out in PROJECT.md — MySQL is user-confirmed. | Node/Express + MySQL |
| **Vue 3.6 RC, Capacitor 9 ("next"), Vuetify Labs components in booking flow** | Pre-release code under a YOLO schedule = debugging someone else's TODOs. Vuetify Labs explicitly warns APIs will break in patch releases. | Current stable only (Vue 3.5.45, Capacitor 8.6.2, core Vuetify components) |
| **Vite ≤7 with hand-rolled config** | Vuetify 4's cascade layers depend on import order that broke with Vite 8; their fix is aligned to `create-vuetify` templates. Rebuilding that by hand reintroduces the bug. | `npm create vuetify@latest` |
## Stack Patterns by Variant
- `capacitor.config`: `plugins.CapacitorHttp.enabled = true` → Capacitor overrides native `fetch`/`XMLHttpRequest`, routing through the native HTTP stack — CORS becomes a non-issue on-device. (HIGH — capacitorjs.com/docs/config)
- Still configure `cors` with an explicit origin allow-list (`https://localhost` for the WebView, your dev origins for browser testing) as defense in depth.
- Plain `fetch`/axios from the WebView enforces CORS → the API must return `Access-Control-Allow-Origin` for `https://localhost` (Android scheme default) and allow the `Authorization` header + `multipart/form-data` preflight. Same code serves a future browser admin panel.
- Issue one 14-day JWT, skip the refresh table/endpoint/interceptor. Everything else in §4.1 stays.
- Tighten the canvas cap to 1280px / quality 0.7 before adding any server-side processing.
- Indexes: `bookings(starts_at)`, `bookings(user_id)`, `bookings(status)`. That's it — no cache layer, no Redis, no message queue for a single-salon product. (Anti-over-engineering guard.)
## Version Compatibility
| Package | Compatible With | Notes |
|---------|-----------------|-------|
| vuetify@4.3.3 | vue@^3.5, vite-plugin-vuetify@≥2.1, vite@≥5 | Peers verified on npm. Scaffold with create-vuetify to dodge the Vite 8 CSS-layer-order issue (Vuetify blog, Sept 2026). |
| @vitejs/plugin-vue@6.0.11 | vite@^5–^8 | Explicit `^8.0.0` in peer range. |
| vue-router@5.5.1 | vue@^3.5.34 (3.5.45 ✅), pinia@^3–^4, vite@^7.3\|\|^8 | Peers verified on npm. |
| pinia@4.1.0 | vue@^3.5.11 | Peers verified on npm. |
| @capacitor/*@8.x | All Capacitor plugins must be **major 8** (camera 8.2.6, preferences 8.0.1, status-bar 8.0.4, splash-screen 8.0.2) | Mixing majors breaks `npx cap sync`. |
| Capacitor 8 toolchain | Node ≥22 (Node 26 LTS ✅), Android Studio Otter 2025.2.1+, AGP 8.13, Gradle 8.14.3, minSdk 24, compileSdk 36 | From official v7→v8 upgrade guide. |
| express@5.3.0 | Node ≥18 | Route syntax changed: wildcards must be named (`/*splat`), no regex-in-string params, `req.body` undefined when unparsed. |
| knex@3.3.0 | mysql2@3.x (install both) | Knex delegates the MySQL dialect to mysql2. |
| jsonwebtoken@9.0.3 | CommonJS or ESM | Works with `"type": "module"` via default interop. |
| zod@4.6.7 | Node ≥18 | v4 major — don't copy v3 recipes blindly (error format API changed). |
| multer@2.5.0 | express@5 | v2 API differs from old v1 examples online — follow current docs, not 2019 blog posts. |
## Confidence Assessment
| Area | Confidence | Basis |
|------|------------|-------|
| Package versions (all rows) | **HIGH** | Queried npm registry directly 2026-11-16; cross-checked GitHub release tags (Vuetify v4.3.3, Capacitor 8.6.2, Express v5.3.0). |
| Node/MySQL/Capacitor runtime requirements | **HIGH** | nodejs.org, Capacitor official upgrade guide, Oracle MySQL release blogs. |
| JWT-not-sessions rationale | **HIGH** | Capacitor config/security docs (androidScheme default `https`, token-storage guidance) + standard mobile REST practice. |
| Access+refresh specifics (30 min / 30 d / rotation) | **MEDIUM** | Standard pattern, not mandated by docs — durations are judgment; simplify freely per §4.1. |
| Knex over Prisma | **MEDIUM-HIGH** | Prisma 7 breaking changes verified in official upgrade guide; the "JS project ⇒ Prisma's types don't pay" argument is reasoned judgment. |
| Booking slot/transaction design | **MEDIUM** | Sound concurrency practice, but untested against this schema — schema design (ARCHITECTURE.md) may adjust the locking approach. |
| Salon timezone (Europe/Lisbon?) | **LOW** | pt-PT wording suggests Portugal, but the user hasn't confirmed country. **Resolve before booking logic lands.** |
| Vuetify 4 + Vite 8 caveat | **HIGH** | Vuetify official blog (Sept 2026) + upgrade guide. |
| Client-side canvas downscale behavior in Capacitor WebView | **MEDIUM-HIGH** | Standard technique; exact `createImageBitmap` orientation behavior should get a smoke test on a real device in the APK phase. |
## Sources
- npm registry queries (2026-11-16) — every version number in this document (`npm view <pkg> version peerDependencies time.modified`)
- https://capacitorjs.com/docs/updating/8-0 — Capacitor 8 breaking changes, Node 22+, Android Studio Otter, AGP/Gradle/minSdk requirements (HIGH)
- https://capacitorjs.com/docs/config — `androidScheme` default `https`, `CapacitorHttp` plugin flag, `releaseType: 'APK'`, cleartext default (HIGH)
- https://capacitorjs.com/docs/guides/security — token storage guidance, HTTPS-only, CSP (HIGH)
- https://capacitorjs.com/docs/android — API 24+, WebView requirements (HIGH)
- https://vuetifyjs.com/en/getting-started/upgrade-guide/ + /blog/august-2026-update + /blog/september-2026-update — v4 breaking changes, Vite 8 CSS layer-order fix scoped to CLI templates (HIGH)
- Vuetify release notes v3.9.0 (2025-07-08) — VTimePicker promoted to core; labs inventory (HIGH)
- https://unpkg.com/vuetify@4.3.3/?meta — verified `lib/locale/pt.js` exists (HIGH)
- https://expressjs.com/en/guide/migrating-5 + /en/5x/guide/error-handling — Express 5 async error handling, Node ≥18 (HIGH)
- https://expressjs.com/2024/10/15/v5-release/ — Express 5 release (2024-10-15), Express 4 maintenance status (HIGH)
- https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7 + prisma/orm GitHub release 7.0.0 — mandatory driver adapters, prisma.config.ts, required output path (HIGH)
- https://blogs.oracle.com/mysql/mysql-october-2026-ga-releases-now-available + oracle mysql release-model blog — MySQL 8.4/9.7 LTS vs Innovation, 8.0 EOL (HIGH)
- npm deprecation notice on `multer@1.4.5-lts.1` — "upgrade to the latest 2.x" (HIGH)
- https://nodejs.org/en/about — current LTS v26.13.1 (HIGH)
- Capacitor v9 present under `/docs/next/` — v9 unreleased; v8 is current stable (MEDIUM)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
