# Phase 5: Especialistas e Pagamentos (aprovacao + deposito 50%) - Pattern Map

**Mapped:** 2026-11-18
**Files analyzed:** 26 (11 new API, 8 modified API, 2 new web, 5 modified web)
**Analogs found:** 24 / 26 (2 = no direct analog, contract comes from canonical refs)

**Scope of inputs:** `05-CONTEXT.md` (decisions + canonical refs), `05-RESEARCH.md` (file:line research), `05-UI-SPEC.md` (design contract). Codebase roots: `api/src/`, `api/migrations/`, `api/test/`, `web/src/`.

> **Key structural fact (RESEARCH §Summary):** route protection for `/api/admin/*` comes from **mount order in `server.js`** (`app.use('/api/admin', adminRoutes)` at line 42 mounts before the sub-routers at 43-45, and `admin.routes.js:10` applies `router.use(authenticate, requireAdmin)` to everything under the prefix). New specialist routes must NOT go under `/api/admin` and must carry **explicit** `router.use(authenticate, requireRole('especialista'))` (pattern already used by `adminReview.routes.js:8`).

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `api/src/middleware/requireRole.js` (NEW) | middleware | request-response | `api/src/middleware/requireAdmin.js` | exact |
| `api/src/routes/specialistAppointment.routes.js` (NEW) | route | request-response (list + status transition) | `api/src/routes/adminAppointment.routes.js` + `adminReview.routes.js` | exact |
| `api/src/routes/payment.routes.js` (NEW) | route | request-response (charge lifecycle) | `api/src/routes/appointment.routes.js` + `auth.routes.js` (limiter) | exact |
| `api/src/services/paymentService.js` (NEW) | service | event-driven-ish (gateway callback → state transition) + CRUD (payments rows) | `api/src/services/appointmentService.js` | role-match |
| `api/src/payments/gateway.js` (NEW) | config/interface (contract) | — (JSDoc interface) | no code analog — contract from `.planning/seeds/mpesa-real-production.md:11-19` | no analog |
| `api/src/payments/mockGateway.js` (NEW) | service (adapter) | transform (simulated C2B push) | no exact analog — follow `api/src/utils/*.js` module style + `paymentService` conventions | no analog |
| `api/src/scripts/bootstrap-specialists.js` (NEW) | script | batch/bootstrap (upsert) | `api/src/scripts/bootstrap-admin.js` | exact |
| `api/src/validators/paymentSchemas.js` (NEW, or extend `appointmentSchemas.js`) | validator | request-response | `api/src/validators/appointmentSchemas.js` + `formatZodError` in `authSchemas.js:25-32` | exact |
| `api/migrations/202611180001_alter_users_role_add_especialista.js` (NEW) | migration | schema (native ENUM alter) | `api/migrations/202611160001_create_users.js:11` (enum def) | exact |
| `api/migrations/202611180002_alter_services_add_specialist_id.js` (NEW) | migration | schema (FK + backfill) | `api/migrations/202611160003_create_services.js` + `202611160004` FK style | exact |
| `api/migrations/202611180003_alter_appointments_add_specialist_and_deposit.js` (NEW) | migration | schema (native ENUM alter + columns + index) | `api/migrations/202611160004_create_appointments.js` | exact |
| `api/migrations/202611180004_create_payments.js` (NEW) | migration | schema (table + FK + unique) | `api/migrations/202611160005_create_reviews.js` (child table pattern) | exact |
| `api/src/services/appointmentService.js` (MODIFIED) | service | CRUD + state transitions + availability | self — extend at cited lines | exact |
| `api/src/services/appointmentPolicy.js` (MODIFIED) | service (pure policy) | transform (slot generation) | self — mostly unchanged; overlap rule at 90-94 stays | exact |
| `api/src/services/serviceService.js` (MODIFIED) | service | CRUD (add `specialist_id` field) | self — extend `toService`/`toDatabaseFields` | exact |
| `api/src/validators/appointmentSchemas.js` (MODIFIED) | validator | request-response | self — `adminAppointmentStatusSchema` enum rewrite | exact |
| `api/src/routes/adminAppointment.routes.js` (MODIFIED) | route | request-response | self — status enum + remainder endpoint | exact |
| `api/src/routes/adminService.routes.js` (MODIFIED) | route | request-response | self — pass `specialistId` through | exact |
| `api/src/config/salon.js` + `api/src/config/env.js` + `api/.env.example` (MODIFIED) | config | — | self — add `depositDeadlineMinutes` | exact |
| `api/src/server.js` + `api/src/app.js` (MODIFIED) | config (mounting) | — | self — add 2 `app.use` lines each, AFTER existing mounts | exact |
| `api/test/appointmentTransitions.test.js` / `payment` tests (NEW) | test | — | `api/test/appointmentPolicy.test.js` (unit) + `api/test/booking.integration.test.js` (HTTP helper) | exact |
| `web/src/views/SpecialistAppointmentsView.vue` (NEW) | component (view) | request-response (list + PATCH) | `web/src/views/AdminAppointmentsView.vue` | exact |
| `web/src/views/PaymentView.vue` (NEW) | component (view) | request-response (charge + confirm) | `web/src/views/BookingView.vue` | exact |
| `web/src/router/index.js` (MODIFIED) | config (guards) | — | self — add `meta.especialista` branch at line 45 | exact |
| `web/src/stores/auth.js` (MODIFIED) | store | — | self — add getter next to `isAdmin` line 12 | exact |
| `web/src/App.vue` (MODIFIED) | component (shell/nav) | — | self — 3rd branch after line 85 + sheet after line 96 | exact |
| `web/src/services/formatters.js` (MODIFIED) | utility | transform | self — `STATUS_PRESENTATION` lines 3-9 | exact |
| `web/src/views/AppointmentsView.vue` (MODIFIED) | component (view) | request-response | self — card actions block lines 68-99 | exact |
| `web/src/views/AdminAppointmentsView.vue` (MODIFIED) | component (view) | request-response | self — actions block lines 68-102 | exact |
| `web/src/views/AdminServicesView.vue` (MODIFIED) | component (view) | CRUD form | self — dialog fields lines 120-163, `form` reactive line 240 | exact |
| `web/src/views/ServicesView.vue` (MODIFIED) | component (view) | read-only list | self — card `v-card-item` lines 47-54 | exact |

---

## Pattern Assignments

### `api/src/middleware/requireRole.js` (middleware, request-response)

**Analog:** `api/src/middleware/requireAdmin.js` (entire file, 6 lines — copy structure verbatim)

```javascript
// api/src/middleware/requireAdmin.js:1-6 (ACTUAL — copy this shape)
export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Acesso reservado à administração' })
  }
  next()
}
```

**Phase 5 variant (RESEARCH Pattern 3, lines 262-270):**
```javascript
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Acesso reservado' })
    }
    next()
  }
}
```

**Auth precondition (unchanged, reuse as-is):** `api/src/middleware/authenticate.js:4-22` — Bearer parse → `verifyAccessToken` → **re-reads user from DB each request** (`authenticate.js:15`), so role changes propagate without re-login. `req.user` carries `{ id, name, phone, role }`.

---

### `api/src/routes/specialistAppointment.routes.js` (route, request-response)

**Analog 1 — mount/auth pattern:** `api/src/routes/adminReview.routes.js:1-15`
```javascript
// api/src/routes/adminReview.routes.js:1-15 — explicit auth (the SAFE pattern to copy)
import { Router } from 'express'
import { authenticate } from '../middleware/authenticate.js'
import { requireAdmin } from '../middleware/requireAdmin.js'
const router = Router()
router.use(authenticate, requireAdmin)          // line 8 — explicit, not inherited from mount order
router.get('/', async (req, res, next) => { try { ... } catch (e) { next(e) } })
```

**Analog 2 — handler shape:** `api/src/routes/adminAppointment.routes.js:16-31`
```javascript
// GET list with validated query (lines 16-20)
router.get('/', async (req, res) => {
  const parsed = adminAppointmentQuerySchema.safeParse(req.query)
  if (!parsed.success) return res.status(400).json({ message: 'Filtros inválidos' })
  res.json({ appointments: await listAdminAppointments(parsed.data) })
})
// PATCH status with id guard + zod (lines 22-31)
router.patch('/:id/status', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: 'Marcação inválida' })
  const parsed = adminAppointmentStatusSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ message: 'Estado inválido' })
  ...
  res.json({ appointment: await updateAdminAppointment(id, parsed.data) })
})
```

**Phase 5 composition (RESEARCH Pattern 3, line 272):**
```javascript
router.use(authenticate, requireRole('especialista'))
// ownership is NOT only middleware — the UPDATE/SELECT also carries:
//   .where({ specialist_id: req.user.id })   (Security Domain, threat "Especialista A aprova marcação de B")
```

**Server mount (RESEARCH Pitfall 2):** `api/src/server.js:39-45` — add `app.use('/api/specialist', specialistAppointmentRoutes)` **after** the existing mounts (never under `/api/admin`, which would 403 the specialist). Mirror the same line in `api/src/app.js:36-42` (both files declare the app; keep them in sync).

---

### `api/src/routes/payment.routes.js` (route, request-response)

**Analog:** `api/src/routes/appointment.routes.js:1-47` — authenticated client routes with per-route id guard:
```javascript
// appointment.routes.js:14, 32-36 — pattern to copy for /api/appointments/:id/deposit
router.use(authenticate)
router.post('/:id/cancel', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: 'Marcação inválida' })
  res.json({ appointment: await cancelClientAppointment(req.user.id, id) })
})
```

**Rate limit (for PIN/charge attempts):** `api/src/routes/auth.routes.js:9-15`
```javascript
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Demasiadas tentativas. Tente novamente mais tarde.' },
})
// used as middleware per-route: router.post('/login', authLimiter, handler)  (line 26)
```

**Admin remainder endpoint** goes in `adminAppointment.routes.js` (mount already protected via `/api/admin`), but RESEARCH Security requires **explicit** `router.use(authenticate, requireAdmin)` in sub-routers — copy `adminReview.routes.js:8`. Response shape per RESEARCH line 423: `{ payment, totals: { deposito, restante, total } }`.

---

### `api/src/services/paymentService.js` (service, event-driven + CRUD)

**Analog:** `api/src/services/appointmentService.js` — this is THE structural template (transaction + `forUpdate` + transition guard + `httpError`):

```javascript
// appointmentService.js:191-215 (ACTUAL) — copy this exact transaction shape
export async function updateAdminAppointment(appointmentId, { status, rejectionReason }, now = new Date()) {
  await db.transaction(async (trx) => {
    const appointment = await trx('appointments').where({ id: appointmentId }).forUpdate().first()
    if (!appointment) throw httpError(404, 'Marcação não encontrada')

    const allowed = appointment.status === 'pendente'
      ? ['confirmada', 'rejeitada']
      : appointment.status === 'confirmada'
        ? ['concluida']
        : []
    if (!allowed.includes(status)) throw httpError(409, 'A alteração de estado não é permitida')
    ...
    await trx('appointments').where({ id: appointmentId }).update({ status, ..., updated_at: now })
  })
  return mapAppointment(await appointmentQuery().where('a.id', appointmentId).first())
}
```

**Phase 5 changes in the SAME file (RESEARCH Pattern 1, lines 211-217):**
```javascript
const allowedByStatus = {
  pendente:          ['aguarda_deposito', 'rejeitada'],          // specialist approval
  aguarda_deposito:  ['confirmada', 'expirada', 'cancelada'],    // confirmada ONLY via paymentService
  confirmada:        ['concluida', 'cancelada'],
  rejeitada: [], expirada: [], cancelada: [], concluida: [],
}
```

**Imports convention (appointmentService.js:1-14):**
```javascript
import db from '../db/knex.js'
import { salonPolicy } from '../config/salon.js'
import { ...pure helpers... } from './appointmentPolicy.js'
import { httpError } from '../utils/httpError.js'
```
`paymentService` copies this block. Errors are ALWAYS `httpError(status, msg)` (`api/src/utils/httpError.js:1-5`) thrown from the service; the global handler `api/src/middleware/errorHandler.js:5-13` converts to `{ message }` JSON (500s logged + generic message). **No try/catch in route handlers for service errors** — Express 5 forwards rejected promises.

**Race payment-vs-expiry (RESEARCH Pitfall 4):** both writers use `trx('appointments').where({id}).forUpdate()` + require current status `aguarda_deposito`; loser gets 409.

---

### `api/src/payments/gateway.js` + `mockGateway.js` (no exact analog)

**Contract source (canonical):** `.planning/seeds/mpesa-real-production.md:11,17-19`
```javascript
// criarCobranca()  → M-Pesa C2B push payrequest
// webhook          → public callback endpoint (future: Result/Callback URL)
// verificar        → query endpoint — "nunca confiar só no callback"
```
**RESEARCH Pattern 4 (lines 285-295):**
```javascript
// criarCobranca({ appointmentId, amount, msisdn, description })
//   → { chargeId, status: 'aguarda_pin', prompt: { description, amount } }
// verificar(chargeId) → { chargeId, status: 'completo' | 'falhado' | 'pendente', raw }
// MockGateway adds confirmPin(chargeId, pin); its callback enters through the SAME
// path as the real webhook (paymentService.processGatewayEvent) so the booking flow
// is identical when M-Pesa lands.
```
**Module style:** small single-purpose JS module, named exports, JSDoc — mirror `api/src/utils/httpError.js` / `api/src/config/salon.js` (frozen config object). Folder `api/src/payments/` is a new tier; follow the flat, no-class, ESM `import`/`export` style used everywhere in `api/src/`.

---

### `api/src/scripts/bootstrap-specialists.js` (script, bootstrap)

**Analog:** `api/src/scripts/bootstrap-admin.js` (entire file, 27 lines)
```javascript
// key lines to mirror (11-19): upsert by phone, role from constant, hashPassword, destroy pool
const existing = await db('users').where({ phone }).first()
const password_hash = await hashPassword(password)
if (existing) {
  await db('users').where({ id: existing.id }).update({ name, password_hash, role: 'admin', updated_at: new Date() })
} else {
  const [id] = await db('users').insert({ name, phone, password_hash, role: 'admin', ... })
}
await db.destroy()
main().catch(async (err) => { console.error(...); try { await db.destroy() } catch {}; process.exit(1) })
```
**Register in `api/package.json` scripts** next to line 12: `"bootstrap:especialists": "node --env-file=.env src/scripts/bootstrap-specialists.js"`.

---

### `api/src/validators/*` (validator, request-response)

**Analog:** `api/src/validators/appointmentSchemas.js:13-16`
```javascript
export const adminAppointmentStatusSchema = z.object({
  status: z.enum(['confirmada', 'rejeitada', 'concluida']),   // ← Phase 5: add 'aguarda_deposito', drop 'confirmada'
  rejectionReason: z.string().trim().max(255).optional(),
})
```
**Error format:** `api/src/validators/authSchemas.js:25-32` `formatZodError(err)` → `{ message: 'Dados inválidos', fieldErrors }` (feeds Vuetify inline errors). Note `adminAppointment.routes.js` currently returns flat `{ message }` — new endpoints should use `formatZodError` (project direction per RESEARCH "Don't Hand-Roll" row 4).

---

### Migrations (migration, schema)

**Sequence/format:** `api/migrations/YYYYMMDDHHMMSS_create_*.js` (0001…0005 exist) — new files use `20261118000N_*`. JSDoc `@param {import('knex').Knex}` header + `export async function up/down` — copy from any existing migration.

**Native ENUM (users role):** `api/migrations/202611160001_create_users.js:11`
```javascript
table.enu('role', ['client', 'admin'], { useNative: true, enumName: 'users_role' })
  .notNullable().defaultTo('client')
```
**Native ENUM (appointment status) + FK + indexes:** `api/migrations/202611160004_create_appointments.js:6-22`
```javascript
table.bigInteger('service_id').unsigned().notNullable().references('id').inTable('services').onDelete('RESTRICT')
table.enu('status', [...], { useNative: true, enumName: 'appointments_status' }).notNullable().defaultTo('pendente')
table.index(['status', 'starts_at'])
```
**RESEARCH Pitfall 6:** `.alter()` on native enums can misbehave — after `npm run migrate:latest` verify with `SHOW COLUMNS FROM users;` / `SHOW COLUMNS FROM appointments;`; fallback `knex.raw('ALTER TABLE ... MODIFY status ENUM(...) NOT NULL DEFAULT \'pendente\'')`; test `migrate:rollback`.

---

### `api/src/services/appointmentService.js` (modified — availability/overlap per specialist)

**Analog:** same file, lines 70-94 (query to extend) and 109-138 (lock guard to keep):
```javascript
// ACTUAL (70-78) — Phase 5 adds .where('specialist_id', specialistId) + deadline-aware status filter
async function getActiveBookingsForDay(query, date) {
  const opening = getOpeningWindow(date)
  if (!opening) return []
  return query('appointments')
    .select('starts_at', 'ends_at')
    .whereIn('status', ACTIVE_STATUSES)                      // ['pendente','confirmada'] line 16
    .andWhere('starts_at', '<', createWallClock(date, opening.close))
    .andWhere('ends_at', '>', createWallClock(date, opening.open))
}
// KEEP the serialisation (110): trx('services').select('id').orderBy('id').forUpdate()
// KEEP the in-transaction re-check (117-124): generateAvailableSlots(...).find(...)
```
**Pure overlap rule (stays in policy):** `api/src/services/appointmentPolicy.js:90-94`
```javascript
const overlaps = appointments.some((appointment) => {
  const bookedStart = salonDateTimeToString(appointment.starts_at)
  const bookedEnd = salonDateTimeToString(appointment.ends_at)
  return bookedStart < endsAt && bookedEnd > startsAt
})
```
The policy stays specialist-agnostic (it receives a pre-filtered `appointments` array) — the filter lives in the query, per SPEC-04.

---

### `api/src/config/salon.js` + `env.js` (config)

**Analog:** `api/src/config/salon.js:1-4`
```javascript
export const salonPolicy = Object.freeze({
  timeZone: process.env.SALON_TZ || 'Africa/Maputo',
  slotStepMinutes: 30,
  cancellationCutoffHours: 2,   // ← add depositDeadlineMinutes (env-overridable) alongside
  ...
})
```
Env defaults pattern: `api/src/config/env.js:22-24` (`env.JWT_ACCESS_EXPIRES = env.JWT_ACCESS_EXPIRES || '15m'`). Mirror in `api/.env.example` (RESEARCH: `DEPOSIT_DEADLINE_MINUTES`, optional `MOCK_PAYMENT_PIN`).

---

## Frontend Pattern Assignments

### `web/src/views/SpecialistAppointmentsView.vue` (component, request-response)

**Analog:** `web/src/views/AdminAppointmentsView.vue` (214 lines — copy whole structure)

- **Load pattern** (lines 165-178): `loading`/`error` refs → `api.get('/admin/appointments', { params })` → `catch` maps `requestError.response?.data?.message || 'fallback pt-PT'` → `finally` clears loading.
- **Status action with per-row loading** (lines 184-199): `savingId` ref → `api.patch(...)` → close dialog → reload → `finally savingId = null`. Reuse for `PATCH /specialist/appointments/:id/status`.
- **Reject dialog with optional motivo** (lines 112-137): `v-dialog` → `v-card rounded="lg"` → `v-textarea` "Motivo (opcional)" → error-filled confirm button. **UI-SPEC §2** changes: max **50 chars** + `counter` (spec overrides the current 255), buttons "Cancelar"/"Rejeitar".
- **Card + chip** (lines 36-55): `salon-card rounded="lg"`, `appointmentStatus(status)` chip `variant="tonal"` with icon+label.
- **Empty state** (lines 106-110): centered icon + `text-h6` heading + `salon-muted` body — UI-SPEC §2 copy overrides ("Sem marcações por aprovar").
- **"Confirmar" button (line 86) is DEPRECATED** — RESEARCH says it becomes "Aprovar" → `aguarda_deposito` (this view's admin twin changes too; see below).

### `web/src/views/PaymentView.vue` (component, request-response)

**Analog:** `web/src/views/BookingView.vue`
- Slot/service load + submit + success/error alerts: `loadSlots` (line 141, `api.get('/services/:id/availability')`), `submitBooking` (line 159, `api.post('/appointments')` → `success.value = true`), error/success `v-alert variant="tonal"` (lines 26-37).
- **Sheet steps (prompt → PIN → confirm)**: no existing 3-step sheet — closest overlay patterns: reject dialog in `AdminAppointmentsView.vue:112-137` and review dialog in `AppointmentsView.vue:112-154` (both `v-dialog`/`v-card rounded="xl"`, cancel-text + primary-flat button row). UI-SPEC §3 mandates `v-bottom-sheet rounded="xl"` + `v-window` (core Vuetify only).
- Error/loading contract: `:loading` on pressed button only, sibling disabled (UI-SPEC Interaction table) — matches `savingId`/`savingReview` patterns in both list views.

### Modified web files (self-analog — extend at these exact points)

| File | Where to extend | Existing code to copy |
|---|---|---|
| `web/src/router/index.js` | route def after line 26; guard after line 47 | `{ path: '/especialista/marcacoes', meta: { requiresAuth: true, specialist: true } }` + `if (to.meta.specialist && !auth.isEspecialista) return { name: 'home' }` — mirrors `meta.admin` branch (line 45-47) |
| `web/src/stores/auth.js` | getters, after line 12 | `isAdmin: (s) => s.user?.role === 'admin'` → add `isEspecialista: (s) => s.user?.role === 'especialista'` (RESEARCH uses `isSpecialist` in one snippet; UI-SPEC §1 names it **`isEspecialista`** — follow UI-SPEC) |
| `web/src/App.vue` | (a) app-bar links lines 6-13, (b) account subtitle line 25, (c) bottom-nav 3rd branch after line 85, (d) "Mais" sheet after line 96, (e) `mainRoutes` line 117 | Binary `v-if="!auth.isAdmin"` exists in 6 places (lines 6-7, 25, 52, 89) — RESEARCH Pitfall 5: make three explicit branches (cliente/especialista/admin); add `'/especialista/marcacoes'` to `mainRoutes` |
| `web/src/services/formatters.js` | `STATUS_PRESENTATION` lines 3-9 | add `aguarda_deposito: { label: 'Aguarda depósito', color: 'info', icon: 'mdi-cash-clock' }` and `expirada: { label: 'Expirada', color: 'surface-variant', icon: 'mdi-clock-alert-outline' }` (UI-SPEC chip table) |
| `web/src/views/AppointmentsView.vue` | card actions block lines 68-99 | `v-btn color="primary" :loading="cancellingId === ..." prepend-icon` shape; add "Pagar depósito" CTA for `aguarda_deposito` + payment badges on `concluida` |
| `web/src/views/AdminAppointmentsView.vue` | (a) `statusOptions` lines 146-153 (add 2 statuses), (b) actions block lines 68-102 | `changeStatus(appointment, 'confirmada')` at line 86 **must become `'aguarda_deposito'`** (PAY-01); add "Marcar restante pago" button + confirm dialog (copy reject dialog lines 112-137, swap to primary/Registar copy) |
| `web/src/views/AdminServicesView.vue` | form dialog fields lines 120-163; `form` reactive lines 240-249; payload line 286-295 | add `v-select` "Especialista" after Duração field (line 148-150); `saveService` already spreads `form` into payload — add `specialistId` |
| `web/src/views/ServicesView.vue` | card `v-card-item` lines 47-54 | add tonal `v-chip` "Com {nome}" under subtitle; existing chip style reference `AppointmentsView.vue:50-54` |

**Login redirect:** `web/src/views/LoginView.vue:76` — `router.replace(route.query.redirect || '/')` — RESEARCH Pitfall 5 notes post-login role redirect may be desired (especialista → `/especialista/marcacoes`); keep `redirect` query support.

**API client:** no changes needed — `web/src/services/api.js` attaches Bearer (lines 12-16) and retries 401 once (lines 27-48); all new calls go through the default `api` instance.

---

## Shared Patterns

### Authentication (all protected routes)
**Source:** `api/src/middleware/authenticate.js:4-22`
```javascript
router.use(authenticate)                                   // any authenticated user
router.use(authenticate, requireRole('especialista'))      // specialist-only (NEW middleware)
router.use(authenticate, requireAdmin)                     // admin-only (EXPLICIT in new sub-routers)
```
**Apply to:** `specialistAppointment.routes.js`, `payment.routes.js` (client), remainder endpoint (explicit admin).

### RBAC ownership (defense in depth)
**Source:** RESEARCH Security Domain — middleware is NOT enough:
```javascript
// Every specialist-scoped query/UPDATE also filters:
.where('a.specialist_id', specialistId)          // list
.where({ id, specialist_id: req.user.id })        // status transition UPDATE
```

### Error handling (all services/routes)
**Source:** `api/src/utils/httpError.js:1-5` + `api/src/middleware/errorHandler.js:5-13`
```javascript
throw httpError(404, 'Marcação não encontrada')   // in service → handled globally
// routes: Express 5 auto-forwards async rejections — NO try/catch needed
// (exception: auth.routes.js/admin.routes.js use try/catch + next(e) — either style exists; prefer no-try/catch like appointment.routes.js)
```
Status codes in use: 400 invalid input, 401 unauthenticated, 403 role, 404 missing, 409 state/conflict (transition, double-book, duplicate payment).

### Validation (all POST/PATCH/PATCH-status endpoints)
**Source:** `api/src/validators/appointmentSchemas.js` + `authSchemas.js:25-32`
```javascript
const parsed = someSchema.safeParse(req.body)
if (!parsed.success) return res.status(400).json(formatZodError(parsed.error))
// id guard on every :id param:
const id = Number(req.params.id)
if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: '... inválido' })
```

### State-transition transaction (all Phase 5 status writes)
**Source:** `api/src/services/appointmentService.js:191-212`
```javascript
await db.transaction(async (trx) => {
  const row = await trx('appointments').where({ id }).forUpdate().first()
  if (!row) throw httpError(404, '...')
  if (!allowedByStatus[row.status]?.includes(next)) throw httpError(409, 'A alteração de estado não é permitida')
  await trx('appointments').where({ id }).update({ status: next, updated_at: now })
})
```
**Apply to:** specialist approve/reject, payment success → `confirmada`, lazy expiry → `expirada`, admin remainder insert (idempotency: 409 if `kind='restante'` completo exists).

### Migration file format
**Source:** `api/migrations/20261116000*.js` — JSDoc knex param, `export async function up/down`, native enums via `useNative: true` + `enumName`.

### Frontend list/action view (all list views)
**Source:** `AdminAppointmentsView.vue` / `AppointmentsView.vue`
```javascript
loading/error/savingId refs → api.get/patch → response?.data?.message || 'pt-PT fallback' → finally
// chips: appointmentStatus(status) → { color, icon, label } — NEVER invent colors (UI-SPEC)
// actions: :loading="savingId === item.id" on pressed button only
// feedback: tonal v-alert (never toast-only); success auto-dismiss 4s for lists
```

### Route mounting (server.js + app.js — keep BOTH in sync)
**Source:** `api/src/server.js:39-45` and `api/src/app.js:36-42` (identical blocks)
```javascript
app.use('/api/auth', authRoutes)
app.use('/api/services', serviceRoutes)
app.use('/api/appointments', appointmentRoutes)
app.use('/api/admin', adminRoutes)                     // ← security depends on being BEFORE sub-routers
app.use('/api/admin/services', adminServiceRoutes)
app.use('/api/admin/appointments', adminAppointmentRoutes)
app.use('/api/admin/reviews', adminReviewRoutes)
// ADD (after existing): app.use('/api/specialist', specialistRoutes)
// ADD (after existing): app.use('/api/payments', paymentRoutes)   [or nest under /api/appointments — planner decides]
```

---

## No Analog Found

| File | Role | Data Flow | Reason / Fallback |
|---|---|---|---|
| `api/src/payments/gateway.js` | interface contract | — | No abstraction/interface files exist yet; contract is canonical in `.planning/seeds/mpesa-real-production.md:11-19` + RESEARCH Pattern 4 (lines 285-295). Use JSDoc + named exports per `api/src/utils/` style |
| `api/src/payments/mockGateway.js` | adapter (simulated gateway) | transform | Nothing simulates an external service. Structure: stateless functions over an in-memory `Map` of charges; its `confirmPin` result must funnel into `paymentService.processGatewayEvent` (the same entry point the real webhook will use) |

---

## Anti-Pattern Checklist (from RESEARCH — planner must bake into actions)

1. **Never** leave `pendente → confirmada` in `adminAppointmentStatusSchema` / `updateAdminAppointment` (PAY-01 bypass; `AdminAppointmentsView.vue:86` "Confirmar" must change).
2. **Never** mount specialist routes under `/api/admin/*` (403) nor before it (unauthenticated).
3. **Never** JOIN `services` for conflict checks — snapshot `specialist_id` on `appointments`.
4. **Never** rely only on a cron for expiry — the deadline filter must live in the availability query (lazy), job optional.
5. **Never** let a client PATCH write `confirmada` — only `paymentService` after `verificar()`/webhook.
6. **Never** assume `!isAdmin` = cliente in `App.vue`/router (binary branches → 3 explicit roles).
7. **Baseline hygiene (Pitfall 8):** `git status` shows ~40 untracked/modified files from phases 2-4 and `booking.integration.test.js:159` already fails (pre-existing `/admin/users/:id/appointments` 404 gap) — commit baseline before editing; do not treat that failure as a Phase 5 regression.

---

## Metadata

**Analog search scope:** `api/src/**` (34 files), `api/migrations/**` (5), `api/test/**` (2), `web/src/**` (28), canonical refs (seed + notes).
**Files scanned:** ~70 (targeted reads of 22 analogs).
**Pattern extraction date:** 2026-11-18
**Analogs per file:** see File Classification table; 2 files without code analogs (payments gateway pair) fall back to canonical seed contract + service module conventions.
