# Phase 2 Research: Services & Booking Core

**Phase:** 2 of 4  
**Goal:** O ciclo completo de marcação funciona de ponta a ponta — cliente marca sem nunca haver dupla marcação, admin aprova  
**Requirements:** SERV-01, SERV-02, SERV-03, SERV-04, BOOK-01, BOOK-02, BOOK-03, BOOK-04, APPT-01, APPT-02, APPT-03, ADM-01  
**Date:** 2026-11-16  
**Mode:** yolo / coarse  
**Depends on Phase 1:** Schema + auth JWT/RBAC + DB migrated

## Scope

This phase delivers the product core:
- **Service CRUD** (admin) and catalog view (client) — photo, price, duration
- **Availability/slot engine** — the riskiest component; no double-booking
- **Booking flow with pending state** — client submits → admin confirms/rejects
- **Minhas Marcações** — client list with cancel; states enforced server-side
- **Admin confirm/reject inbox** — the approval model itself

Out of scope for Phase 2: dashboard revenue, ratings, client history, APK packaging (Phases 3-4).

## Key Decisions (defaults applied)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Lock strategy for no-double-booking | `GET_LOCK(CONCAT('book_', ?date), 5)` per day + `SELECT ... FOR UPDATE` overlap check inside transaction | LOW contention at single-stylist salon scale; avoids gap-lock subtleties of FOR UPDATE alone; documented in ARCHITECTURE.md §2; performance validated for ≤50 bookings/day |
| Slot step granularity | 15-min grid over opening hours (configurable via `salon_settings` or hardcoded 09:00–18:00) | 15 min captures braids (3h = 12 slots) without excessive empty slots; finer granularity = UI clutter, coarser = poor UX for variable-duration services |
| Timezone model | `SALON_TZ=Africa/Maputo`; wall-clock `DATETIME` stored; server-normalises all slot math; client never sees TZ | Avoids `TIMESTAMP` drift (well-known MySQL behaviour); single-location salon has one wall-clock; dayjs `pt` locale for display |
| Money snapshot | `price_at_booking` on appointments copies `services.price` at write; revenue reads snapshot only | Pitfall prevention: editing service price never rewrites historical earnings (Anti-Pattern 3 from PITFALLS) |
| Photo upload pipeline | `multer@2.x` → `/uploads/` → DB stores only `photo_path` → Express serves `/uploads` statically; API returns `{url: apiBase}/uploads/...` | Community consensus for small Node apps (PATTERNS.md §5); Capacitor Photo Picker via `@capacitor/camera` 8.2.6 (no broad storage permissions) |
| Status enum values (already in DB from Phase 1 migrations) | `enum('pendente','confirmada','rejeitada','cancelada','concluida')` | Confirmed matching Phase 1 schema; transitions per state machine ARCHITECTURE.md §3 |
| Rejection reason | Canned short options (v1.x) — optional free text deferred | FEATURES.md: "rejeição deve carrer um motivo curto"; avoids chat-like threading (Out of Scope) |

## Risks / Watchouts

- **Double-booking race:** the single point of failure. Must be transactional with lock; never trust client-supplied slot (PITFALLS: check-then-insert without lock). Acceptance criterion for Phase 2: two simultaneous requests for the same slot → one gets 409, other sees updated availability.
- **Slot generation vs DB enforcement:** UI shows only free slots (app-side greedy walk), but the INSERT must re-validate overlap in the same transaction with `SELECT ... FOR UPDATE` / `GET_LOCK`; otherwise two clients can both see the same open slot and book it.
- **Timezone drift:** all slot math in wall-clock minutes from midnight `SALON_TZ`; never `TIMESTAMP` arithmetic; display uses dayjs `tz` only at edges.
- **Admin confirm/reject UX:** reject may carry a short canned reason (max 3 options); silent rejection drives clients back to WhatsApp (confirmed in FEATURES research).
- **Variable-duration services:** braids can run 3h → slot engine must walk `opening_hours` in `duration_minutes` steps; a 3h service blocks 12 consecutive slots — availability must respect this.
- **Capacitor connectivity:** API base URL frozen at APK build time (`VITE_API_BASE_URL`); never `localhost` in release APK (Android 9+ blocks cleartext). See PITFALLS: cleartext not permitted.

## Dependency Notes (Phase 2 ← Phase 1)

- **Schema foundation:** tables `users`, `refresh_tokens`, `services`, `appointments`, `reviews` already exist from Phase 1 migrations (5 tables, DECIMAL, DATETIME, ENUM pt) — Phase 2 builds on them, no new tables needed.
- **Auth prerequisite:** JWT-carrying `req.user` with `role` already validated server-side (Phase 1 plans 01-01/01-02). Phase 2 routes reuse `authenticate` + `requireAdmin` middleware.
- **Token storage:** `@capacitor/preferences` persisted from Phase 1 — Phase 2 reads token to identify client's `mine()` appointments.

## Verification focus for Phase 2 plans

- Availability engine: two simultaneous bookings for same slot → conflict 409 + availability updated
- State machine: PATCH /:id/status with invalid transition → 409; only admin can complete
- Rejection reason: short canned option or null; client sees reason on inbox
- Minhas Marcações: cancel works for pending/confirmed; admin confirm/reject visible
- Service CRUD: photo upload works; price change respects price_at_booking snapshot
- Frontend: slot picker disables booked slots; Vuetify 4 core only (no Labs VTimePicker inside booking flow)