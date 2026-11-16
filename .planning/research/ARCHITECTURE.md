# Architecture Research

**Domain:** Salon booking/management mobile app (Salão Linda)
**Researched:** 2026-11-16
**Confidence:** MEDIUM-HIGH (standard patterns verified across sources; MySQL-specific concurrency constraints verified against InnoDB docs + multiple independent articles)

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│  MOBILE APP (Capacitor APK) — Vue 3 + Vuetify                   │
│  ┌──────────┐ ┌───────────┐ ┌───────────┐ ┌──────────────────┐   │
│  │ Auth     │ │ Services  │ │ Booking / │ │ My Appointments  │   │
│  │ screens  │ │ catalog   │ │ Slots     │ │ + Queue view     │   │
│  └────┬─────┘ └─────┬─────┘ └─────┬─────┘ └────────┬─────────┘   │
│       │             │             │                 │            │
│  ┌────┴─────────────┴─────────────┴─────────────────┴─────────┐  │
│  │ API client layer (fetch/axios + JWT interceptor)           │  │
│  └──────────────────────────┬─────────────────────────────────┘  │
├─────────────────────────────┼────────────────────────────────────┤
│  REST API (Node.js + Express) — single monolith                 │
│  ┌──────────────┐ ┌─────────────────┐ ┌───────────────────────┐  │
│  │ auth         │ │ routes/         │ │ middleware            │  │
│  │ (bcrypt+JWT) │ │ (controllers)   │ │ verifyToken/checkRole │  │
│  └──────┬───────┘ └────────┬────────┘ └───────────┬───────────┘  │
│         │                  │                      │              │
│  ┌──────┴──────────────────┴──────────────────────┴───────────┐  │
│  │ services/ (business logic): availability engine,           │  │
│  │ state machine, revenue reporting, image upload             │  │
│  └──────────────────────────┬─────────────────────────────────┘  │
├─────────────────────────────┼────────────────────────────────────┤
│  DATA LAYER                                                  │
│  ┌──────────────────────┐  ┌─────────────────────────────────┐  │
│  │ MySQL (mysql2 pool)  │  │ Local disk: /uploads/*.jpg      │  │
│  │ users, services,     │  │ served statically by Express    │  │
│  │ appointments,        │  │                                 │  │
│  │ reviews              │  │                                 │  │
│  └──────────────────────┘  └─────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Mobile app (Capacitor) | UI, form validation, slot picker UX, optimistic display of own appointments | Vue 3 + Vuetify single-page app wrapped by Capacitor; no business rules beyond UX |
| API client layer | Attach JWT to every request, redirect to login on 401, base-URL config | axios instance with request/response interceptors |
| Express routes/controllers | HTTP contract only: parse params, validate input (zod/express-validator), call service, shape JSON response | One file per resource: `auth.js`, `services.js`, `appointments.js`, `reviews.js` |
| Middleware | Authentication (`verifyToken`) and authorization (`requireRole('admin')`) | JWT verify + role check before route handlers |
| Business services | Availability engine (slot generation + overlap check), appointment state machine, revenue queries, image processing | Pure-ish modules in `services/`, unit-testable without HTTP |
| MySQL | Source of truth; enforces integrity: FKs, CHECK on status, unique/locking for no-double-book | mysql2 connection pool, migrations as `.sql` files |
| Image storage | Store service photos on disk, DB keeps only relative path | multer disk storage → `/uploads` served via `express.static` |

## Recommended Project Structure

```
salao-linda/
├── backend/
│   ├── server.js              # Express bootstrap, static /uploads, route mounting
│   ├── db/
│   │   ├── pool.js            # mysql2/promise pool (single shared pool)
│   │   ├── migrations/        # 001_schema.sql, 002_seed_admin.sql ...
│   │   └── queries/           # per-resource SQL (appointments.sql, revenue.sql)
│   ├── middleware/
│   │   ├── auth.js            # verifyToken
│   │   └── roles.js           # requireRole(...allowed)
│   ├── routes/
│   │   ├── auth.js            # POST /register, POST /login
│   │   ├── services.js        # GET public list; POST/PUT/DELETE admin
│   │   ├── appointments.js    # POST book, GET mine, GET admin, PATCH status
│   │   ├── slots.js           # GET /slots?date=&serviceId=
│   │   └── reviews.js         # POST review, GET by service
│   ├── services/
│   │   ├── availability.js    # slot generation + overlap enforcement
│   │   ├── stateMachine.js    # allowed transitions map + guard functions
│   │   ├── revenue.js         # day/week SUM queries
│   │   └── images.js          # multer config, resize/compress, delete old file
│   └── uploads/               # service photos (gitignored)
├── frontend/                  # Vue 3 + Vuetify (Capacitor project root)
│   ├── src/
│   │   ├── api/               # axios client + resource modules
│   │   ├── stores/            # Pinia: auth, services, appointments
│   │   ├── views/             # Login, Register, ServiceList, Book,
│   │   │                      # MyAppointments, Queue, AdminDashboard,
│   │   │                      # AdminServices, AdminAppointments
│   │   ├── router/            # guards: auth required / admin required
│   │   └── components/        # SlotPicker, ServiceCard, StatusChip, RatingInput
│   ├── capacitor.config.ts
│   └── www/                   # built bundle Capacitor wraps into APK
└── .planning/
```

### Structure Rationale

- **backend/routes vs backend/services:** routes stay thin (HTTP only); the availability engine and state machine are pure logic that can be tested directly — this is the part most likely to have subtle bugs, so isolating it pays off immediately.
- **backend/db/queries/:** SQL lives beside the pool, not scattered inline in routes — revenue and availability queries are complex enough to deserve their own files.
- **frontend/api/ + stores/:** all network calls in one layer means the Capacitor server URL (dev `localhost` vs production host) is configured in exactly one place.
- **frontend/views/ per screen:** maps1:1 to requirements in PROJECT.md, so phase work has an obvious home.

## Architectural Patterns

### Pattern 1: Layered monolith with JWT role middleware

**What:** Three strict layers — route (HTTP) → service (business rules) → db (SQL). Auth via JWT carrying `role` in the payload; two middleware functions gate every protected route.
**When to use:** Always, for this project. Single salon, single admin, low traffic — no microservices, no GraphQL, no ORM needed.
**Trade-offs:** (+) simple to reason about and deploy; (+) same JavaScript frontend/backends. (−) no compile-time SQL safety (mitigate with parameterized queries everywhere).

**Example:**
```javascript
// middleware/roles.js
const requireRole = (...allowed) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ msg: 'Sem autenticação' });
  if (!allowed.includes(req.user.role))
    return res.status(403).json({ msg: 'Acesso negado' });
  next();
};

// routes/appointments.js
router.post('/', verifyToken, bookAppointment);                 // client or admin
router.patch('/:id/status', verifyToken, requireRole('admin'), updateStatus);
```

### Pattern 2: Availability = app-side slot generation + DB-side overlap enforcement

**What:** Two independent guards. (1) The API generates candidate slots for a date by walking opening hours in service-duration steps and filtering out intervals that overlap existing `pending`/`confirmed` appointments — this powers the picker UI. (2) At booking time, a transaction re-checks overlap with `SELECT ... FOR UPDATE` and only inserts if still free.
**When to use:** Whenever durations vary and MySQL is the store.
**Trade-offs:** (+) UI shows honest availability; (+) DB transaction is the correctness guarantee. (−) MySQL has **no PostgreSQL-style exclusion constraint** for overlapping ranges (verified: multiple sources confirm "MySQL has no exclusion constraints — lock the resource, then look"), so the transaction lock must be written carefully.

**Example:**
```sql
-- inside a transaction (isolation REPEATABLE READ is fine)
SELECT id FROM appointments
WHERE date = ? AND status IN ('pending','confirmed')
  AND start_time < DATE_ADD(?, INTERVAL ? MINUTE)   -- newEnd
  AND end_time   > ?                                 -- newStart
FOR UPDATE;

-- if 0 rows → INSERT ...; if rows → ROLLBACK, return 409 "horário acabou de ser ocupado"
```
**Extra safety for a single-resource salon:** a MySQL named lock serializes all bookings for one day cheaply:
```sql
SELECT GET_LOCK(CONCAT('book_', ?date), 5);   -- ... insert ... SELECT RELEASE_LOCK(...);
```
At salon scale (one stylist, a few dozen bookings/day) this is plenty and avoids gap-lock subtleties. Confidence: HIGH for the pattern; MEDIUM for which lock flavor performs best (validate in the booking phase).

**Slot generation (service side):**
```javascript
// pseudo: greedy walk over opening hours
for (t = open; t + duration <= close; t += STEP /* 15 or 30 min */) {
  if (!overlapsExisting(t, t + duration) && !isPast(t)) slots.push(t);
}
```
Confidence: MEDIUM-HIGH — interval/greedy slot filling is the standard approach (interval-scheduling literature); step granularity (15/30 min) is a product choice.

### Pattern 3: Appointment state machine enforced server-side

**What:** A transition map; every status change goes through one function that rejects illegal moves.
**When to use:** Any appointment lifecycle. Server-side enforcement matters because the client must never be able to set arbitrary status (e.g. mark own booking `completed` to fake revenue).

```
                 ┌──────────── admin confirm ───────────┐
                 ▼                                       │
  [pending] ──admin reject──▶ [rejected]                 │
      │                                               │
      ├── client cancel──▶ [cancelled]                 │
      │                                               │
      └──admin confirm──▶ [confirmed] ──admin complete─▶ [completed] (terminal, counts revenue)
                               │
                               └──client/admin cancel─▶ [cancelled]
```

**Example:**
```javascript
const TRANSITIONS = {
  pending:   ['confirmed', 'rejected', 'cancelled'],
  confirmed: ['completed', 'cancelled'],
  completed: [], rejected: [], cancelled: [],
};
function transition(current, next, actor, appointment) {
  if (!TRANSITIONS[current]?.includes(next)) throw new HttpError(409, 'Transição inválida');
  if (next === 'completed' && actor.role !== 'admin') throw new HttpError(403, '...');
  if (next === 'cancelled' && actor.role === 'client' && appointment.user_id !== actor.id)
    throw new HttpError(403, '...');
}
```

**Blocking rules tied to status:** availability treats `pending` **and** `confirmed` as occupying time (a pending request must hold the slot until rejected/expired); revenue counts only `completed`.

### Pattern 4: Price snapshot on the appointment row

**What:** `appointments.price_at_booking` copies `services.price` at booking time; revenue reads the snapshot.
**When to use:** Always, when price can change over time.
**Trade-offs:** (+) editing a service price never rewrites past earnings; (−) one denormalized column. Without it, the admin editing a price silently changes yesterday's reported revenue — a classic reporting bug.

### Pattern 5: Local-disk image storage for service photos

**What:** multer accepts image → compress/resize → save to `backend/uploads/` → DB stores only relative path → Express serves `/uploads` statically; the API returns absolute URLs built from the API base URL.
**When to use:** Small app, few dozen service photos, one server. Community consensus: local storage is fine for learning/small-medium apps; cloud (S3/Cloudinary) is for production robustness/scale (MEDIUM confidence, from community sources).
**Trade-offs:** (+) zero cost, trivial to debug; (−) tied to server disk — mitigate by keeping photos replaceable assets, not irreplaceable data. Note: if the API host restarts on ephemeral storage, revisit; that's a hosting decision, not a schema change.

## Data Flow

### Request Flow (booking a slot)

```
Cliente toca "Marcar"
    ↓
BookView → api/appointments.post()
    ↓  (JWT interceptor adds Authorization header)
Express route → verifyToken → validation → services/availability.book()
    ↓                                              ↓
GET_LOCK / SELECT..FOR UPDATE (overlap check)      ↓
    ↓ free?                                        ↓
INSERT appointments (status='pending', price snapshot)
    ↓
Response { id, status:'pending' } → store → UI shows "A aguardar confirmação"
```

### Key Data Flows

1. **Booking:** client picks service+date+slot → API validates against generated slots → transactional overlap check → insert `pending` → slot immediately disappears for other clients (pending blocks availability).
2. **Confirmation queue:** admin loads `GET /appointments?date=today&status=pending` → PATCH status → state machine validates → row updates. Client sees new status on next fetch (polling or pull-to-refresh; no websockets — out of scope per PROJECT.md).
3. **Revenue:** admin dashboard → `GET /reports/revenue?range=day|week` → SQL `SUM(price_at_booking) WHERE status='completed' AND date BETWEEN ... GROUP BY DATE(date)`.
4. **Review:** client opens a `completed` appointment → POST /reviews (rating 1–5 + comment) → enforce one review per appointment via UNIQUE(appointment_id) → review shows on service card (AVG rating computed in services list query).
5. **Queue view:** `GET /appointments?date=today` ordered by `start_time` — the "fila" is simply today's appointments with their status; no separate queue table.

### State Management (frontend)

```
Pinia stores: auth (token, role, user) | services (list) | appointments (mine/today)
    ↑ persisted token in Capacitor Preferences / localStorage
router guards: requiresAuth, requiresAdmin → redirect /login
```

## Data Model (core tables)

| Table | Key columns | Notes |
|-------|-------------|-------|
| `users` | id, name, email UNIQUE, password_hash, role ENUM('client','admin'), phone | admin seeded by migration |
| `services` | id, name, description, price DECIMAL(10,2), duration_minutes, photo_path, active | active flag = soft delete, keeps history intact |
| `appointments` | id, user_id FK, service_id FK, date DATE, start_time, end_time, status ENUM('pending','confirmed','completed','rejected','cancelled'), price_at_booking, created_at | `end_time = start_time + duration` stored at write; index on (date, status) |
| `reviews` | id, appointment_id FK UNIQUE, user_id FK, service_id FK, rating TINYINT CHECK 1–5, comment, created_at | UNIQUE(appointment_id) = one review per appointment |

**Relationships:** users 1—N appointments; services 1—N appointments; appointments 1—1 reviews. Revenue = aggregate over appointments, not a separate ledger table (premature at this scale).

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0–1k users (target, single salon) | Monolith as designed; polling for updates; local image disk; index (date, status) on appointments |
| 1k–100k | Move photos to S3/Cloudinary; add covering index for availability query; consider websocket/push for admin confirmations |
| 100k+ | Split availability service; read replicas for reports; queue-based booking holds |

### Scaling Priorities

1. **First bottleneck:** availability query under lock contention (only if multiple stylists are ever added — out of scope today).
2. **Second bottleneck:** image disk space / bandwidth — swap storage driver without touching schema (photo_path stays).

## Anti-Patterns

### Anti-Pattern 1: Check-then-insert without a lock ("SELECT free → INSERT")

**What people do:** `SELECT ... WHERE overlap` in one query, then `INSERT` in a second statement, no transaction/lock.
**Why it's wrong:** two simultaneous requests both see the slot free and both insert — classic race; MySQL's lack of exclusion constraints means nothing stops the second insert (verified against InnoDB locking docs + multiple articles).
**Do this instead:** wrap check + insert in one transaction with `SELECT ... FOR UPDATE` (or `GET_LOCK` per day) and return 409 on conflict.

### Anti-Pattern 2: Letting the client dictate status

**What people do:** `PATCH /appointments/:id { status: 'completed' }` trusting the body.
**Why it's wrong:** a client can self-confirm or self-complete bookings → corrupted queue and fake revenue.
**Do this instead:** status only through the server-side transition map with role guards (Pattern 3).

### Anti-Pattern 3: Computing revenue from current service prices

**What people do:** join appointments→services and SUM(services.price).
**Why it's wrong:** editing a service price rewrites historical earnings; dashboard numbers change retroactively.
**Do this instead:** `price_at_booking` snapshot column (Pattern 4).

### Anti-Pattern 4: Storing images as BLOBs in MySQL

**What people do:** `MEDIUMBLOB` column for photos.
**Why it's wrong:** bloats backups, kills query performance, no static caching.
**Do this instead:** file on disk + path in DB (Pattern 5).

### Anti-Pattern 5: Frontend-only slot validation

**What people do:** slot picker filters availability in Vue and POSTs the chosen time; API trusts it.
**Why it's wrong:** stale UI or direct API calls bypass the filter → double-booking.
**Do this instead:** frontend filtering is UX only; API must re-validate in the transaction.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| None required | — | No payments, no push, no maps — PROJECT.md explicitly scopes them out |
| Capacitor native bridge | Camera/photo picker only if admin shoots photos in-app | Optional: web file input works for v1; defer Capacitor Camera plugin |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| App ↔ API | HTTPS REST + JWT | Base URL configured once (dev vs prod) — critical for APK builds |
| Routes ↔ Services | Direct function calls | Keep HTTP types out of services for testability |
| Services ↔ MySQL | mysql2 pool, parameterized SQL | Never string-concatenate SQL |
| App ↔ images | `<img src="{apiBase}/uploads/...">` | Photos must use API base URL, not relative paths, inside the APK |

## Build Order (dependency-driven)

1. **DB schema + migrations** (users, services, appointments, reviews) — everything depends on it.
2. **Auth** (register/login + JWT middleware + role guard) — every subsequent route needs identity.
3. **Services CRUD** (admin write, client read) — booking references services; also unblocks the catalog screen.
4. **Availability + booking engine** (slot generation, overlap transaction, state machine core) — the riskiest component; do it while fresh, with the rest of the API stable.
5. **Appointment lifecycle** (mine/list/cancel, admin confirm/reject/complete) — builds on state machine from 4.
6. **Queue view** — read-only projection of 5 (today's appointments ordered by time).
7. **Revenue reports** — needs completed appointments from 5; simple SUM queries.
8. **Reviews** — needs completed appointments + services; last because it's additive.
9. **Capacitor APK packaging** — wraps the finished Vue app; server must be reachable from a physical device.

**Rationale:** risk descends after step 4 (concurrency/state machine are the only genuinely tricky parts); 6–8 are queries over structures that already exist.

## Sources

- InnoDB Locking (official MySQL docs) — `SELECT ... FOR UPDATE`, gap locks: https://dev.mysql.com/doc/refman/9.0/en/innodb-locking.html (HIGH)
- "Prevent Double Booking: System Design" — MySQL has no exclusion constraints; lock-then-check: https://opencals.com/blog/prevent-double-booking-system-design (MEDIUM)
- "Prevent Double Booking in an Appointment System" — DB refuses second write: https://www.rakibulinux.com/blogs/prevent-double-booking-appointment-system (MEDIUM)
- Aldridge Dagos — constraint-where-the-data-lives, check-then-insert race analysis: https://aldridgedagos.com/writing/prevent-double-booking-database-constraints/ (MEDIUM)
- freeCodeCamp — Express RBAC with JWT + role middleware: https://www.freecodecamp.org/news/role-based-access-control-nodejs-rest-api-jwt/ (HIGH — pattern directly applicable)
- Stately / appointment state diagrams — pending→confirmed→completed lifecycle: https://stately.ai/blog/2023-10-02-what-is-a-state-machine (MEDIUM)
- r/node + dev.to — local vs cloud image storage consensus for small Node apps: https://dev.to/bhupeshchandrajoshi/storing-uploaded-files-and-serving-them-in-express-2jh5 (LOW-MEDIUM, community)
- MySQL SUM/GROUP BY date functions for revenue reports: https://www.datacamp.com/doc/mysql/mysql-sum (HIGH — official function docs)

---
*Architecture research for: Salão Linda (salon booking system)*
*Researched: 2026-11-16*
