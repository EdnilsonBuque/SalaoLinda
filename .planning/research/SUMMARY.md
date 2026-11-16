# Project Research Summary

**Project:** Salão Linda - Gestão e Marcações (Android APK)
**Domain:** Single-salon booking/management mobile app (Vue 3 + Vuetify + Capacitor ↔ Node/Express + MySQL)
**Researched:** 2026-11-16
**Confidence:** HIGH

## Executive Summary

Salão Linda is a single-salon, single-admin booking app whose entire value proposition is one loop: client books → dona approves → service happens → money is recorded → client rates. Experts build this as a **layered monolith** — a Vue 3 + Vuetify SPA wrapped by Capacitor 8 into an APK, talking over HTTPS REST/JWT to an Express 5 + MySQL 8.4 API — with exactly three places where real engineering lives: the **double-booking guard** (transactional overlap check, because MySQL has no exclusion constraints), the **appointment state machine** (server-side, role-gated), and the **schema** (DECIMAL money, price snapshots, status discipline, timezone convention). Everything else — CRUD screens, lists, dashboards — is well-trodden territory. The research recommends a pure-JS stack (Knex + mysql2, zod, dayjs, bcryptjs, multer 2) scaffolded with `npm create vuetify@latest` to dodge the Vite 8/Vuetify 4 cascade-layer bug, and explicitly rejects Prisma, sessions, marketplace/payments/chat features, and pre-release versions (Vue 3.6 RC, Capacitor 9).

The recommended approach is **depth on one loop, not breadth**: the request-approval model is a feature (correct for one owner with variable-duration services like 3h braids), the in-app "fila" is the ownable differentiator against incumbents that bury waitlists in paid tiers or sell kiosk hardware, and the zero-commission/no-marketplace positioning directly answers the loudest owner complaint about Booksy/Fresha. MVP is defined tightly in FEATURES.md (12 items), with queue visibility, reschedule, reject reasons, and client history deferred to v1.x behind explicit triggers.

The key risks, in order: **(1) double-booking races** — retrofitting locks later is a rewrite of the write path, so the booking endpoint must be race-safe from day one (transaction + `SELECT ... FOR UPDATE` or per-day `GET_LOCK`, 409 on conflict, concurrency test required); **(2) schema irreversibility** — money as FLOAT, missing price snapshots, hard DELETEs, and an undocumented timezone convention are cheap to prevent and expensive to recover; **(3) APK packaging traps** — cleartext HTTP blocking, a build-frozen `VITE_API_BASE_URL` pointing at localhost, and Android 15 edge-to-edge/keyboard issues only appear on a physical device, so a device smoke test is a release gate. One open question must be resolved before booking logic lands: **the salon's timezone** (pt-PT wording suggests `Europe/Lisbon`, but the user hasn't confirmed).

## Key Findings

### Recommended Stack

Full details in [STACK.md](STACK.md). Pure-JS end to end — every version verified against the npm registry on 2026-11-16; no native build toolchain beyond the MySQL driver. Scaffold the web app with `npm create vuetify@latest` (hand-rolled scaffolds reintroduce the Vite 8 CSS import-order bug that breaks Vuetify 4 cascade layers).

**Core technologies:**
- **Node 26 LTS + Express 5.3.0** — current LTS; Express 5 auto-forwards rejected promises from async handlers (Express 4's security window ended Oct 2026)
- **Vue 3.5.45 + Vuetify 4.3.3 + Vite 8.3.8** — current stable all; Vuetify 4 gives the "lindo design" requirement for free (Material 3, date picker, bottom-nav, `locale: 'pt'`)
- **Capacitor 8.6.2** (`core`+`cli`+`android`, all plugins major 8) — Android Studio Otter 2025.2.1+, AGP 8.13, minSdk 24; `releaseType: 'APK'` for sideloading
- **MySQL 8.4 LTS (`mysql:8.4` Docker tag, never `latest`)** — 8.0 is EOL; + **mysql2 3.24.6** + **Knex 3.3.0** (query builder + migrations; Prisma rejected: driver adapters mandatory in v7, v8 RC pending, type-safety payoff void in a JS project)
- **JWT access+refresh** (jsonwebtoken 9, HS256) + **@capacitor/preferences** for token storage (not localStorage) — WebView origin `https://localhost` ≠ API origin, so sessions/cookies are the wrong tool
- **zod 4** (validation), **multer 2** (must be 2.x — 1.x deprecated for vulnerabilities), **dayjs** (pt locale), **bcryptjs** (pure JS), helmet/cors/express-rate-limit
- Avoid: moment, vue-i18n (single locale), Prisma/TypeORM, session cookies, `@capacitor/http` npm package (dead), Vuetify Labs components in the booking flow

### Expected Features

Full analysis in [FEATURES.md](FEATURES.md). MVP validates the core loop; competitor evidence from Booksy/Fresha/Square plus small-salon tools.

**Must have (P1, launch with):**
- Login/Registo with roles (cliente/dona) — everything is gated on identity
- Service CRUD (admin) + service catalog view (photo, price, duration) — answers pain #1 (no price/availability info)
- Availability/slot engine — hardest logic; no collisions ever
- Booking flow with pending state (service → date → time → *pedido enviado*)
- Status lifecycle (pendente/confirmada/rejeitada/cancelada/concluída) — single source of truth for everything downstream
- Admin confirm/reject inbox — the approval model itself
- Minhas Marcações + cancel — escape hatch or clients revert to WhatsApp
- Revenue dashboard (day/week) — Core Value #2 for the dona
- Post-service rating (gated on completed, once) + Today schedule view (admin) + APK delivery

**Should have (differentiators / v1.x):**
- In-app "fila" visibility (status of today's line — not a kiosk/TV system) — *note: PROJECT.md lists this as Active; FEATURES.md recommends deferring until first real bookings. Reconcile in requirements; ARCHITECTURE shows it's cheap (read-only projection of today's schedule), so including it in MVP is low-risk*
- Approval model positioned as a feature; private ratings (no moderation burden); portfolio photos; booking history/client card; reject reason (canned); reschedule; push notifications; one post-completion rebooking nudge

**Defer (v2+) / anti-features:**
- Defer: SMS reminders, popular-services insight, deposits/no-show fees, kiosk/TV, shareable salon page
- Anti-features (reject permanently): online payments, marketplace/discovery, real-time chat, multi-staff/payroll, marketing campaigns, forced registration before browsing availability, POS/inventory, public reviews with moderation

### Architecture Approach

Full detail in [ARCHITECTURE.md](ARCHITECTURE.md). Three strict layers — routes (HTTP only, zod at the boundary) → `services/` (pure business logic: availability engine, state machine, revenue, images) → data (mysql2 pool, parameterized SQL). Single monolith, no websockets (polling/pull-to-refresh), no external services (no payments/push/maps).

**Major components:**
1. **Availability engine** (`services/availability.js`) — greedy slot generation over opening hours in duration steps, filtering past time + pending/confirmed overlaps; **DB-side guarantee** via transaction + `SELECT ... FOR UPDATE` (or per-day `GET_LOCK`) at booking time; client filtering is UX only
2. **State machine** (`services/stateMachine.js`) — transition map `pending → confirmed/rejected/cancelled`, `confirmed → completed/cancelled`; role guards (only admin completes); pending blocks availability; revenue counts only `completed`
3. **Price snapshot** — `appointments.price_at_booking` copied at booking; revenue sums the snapshot so price edits never rewrite history
4. **Auth middleware** — `authenticate` (JWT verify, pinned HS256) → `requireRole('admin')`; signup hardcodes client role
5. **Image storage** — client canvas downscale (~1600px, q0.8) → multer 2 disk `uploads/services/` → relative path in DB → `express.static` (no BLOBs, sharp deferred)
6. **Frontend** — axios instance (one base URL, JWT interceptor, 401→refresh→retry), Pinia stores (auth/services/appointments), router guards, views map 1:1 to requirements

**Data model:** `users` (role ENUM), `services` (DECIMAL price, duration, active soft-delete), `appointments` (start/end DATETIME, status ENUM, price snapshot, index on date+status), `reviews` (UNIQUE appointment_id = one review each).

### Critical Pitfalls

Full catalog in [PITFALLS.md](PITFALLS.md) (8 critical + debt/integration/perf/security/UX tables + a "looks done but isn't" checklist).

1. **Double-booking race** — check-then-insert without a lock fails at two-tap concurrency; a UNIQUE index on `starts_at` can't see interval overlaps. *Prevent:* one transaction, `SELECT ... FOR UPDATE` on the resource row + interval overlap check, 409 → "Este horário acabou de ser preenchido" + refreshed slots. Verify with two concurrent requests (one 200, one 409). Never accept client-supplied price/time without server revalidation.
2. **Timezone/date handling** — ambient-zone date math passes on a dev laptop and breaks on a UTC server; DST drifts slots an hour. *Prevent:* document the convention on day one, one IANA zone (`SALON_TZ` + `TZ=` env), DATETIME (not TIMESTAMP) salon wall-clock, never `new Date('...T...')` without offset for business logic.
3. **APK network config** — cleartext HTTP blocked (API 28+), `VITE_API_BASE_URL` frozen at build time pointing at localhost, leftover `server.url` live-reload config. *Prevent:* HTTPS backend ideally; build-time guard that throws if the env var is missing; central `src/config.js`; never commit `server.url`; **release APK smoke test on a physical device**.
4. **Admin auth only in the frontend** — route guards aren't security; `role` accepted at signup; `jwt.decode` instead of `verify`. *Prevent:* server-side `authenticate` + `requireRole('admin')` on every admin route, hardcode signup role, rate-limited login, IDOR scoping by `req.user.id`, 401/403 negative tests.
5. **MySQL schema mistakes** — FLOAT money, no price snapshot, unindexed overlap queries, free-text status, hard DELETE of bookings. *Prevent:* DECIMAL(10,2), snapshot price+duration, composite indexes `(user_id, starts_at)` and `(status, starts_at)`, ENUM status, cancel = status transition.
6. **Mobile-native UX** — back button kills the app instead of closing dialogs; keyboard covers the submit button; Android 15 edge-to-edge puts the app bar under the clock (legacy StatusBar fixes are no-ops). *Prevent:* global back handler (overlay → history.back → minimize), `viewport-fit=cover` + safe-area padding from phase 1, `@capacitor/keyboard`, test on a real device.
7. **JWT in localStorage** — OS reclaims WebView storage → silent logouts; origin changes wipe it. *Prevent:* `@capacitor/preferences`, short-lived access token (MVP simplification: one 7–14 day JWT allowed), one `authStorage` module.

## Implications for Roadmap

Based on research, suggested phase structure (PROJECT.md mandates **coarse granularity: 3–5 phases**, YOLO mode with plan-check + verification):

### Phase 1: Foundation — Scaffold, Schema & Auth
**Rationale:** ARCHITECTURE build order puts schema + auth first (everything depends on them); PITFALLS mapping calls schema "the earliest irreversible decision." Timezone and API-URL config are schema/config decisions that must precede table writing and any device build.
**Delivers:** Monorepo scaffold (`create-vuetify` + Express), MySQL 8.4 Docker, migrations (users/services/appointments/reviews), zod validation layer, JWT register/login + `authenticate`/`requireRole` middleware, token storage in Preferences, central `src/config.js` with build-time `VITE_API_BASE_URL` guard, pt locale + app shell with safe-area padding.
**Addresses:** FEATURES P1 — Login/Registo with roles.
**Avoids:** Pitfall 8 (DECIMAL/snapshot/indexes/ENUM/status discipline), Pitfall 6 (Preferences not localStorage), Pitfall 7 (server-side RBAC from day one), Pitfall 2 (timezone convention documented in schema), Pitfall 3 part 1 (API URL decided here).
**Research flags:** Reconciliation needed — ARCHITECTURE says "`.sql` migrations files" while STACK.md chose Knex; pick Knex migrations (can hold the same SQL) and note it in planning.

### Phase 2: Services & Booking Core (risk peak)
**Rationale:** ARCHITECTURE: availability + booking engine is "the riskiest component; do it while fresh, with the rest of the API stable." FEATURES dependency graph: Service CRUD → Catalog → Booking flow → Slot engine → Status lifecycle — everything downstream hangs off this. Risk descends after this phase.
**Delivers:** Service CRUD (admin, multer 2 photo upload + client canvas downscale), service catalog (client), slot generation endpoint, transactional booking write (overlap check + lock, 409 path), server-side state machine, booking flow UI (VDatePicker → slot button grid), Minhas Marcações + cancel, admin confirm/reject inbox.
**Addresses:** FEATURES P1 — Service CRUD, catalog, availability engine, booking flow, status lifecycle, Minhas Marcações + cancel, admin inbox.
**Avoids:** Pitfall 1 (transaction + `FOR UPDATE`, concurrency test = verification gate), Pitfall 5-Anti-pattern (frontend-only validation), Pitfall 2 (server-side slot generation, no ambient-zone date math), security rule (server recomputes price; client sends only service_id + slot).
**Research flags:** **Needs `/gsd-plan-phase --research-phase`** — this is the phase FEATURES.md explicitly calls "the deepest research" (slot granularity, lock flavor FOR UPDATE vs GET_LOCK, buffer/lead-time rules, DST boundaries). STACK.md rates booking/transaction design only MEDIUM confidence.

### Phase 3: Dashboard, Ratings & Fila
**Rationale:** Pure projections over structures that already exist (ARCHITECTURE: "risk descends after step 4"); all three require the completed-status data Phase 2 produces (revenue needs `completed`, ratings gate on `completed`, fila = today's confirmed appointments ordered by time).
**Delivers:** Today schedule view (admin), day/week revenue dashboard (`knex.raw` SUM over price snapshot, indexes from Phase 1), post-service rating (UNIQUE appointment_id), queue/"fila" visibility (read-only projection — no queue table).
**Addresses:** FEATURES P1 — revenue dashboard, today schedule, rating; PROJECT.md Active — fila. Optionally bundle v1.x reject-reason (canned) and reschedule here if the coarse roadmap wants them.
**Avoids:** Anti-pattern 3 (sum `price_at_booking`, never JOIN services.price), Pitfall 8 (sums in SQL, DECIMAL), Vuetify mobile traps (card layouts at 360px, not desktop data tables).
**Research flags:** Standard patterns (skip research-phase) — SQL aggregates and list screens are well documented; only reconcile the fila v1-vs-v1.x question during requirements.

### Phase 4: Android APK Packaging & Device Polish
**Rationale:** ARCHITECTURE build order last ("wraps the finished Vue app"); PITFALLS ordering rationale: "schema + auth + booking correctness are the irreversible decisions and must precede UI polish and APK packaging." The delivery form is part of MVP per FEATURES.
**Delivers:** `npx cap add android`, CapacitorHttp flag + CORS allow-list, `base: './'`, back-button handler, keyboard/edge-to-edge handling, `releaseType: 'APK'` release build, **device verification pass** (the full "looks done but isn't" checklist: physical device, real mobile data, concurrent booking 409, admin 403 with customer token, kill-app login persistence, back-button 3-case test).
**Addresses:** FEATURES P1 — APK via Capacitor; PROJECT.md constraint — "lindo design" verified on a real 360px screen.
**Avoids:** Pitfall 3 (cleartext/URL — release smoke test), Pitfall 4 (back button), Pitfall 5 (safe-area/keyboard — shell groundwork from Phase 1 makes this a test pass, not a retrofit).
**Research flags:** Needs light research at plan time only if device issues surface; standard Capacitor packaging patterns otherwise.

### Phase Ordering Rationale

- **Dependencies:** FEATURES dependency graph is a chain — Auth → Services → Booking → Status lifecycle → (dashboard, ratings, fila); ARCHITECTURE build order independently converges on the same sequence. Phase 1–4 follows it exactly.
- **Irreversibility:** schema, timezone convention, lock-based write path, and auth boundaries are decided before any UI polish; APK last because config/URL mistakes are only discoverable on-device and a wrong decision there means rebuild + redistribute.
- **Risk front-loading:** the only genuinely tricky components (concurrency, state machine) are Phase 2; phases 3–4 are queries and packaging over stable structures — matches PROJECT.md's "rapidez até ao APK" YOLO mode.
- **Pitfall coverage:** every critical pitfall maps to a prevention phase (PITFALLS.md §Pitfall-to-Phase Mapping) and each phase above names the pitfall it must avoid, with a verification item for plan-check.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (Booking Core):** explicitly flagged by FEATURES.md and STACK.md — lock strategy (FOR UPDATE vs GET_LOCK), slot step granularity (15/30 min), lead-time/buffer rules, 409 UX, concurrency tests. **Run `/gsd-plan-phase --research-phase 2`.**
- **Phase 1 (Foundation):** moderate — reconcile Knex-vs-.sql migrations, confirm Express 5 route syntax + zod v4 middleware pattern. Optional research phase.

Phases with standard patterns (skip research-phase):
- **Phase 3 (Dashboard/Ratings/Fila):** SQL aggregates, Vuetify lists, documented patterns.
- **Phase 4 (APK Packaging):** official Capacitor docs already verified in STACK/PITFALLS; only device testing remains.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | **HIGH** | Every version verified directly against npm registry + official Capacitor/Vuetify/Express/MySQL docs on 2026-11-16; design judgments (JWT durations, Knex choice) marked individually MEDIUM |
| Features | **MEDIUM-HIGH** | Official product pages for competitor claims; the exact "37% abandonment" and "60–70% rebooking" numbers are vendor/indicative — treat as directional |
| Architecture | **MEDIUM-HIGH** | Standard patterns verified (InnoDB locking docs, RBAC, state machines); lock-flavor performance untested against this schema |
| Pitfalls | **HIGH** | Each sourced from official docs (Capacitor, MySQL, Vite) or multiple agreeing independent sources |

**Overall confidence:** HIGH

### Gaps to Address

- **Salon timezone (LOW):** `Europe/Lisbon` inferred from pt-PT wording but unconfirmed. **Resolve with the user during requirements** — it's a schema decision (Phase 1) that booking logic depends on; also confirm UTC offset/DST expectations.
- **Fila scope conflict:** PROJECT.md lists "Fila visível" as Active; FEATURES.md defers it to v1.x behind a validation trigger. Research recommends keeping it in MVP only because ARCHITECTURE shows it's a cheap read-only projection — decide explicitly in requirements.
- **Booking lock flavor (MEDIUM):** `FOR UPDATE` vs `GET_LOCK` per-day serialization — validate in Phase 2 with the concurrency test, not by further research.
- **Auth simplification (MEDIUM):** full access+refresh rotation vs single 7–14 day JWT — YOLO mode permits the simplification; decide in Phase 1, revisit only if token theft becomes a concern.
- **Hosting/HTTPS:** research assumes a hosted HTTPS API but PROJECT.md doesn't specify hosting — a Phase 1/4 decision (free cert via Caddy/Cloudflare/Nginx vs documented cleartext risk for hobby HTTP).
- **Vuetify version drift:** competitor/pricing specifics and Vuetify Labs inventory are time-sensitive; re-verify Vuetify minor behavior only if a planned component turns out to be Labs.

## Sources

### Primary (HIGH confidence)
- npm registry queries (2026-11-16) — all package versions/peers in STACK.md
- https://capacitorjs.com/docs/updating/8-0, /docs/config, /docs/guides/security — Capacitor 8 toolchain, androidScheme, CapacitorHttp, token storage, cleartext
- https://vuetifyjs.com/en/getting-started/upgrade-guide/ + Sept 2026 blog — v4 breaking changes, Vite 8 CSS layer-order fix scoped to CLI templates
- https://expressjs.com/en/guide/migrating-5 — Express 5 async error handling; Express 4 maintenance end
- https://blogs.oracle.com/mysql/... + dev.mysql.com floating-point docs — MySQL 8.4 LTS/8.0 EOL; DECIMAL for money
- https://nodejs.org/en/about — Node 26 LTS
- InnoDB Locking official docs (dev.mysql.com) — `SELECT ... FOR UPDATE`, gap locks
- capacitorjs.com/docs/apis/app | /status-bar — back button, Android 15+ edge-to-edge no-ops
- vite.dev/guide/env-and-mode — build-time env semantics

### Secondary (MEDIUM confidence)
- https://www.prisma.io/docs/.../upgrading-to-prisma-7 — driver adapters mandatory (basis for rejecting Prisma)
- opencals.com, rakibulinux.com, aldridgedagos.com — MySQL no-exclusion-constraint / lock-then-check pattern (multiple sources agree)
- freecodecamp RBAC + auth0 sample — JWT role middleware pattern
- fresha.com, booksy.com, squareup.com official feature pages — competitor feature existence; Fresha commission complaints (Reddit, consistent across sources)
- glamorph.com, creav.io, octopuspro.com, bookify.mt — request-approval booking as a documented mode
- vuetifyjs.com release notes — VTimePicker core (v3.9), mobile-breakpoint restored (v3.6)

### Tertiary (LOW confidence — needs validation)
- xolapp.com / dayclerk.com (Baymard-derived) — "~37% drop-off from forced sign-up": directional only
- yocale/zoca "60–70% rebooking target" — vendor benchmark, not independent research
- waitless-sable.vercel.app — Square waitlist tier specifics (time-sensitive)
- Local-vs-cloud image storage consensus (dev.to, community) — fine at this scale, revisit on ephemeral hosting
- Salon timezone `Europe/Lisbon` — inference from pt-PT, **must be confirmed with user**

---
*Research completed: 2026-11-16*
*Ready for roadmap: yes*
