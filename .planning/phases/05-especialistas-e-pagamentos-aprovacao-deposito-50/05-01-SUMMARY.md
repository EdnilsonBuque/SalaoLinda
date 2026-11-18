---
phase: 05-especialistas-e-pagamentos-aprovacao-deposito-50
plan: 01
subsystem: api
tags: [express, knex, mysql, rbac, appointments]

# Dependency graph
requires:
  - phase: 04-android-apk-packaging
    provides: Existing API and booking foundation used by the specialist workflow
provides:
  - Specialist role, seed accounts, and service-to-specialist assignment
  - Appointment specialist snapshot and protected specialist appointment inbox
  - MySQL schema fields and statuses needed by later approval/payment plans
affects: [phase-05-plans-02-to-05, specialist-approval, deposit-payments]

# Tech tracking
tech-stack:
  added: []
  patterns: [role-based route middleware, specialist ownership filter in query, booking snapshots assigned specialist]

key-files:
  created:
    - api/migrations/202611180001_alter_users_role_add_especialista.js
    - api/migrations/202611180002_alter_services_add_specialist_id.js
    - api/migrations/202611180003_alter_appointments_add_specialist_and_deposit.js
    - api/src/scripts/bootstrap-specialists.js
    - api/src/middleware/requireRole.js
    - api/src/routes/specialistAppointment.routes.js
    - api/test/specialist.integration.test.js
  modified:
    - api/package.json
    - api/src/services/serviceService.js
    - api/src/validators/serviceSchemas.js
    - api/src/services/appointmentService.js
    - api/src/server.js
    - api/src/app.js
    - api/test/booking.integration.test.js

key-decisions:
  - "Use explicit MySQL ALTER TABLE statements for native ENUM changes so new values are preserved in the deployed schema."
  - "Expose the required URL /api/specialist/appointments, resolving the plan's mismatch between the URL contract and its GET / route instruction."

patterns-established:
  - "Specialist-only list endpoints authenticate first, enforce role, and also filter rows by req.user.id in the service query."
  - "Appointments snapshot services.specialist_id at creation so later service changes do not reroute existing bookings."

requirements-completed: [SPEC-01, SPEC-02]

# Metrics
duration: ~40min
completed: 2026-11-18
---

# Phase 5 Plan 01: Specialist routing and inbox

**MySQL and API now route services to specialist accounts and expose an appointment inbox scoped to each specialist.**

## Performance

- **Duration:** Approximately 40 minutes
- **Started:** 2026-11-18 (exact start time not captured)
- **Completed:** 2026-11-18
- **Tasks:** 3/3
- **Files modified:** 14

## Accomplishments

- Added the `especialista` role, service and appointment specialist IDs, deposit deadline, and new appointment statuses. Applied the three migrations to the local MySQL database and verified the schema with `SHOW COLUMNS`.
- Added idempotent bootstrap for two specialist accounts, service assignment validation and display names, and appointment specialist snapshots. Existing appointments for services without an assigned specialist now receive a clear 400 response.
- Added role middleware and `GET /api/specialist/appointments`, with both role enforcement and a per-specialist query filter. HTTP integration confirms specialists only see their own appointments and client/admin access receives 403 (anonymous receives 401).

## Task Commits

1. **Tasks 1–3: Specialist schema, service routing, and inbox** — `894bac6` (`feat(05): add specialist routing and appointment inbox`)

**Plan metadata:** pending summary/roadmap commit.

## Files Created/Modified

- Three `api/migrations/20261118000*.js` files — specialist role, foreign keys, deposit deadline, and appointment statuses.
- `api/src/scripts/bootstrap-specialists.js` — idempotent creation/update of the two specialist accounts.
- `api/src/middleware/requireRole.js` and `api/src/routes/specialistAppointment.routes.js` — protected specialist inbox.
- `api/src/services/serviceService.js` and `api/src/validators/serviceSchemas.js` — specialist assignment and specialist display name.
- `api/src/services/appointmentService.js` — assignment snapshot and specialist-filtered appointment listing.
- `api/src/server.js` and `api/src/app.js` — specialist route mount after admin routes.
- `api/package.json` — `bootstrap:especialists` and `test` scripts.
- `api/test/specialist.integration.test.js` — HTTP coverage for assignment, booking, and access control.
- `api/test/booking.integration.test.js` — existing integration fixture now assigns a specialist to satisfy the new service contract.

## Decisions Made

- Used explicit MySQL native ENUM DDL for role and appointment status migrations, with reversible down migrations.
- Used `/appointments` inside the `/api/specialist` mount because the plan's required public URL is `/api/specialist/appointments`; the plan's GET `/` detail conflicted with that contract.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Aligned specialist route with the required public URL**
- **Found during:** Task 3
- **Issue:** The plan required `/api/specialist/appointments` but its internal action text specified GET `/` under the `/api/specialist` mount, which produced 404 at the required URL.
- **Fix:** Mounted GET `/appointments` in the specialist router.
- **Files modified:** `api/src/routes/specialistAppointment.routes.js`
- **Verification:** Dedicated HTTP integration test passed against the updated API on port 31743.
- **Committed in:** `894bac6`

**2. [Rule 1 - Bug] Updated the existing booking test fixture for specialist assignment**
- **Found during:** Task 2 integration verification
- **Issue:** The existing booking integration test created a service without the now-required `specialistId`, so it failed before exercising its original booking flow.
- **Fix:** The fixture loads a bootstrapped specialist and assigns it to its test service.
- **Files modified:** `api/test/booking.integration.test.js`
- **Verification:** Full gated suite now reaches its documented pre-existing 404 for `/admin/users/:id/appointments`; specialist integration passes.
- **Committed in:** `894bac6`

**Total deviations:** 2 auto-fixed (2 route/test contract fixes). **Impact:** Both changes align implementation and regression coverage with the plan's explicit acceptance criteria.

## Issues Encountered

- Initial migration access was blocked by sandbox networking (`EPERM` to `127.0.0.1:3306`); the approved elevated retry succeeded. Rollback of all three migrations followed by reapplication also succeeded, and the specialist bootstrap was rerun.
- The API already bound to port 3001 was stale and returned 404 for the new endpoint. The updated API was started on port 31743 and the dedicated integration test passed there.
- The full gated suite reports 5 passing tests and one known baseline failure: `booking.integration.test.js` expects `/api/admin/users/:id/appointments`, which is not implemented. This is the pre-existing issue documented in `05-CONTEXT.md`; the new specialist integration passes.
- One elevated rollback invocation timed out during automatic approval review; the permitted retry completed successfully. No auto-review rejection occurred.

## User Setup Required

None - no external service configuration required. Bootstrap defaults are available for local use; override them with the documented specialist environment variables for deployment.

## Next Phase Readiness

- The API foundation for specialist UI, approval transitions, and payment flows is ready.
- Later plans must handle per-specialist conflict rules and approval/deposit states; those are outside this plan's scope.
- The existing admin client-history 404 remains a known baseline issue.

---
*Phase: 05-especialistas-e-pagamentos-aprovacao-deposito-50*
*Completed: 2026-11-18*
