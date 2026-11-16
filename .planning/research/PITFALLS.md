# Pitfalls Research

**Domain:** Salon booking/management mobile app (Capacitor + Vue 3 + Vuetify + Node/Express + MySQL)
**Researched:** 2026-11-16
**Confidence:** HIGH (each pitfall sourced from official docs or multiple credible sources; confidence noted per-section where lower)

> Phase names below are **topic-based placeholders** (the roadmap does not exist yet). The roadmap creator should map each "Phase to address" entry onto the actual phase structure (PROJECT.md targets 3–5 coarse phases).

## Critical Pitfalls

### Pitfall 1: Double-booking race — check-then-insert in application code

**What goes wrong:**
Two clients request the same slot within milliseconds. The API runs "SELECT to check slot is free → INSERT booking" as two separate statements. Both SELECTs see an empty slot (neither INSERT committed yet), both INSERTs succeed, and the salon ends up with two clients at 10:00. This does NOT require heavy traffic — two people tapping the same popular Sunday-evening slot a few hundred milliseconds apart is enough. A booking screen that says "only 1 slot left" makes the collision *more* likely, not less.

**Why it happens:**
Developers treat the availability endpoint as the guarantee. It isn't — it's a cache of the truth that is allowed to be wrong for a second. The write is where correctness lives. MySQL's default InnoDB REPEATABLE READ isolation does not save you: a plain `SELECT` reads a snapshot and takes no locks. Also common: a `UNIQUE(staff_id, starts_at)` index is assumed to be enough — it only catches bookings starting at the *exact same minute*, not a 10:00–11:00 cut overlapping a 10:30–11:30 braid (appointments are intervals; a point-uniqueness constraint can't see intervals).

**How to avoid:**
Put the guard in the database, in one transaction:

```sql
START TRANSACTION;
SELECT id FROM staff WHERE id = ? FOR UPDATE;   -- serialize per staff member
SELECT COUNT(*) FROM bookings
 WHERE staff_id = ? AND status NOT IN ('cancelled','rejected')
   AND starts_at < ? AND ends_at > ?;           -- interval overlap check
-- insert only if count = 0
INSERT INTO bookings (...) VALUES (...);
COMMIT;
```

The `FOR UPDATE` on the staff row makes concurrent bookings for the same stylist queue behind each other while other stylists stay parallel. Map a lost race to HTTP 409 and show "Este horário acabou de ser preenchido" with refreshed slots — never a generic 500. Bonus hardening: an idempotency key per booking attempt so a client retry can't double-insert. (MySQL has no Postgres-style EXCLUDE constraint, so the row-lock pattern is the correct tool here.)

**Warning signs:**
- Availability logic is `if (free) insert()` with no transaction/lock
- Tests only ever exercise one booking at a time
- A "unique key" on `starts_at` is cited as the conflict protection
- The client has no handling for a conflict/409 response

**Phase to address:** Booking core phase (schema + booking endpoint must be built race-safe from day one; retrofitting locks later is a rewrite of the write path).

---

### Pitfall 2: Timezone/date handling — wall-clock vs instant confusion for slots

**What goes wrong:**
Slots drift an hour twice a year (DST), or "today" is computed in the wrong zone. Classic failures: storing `2026-11-05 10:00` with no zone and later treating it as UTC; `new Date('2026-11-05T10:00:00')` (no offset) parsed in the *server's* timezone — a Node server running UTC stores 10:00 UTC when the salon meant 10:00 Lisbon; weekday/"is today open?" logic using the ambient machine zone, which passes on a dev laptop in the right zone and breaks on a UTC server after deploy.

**Why it happens:**
The salon's business rules are wall-clock declarations ("aberto seg–sex 9h–17h") while bookings are instants. Developers collapse both into one `DATETIME` or one UTC conversion. Converting opening hours to UTC *at configuration time* freezes today's offset — when DST changes, "9h Lisboa" silently becomes 8h or 10h local.

**How to avoid (opinionated, scaled to this app):**
Salão Linda is a **single salon in one IANA zone** (e.g. `Europe/Lisbon`) — that simplifies everything:

1. **Availability rules** (opening hours, slot grid): store as wall-clock `TIME`/`VARCHAR('09:00')` + the salon's IANA zone name in a settings row. Never store a fixed offset (`+01:00`) or abbreviation (`WET`).
2. **Bookings**: store the slot's local date + local time + zone (or store a UTC instant computed at booking time **from** wall-clock + zone using the current tz database). Either is fine for one zone — pick one and be consistent.
3. **All slot generation and overlap checks happen in the salon's local clock or in UTC instants, never in "whatever zone the server happens to be in."** Pin the app timezone explicitly (`TZ=Europe/Lisbon` env on the server) and never call `new Date().getHours()`/`.getDay()` for business logic without specifying the zone.
4. Date-only values (`2026-11-05`) travel as strings, not `Date` objects; format/parse with an explicit zone (`Intl.DateTimeFormat` or a tiny lib like `date-fns-tz` / `luxon` — avoid moment.js, unmaintained).

**Warning signs:**
- `new Date("YYYY-MM-DDTHH:mm")` (no Z/offset) anywhere
- Slot generation code reads `Date.now()` / server local time to decide "today"
- A `DATETIME` column with no documented zone convention
- No `TZ` set on the deployment environment

**Phase to address:** Booking core phase (date/slot model is a schema decision — decide before tables are written). Verify again in the dashboard/revenue phase (day/week boundaries in queries).

---

### Pitfall 3: Cleartext HTTP blocked / wrong server URL baked into the APK

**What goes wrong:**
The APK installs fine, browser dev works perfectly, but every API call from the built app fails with `ERR_CLEARTEXT_NOT_PERMITTED` (or "Webpage not available"). Root causes in this stack:
- Android 9+ (API 28) blocks plain `http://` by default. A backend at `http://192.168.x.x:3000` or `http://meu-servidor.com` silently fails on device.
- WebView origin is `https://localhost` by default (`androidScheme: 'https'`), so an `http://` API request is *mixed content* and blocked even if cleartext were allowed.
- The API base URL is a Vite `VITE_*` env var **frozen at build time** — a dev builds with `.env.development` pointing at localhost, ships the APK, and it still points at localhost forever.
- Leftover `server: { url: '...' }` in `capacitor.config` (meant for live-reload) makes the app load the dev server instead of the bundle; when the dev machine is off, the app shows "Webpage not available."

**Why it happens:**
It works in the browser (where no Android network policy applies), so the failure only appears on a real device/build. Env files and Capacitor config are easy to forget because nothing errors at build time.

**How to avoid:**
- **Decide the API transport now:** ideally HTTPS on the backend (even a free cert via Caddy/Cloudflare/Nginx) → zero cleartext config needed. If the MVP must run plain HTTP (local network / hobby hosting), set explicitly:
  ```json
  { "server": { "androidScheme": "http", "cleartext": true } }
  ```
  or better, a scoped `network_security_config.xml` with `<domain-config cleartextTrafficPermitted="true">` for the API host only. Note `server.cleartext` is documented **for live-reload, not production**; prefer the scoped network security config for a production HTTP build. Google is deprecating `usesCleartextTraffic` in favor of the XML config anyway.
- API base URL via one central `src/config.js` reading `import.meta.env.VITE_API_BASE_URL`, with a **build-time guard** that throws if missing. Separate `.env.production` / `.env.development`. Never hardcode URLs in components.
- Never commit `server.url` (live-reload) to the config used for release builds.
- Verify with `grep -o "usesCleartextTraffic=\"true\""` after `npx cap sync` and a smoke test of the **release APK on a physical device**, not just the dev build.

**Warning signs:**
- API calls tested only in `npm run dev`
- `.env` has `VITE_API_BASE_URL=http://localhost:3000` with no production override
- `server.url` present in `capacitor.config.ts`
- No `VITE_`-prefix validation at build

**Phase to address:** Android packaging phase (must be resolved before any APK is handed to the user); API URL config decided in the foundation phase.

---

### Pitfall 4: Android back button kills the app / doesn't close modals

**What goes wrong:**
Default Capacitor behavior: the hardware/gesture back button **minimizes the app abruptly** (or does nothing useful) regardless of where the user is. Users expect: back closes an open dialog/bottom sheet first, then goes to the previous screen, and only at the root exits (or backgrounds) the app. Also, registering a `backButton` listener *replaces* default handling — if you forget `history.back()`, navigation stops working entirely.

**Why it happens:**
The WebView has no native back stack; Capacitor's default handler is a blunt minimize. Frontend devs coming from web never think about hardware back.

**How to avoid:**
Register one global handler in the app bootstrap:

```ts
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

if (Capacitor.isNativePlatform()) {
  App.addListener('backButton', ({ canGoBack }) => {
    // 1. close open Vuetify overlays first (dialog/sheet/menu), then router back
    if (overlayOpen) closeOverlay();
    else if (canGoBack) history.back();
    else App.minimizeApp(); // root: background the app (friendlier than exitApp)
  });
}
```

Wire the overlay check to Vuetify's dialog/sheet state. With Vue Router, prefer router history state over raw `window.history`.

**Warning signs:**
- Testing on browser only — hardware back never exercised
- No `backButton` listener anywhere in `src/`
- Dialog closes *and* navigates back on one press (double-action)

**Phase to address:** Android packaging phase (native behavior pass), but the router/overlay structure it depends on is set in the app-shell/foundation phase.

---

### Pitfall 5: Keyboard covers inputs; status bar/notch overlaps content (edge-to-edge)

**What goes wrong:**
On modern Android (15+/API 35+, and enforced on 16), the WebView renders **edge-to-edge** — the app draws behind the status bar and gesture bar, so the Vuetify app bar title sits under the clock. Separately, the soft keyboard covers the focused input (worst on Xiaomi/HyperOS devices per Capacitor issue #8093), and fixed-bottom elements (a "Confirmar marcação" button) jump or hide when the keyboard opens. Legacy fixes (`StatusBar.setOverlaysWebView({overlay:false})`, `backgroundColor`) are **no-ops on Android 15+/Capacitor 8** — code that "fixes" it on an old emulator does nothing on a current phone.

**Why it happens:**
WebView-on-Android keyboard/edge-to-edge behavior differs per device and Android version; Vuetify's layout was designed for a browser viewport.

**How to avoid:**
- **Edge-to-edge:** CSS-first — add `viewport-fit=cover` to the viewport meta and pad headers/footers/tabs with `env(safe-area-inset-top)` / `env(safe-area-inset-bottom)` (Capacitor ≥8.3.2 supplies insets natively; older Capacitor 7 needs the edge-to-edge plugin or `adjustMarginsForEdgeToEdge`). Don't rely on `StatusBar.setBackgroundColor`/`setOverlaysWebView` for new builds.
- **Keyboard:** use `@capacitor/keyboard` (set `resizeOnFullScreen: true` if the app is fullscreen), keep `windowSoftInputMode` at the default `adjustResize` (avoid the classic `adjustPan` hack unless a specific bug forces it), and verify the **lowest input on the longest form** (login, booking form) stays visible above the keyboard on a real device.
- Test cold-start + scrolled list + lowest form field on at least one physical device, not just Chrome DevTools mobile emulation.

**Warning signs:**
- App bar content under the clock on Android 15/16 devices
- Submit button hidden behind keyboard on login/booking forms
- `StatusBar.setOverlaysWebView` used as the *only* fix

**Phase to address:** UI/Android polish phase (but `viewport-fit=cover` + safe-area padding should be in the app shell from phase 1 — retrofitting is tedious).

---

### Pitfall 6: JWT stored in localStorage — eviction, XSS, and origin changes

**What goes wrong:**
Three distinct failures: (a) the OS **reclaims WebView localStorage** under storage pressure → user is silently logged out; (b) the token sits in plaintext in a webview store readable by any XSS or by anyone with the APK/filesystem root; (c) changing `androidScheme`/`hostname` in Capacitor config later **changes the WebView origin** → all stored auth data vanishes. localStorage is explicitly documented by Capacitor as *transient* — acceptable for a user id, not for credentials you can't lose.

**Why it happens:**
Web-dev habit: `localStorage.setItem('token', jwt)` works in the browser demo and nobody hears about it until the field test.

**How to avoid (pragmatic for this app):**
- Store the token with **`@capacitor/preferences`** (SharedPreferences-backed, survives OS cleanup, falls back to localStorage on web) — this is the official Capacitor recommendation for small key-value data and the standard fix for "task-killed → logged out."
- Do **not** treat Preferences as secure storage (it's plaintext, included in backups). Given the threat model (neighborhood salon, single admin), Preferences + **short-lived access JWT (15 min) + refresh token** is a reasonable MVP line; if budget allows, upgrade to `@capawesome-team/capacitor-secure-preferences` (Android Keystore encryption) — it's a near drop-in API.
- Never persist long-lived tokens; never put secrets/PII in the JWT payload (it's base64, not encrypted).
- Wrap storage behind one `authStorage` module that branches on `Capacitor.isNativePlatform()` so web and native paths stay swappable.
- Decide `androidScheme`/`hostname` **before shipping** — changing it later logs everyone out.

**Warning signs:**
- `localStorage.setItem` with the token anywhere in `src/`
- Access token with `expiresIn: '30d'`
- Config churn on `server.androidScheme` after v1 ships

**Phase to address:** Auth phase (storage decision belongs with login implementation).

---

### Pitfall 7: Admin auth secured only in the frontend (and other JWT/RBAC mistakes)

**What goes wrong:**
The admin dashboard screens are hidden behind a route guard, but the **API endpoints have no role check** — any client that inspects the bundle can `GET /api/admin/revenue` or `POST /api/services` as a plain customer. Related failures seen constantly in this stack:
- Signup endpoint accepts `role` from the request body → anyone registers as `admin`
- `jwt.decode()` used instead of `jwt.verify()` (no signature check → forged tokens accepted)
- Algorithm not pinned (`alg: none` / HS/RS confusion)
- No rate limiting on `/login` → brute force
- JWT secret hardcoded in source or committed `.env`
- One 30-day access token, no revocation → stolen token = permanent admin access

**Why it happens:**
Frontend route guards *feel* like security, and a single-admin app tempts "we'll add checks later." Demo testing never involves an attacker with curl.

**How to avoid:**
- **Server-side, on every admin route:** `authenticate` (verify JWT, pin `{ algorithms: ['HS256'] }`) + `authorize('admin')` middleware. UI hiding is a nicety, never the boundary. 401 unauthenticated, 403 wrong role.
- Signup **hardcodes** `role: 'customer'`; promotion to admin only via an already-authenticated admin path (or seeded directly in the DB for the dona).
- Short access token (15 min) + refresh token (rotation, stored hashed server-side) — refresh token in memory/Preferences on mobile, not a long-lived bearer.
- Secrets via `process.env.JWT_SECRET` (≥256-bit random), never in code; `.env` gitignored.
- Rate-limit `/login` (and `/refresh`) — e.g. `express-rate-limit`.
- Query scoping: every "my bookings" query filters by `req.user.id` — never trust an `userId` field from the client body (IDOR: one customer reading/cancelling another's bookings).

**Warning signs:**
- Any `/api/admin/*` route without auth middleware
- `role` read from `req.body` at registration
- `jwt.decode(` in middleware
- Secret visible in the repo
- No 403 tests

**Phase to address:** Auth phase (middleware exists before any admin endpoint is written); audited again in the admin/dashboard phase.

---

### Pitfall 8: MySQL schema mistakes for bookings and revenue

**What goes wrong:**
- **Money as FLOAT/DOUBLE:** `SUM()` drifts (a demo of 1M rows of 0.29 drifts ~0.28 in FLOAT), `WHERE amount = 19.99` misses rows. The dona's "ganhos do dia" is off by cents — fatal for a feature whose whole core value is "saber quanto faturou."
- **No price snapshot:** booking stores only `service_id` + FK join to `services.price`. Admin edits a service price → *historical* bookings/revenue reports retroactively change. Reports must be reproducible.
- **Overlap queries unindexed:** the conflict check `WHERE staff_id = ? AND starts_at < ? AND ends_at > ?` without a composite index `INDEX(staff_id, starts_at)` (and ideally `(staff_id, starts_at, ends_at)`) full-scans as bookings grow.
- **Status as free-text** (`'confirmada'`, `'Confirmada'`, `'confirmed'`…) → revenue queries silently miss rows. No ENUM/CHECK discipline.
- **Hard DELETE of bookings** → lost audit trail; can't reconstruct "what happened today," breaks revenue history when a client cancels. Prefer `status='cancelled'` (+ optional `deleted_at`).
- **No created/updated timestamps** or no index on `DATE(starts_at)`/status for dashboard day/week queries.
- **DATETIME without tz convention** (see Pitfall 2).

**Why it happens:**
Schema designed around CRUD screens instead of around the two queries that matter (conflict check; day/week revenue), and JS `number` habits leaking into column types.

**How to avoid:**
```sql
CREATE TABLE bookings (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  customer_id   BIGINT UNSIGNED NOT NULL,
  service_id    BIGINT UNSIGNED NOT NULL,
  starts_at     DATETIME NOT NULL,           -- documented: salon wall-clock, zone Europe/Lisbon
  ends_at       DATETIME NOT NULL,
  price         DECIMAL(10,2) NOT NULL,      -- SNAPSHOT of service price at booking time
  duration_min  SMALLINT NOT NULL,           -- snapshot too
  status        ENUM('pending','confirmed','rejected','completed','cancelled') NOT NULL DEFAULT 'pending',
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_staff_window (customer_id, starts_at),      -- my-bookings + conflict check
  INDEX idx_status_window (status, starts_at)           -- dashboard day/week
) ENGINE=InnoDB;
```
- All money columns `DECIMAL(10,2)`; JS does arithmetic on numbers only for display — sum in SQL (`SUM(price)`), round once.
- Snapshot `price` (and duration) onto the booking row at creation; FK to `services` is for reference, not for history.
- Cancel = status transition, never `DELETE`.
- Document the timezone convention in a schema comment on day one.

**Warning signs:**
- `FLOAT`/`DOUBLE` on any price/total column
- `SELECT ... JOIN services ON ... s.price` used for revenue of *past* bookings
- `DELETE FROM bookings` in app code
- Conflict query in an `EXPLAIN` showing full table scan

**Phase to address:** Foundation/schema phase (table design is the earliest irreversible decision); revenue correctness verified in the dashboard phase.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Check-then-insert booking with no DB lock | 10 lines of code, "works" in demo | Double-bookings in production; apologizing to clients; feature rewrite | **Never** — this is the core of the product |
| Money as DOUBLE/FLOAT | No type friction with JS numbers | Off-by-cents reports; failed equality joins; eroded trust in the dashboard | **Never** for stored money |
| Admin auth as frontend route guard only | Ship admin UI today | Full API compromise via curl; customer can edit services | **Never** |
| JWT in localStorage | Familiar, sync API | Silent logouts (eviction), XSS exposure, origin-change wipe | Only throwaway prototypes |
| Hard-delete bookings | Simple schema | Lost audit/revenue history | **Never** — status flag is nearly free |
| `server.url` live-reload config committed | Faster dev loop | Shipped APK loads dev server → dead app | Dev-only config branches, never release |
| No `VITE_API_BASE_URL` validation | One less line | APK ships pointing at localhost; discovered only on device | Only if a CI smoke test checks the built bundle |
| One long-lived (30d) access token, no refresh | No refresh logic to write | Stolen token = month of admin access; no revocation | Prototype on a private device only |
| Skipping rate-limit on /login | Fewer deps | Credential brute-force against a public API | Only while API is behind a secret network (it won't be) |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Android ↔ HTTP API | `ERR_CLEARTEXT_NOT_PERMITTED` on device while browser works | HTTPS backend, or scoped `network_security_config.xml` / `server.cleartext` + `androidScheme:'http'` (dev only) — see Pitfall 3 |
| Vite ↔ Capacitor | `VITE_API_BASE_URL` read from `.env.development` baked into release APK | `.env.production` per mode + build-time guard that throws when missing; central `src/config.js` |
| Vite ↔ Capacitor | Absolute asset paths (`base: '/'`) break when WebView loads from its own origin | `vite.config: { base: './' }` for embedded builds |
| `@capacitor/camera` ↔ Android | Declaring `READ_MEDIA_IMAGES`/`READ_EXTERNAL_STORAGE` broadly → Google Play policy rejection; raw `<input type=file>` in WebView behaves inconsistently | Use `Camera.takePhoto()` / `chooseFromGallery()` (Android Photo Picker — **no permissions needed**); compress (`quality`, `targetWidth`) before upload — full-res base64 photos can OOM the WebView |
| `@capacitor/app` back button | Listener registered but doesn't close Vuetify overlays, or never calls `history.back()` | Global handler: overlay → history.back → minimize (Pitfall 4) |
| Status bar plugin | `setOverlaysWebView`/`backgroundColor` used as fix — no-ops on Android 15+/targetSdk 36 | CSS safe-area padding + `viewport-fit=cover` (Pitfall 5) |
| Express ↔ mysql2 | `pool.getConnection()` never released on error paths → pool exhaustion after a few hours | `try/finally` with `connection.release()`, or promise-wrapper with guaranteed release; cap pool size |
| Express ↔ MySQL | String-concatenated SQL → injection (single admin app, still the #1 API risk) | Parameterized queries (`?` placeholders) exclusively |
| JWT ↔ Node | Secret in source / `jwt.decode()` / unpinned algorithm | env var, `verify()` with `{ algorithms: ['HS256'] }` |
| Timezone ↔ Node | `new Date('YYYY-MM-DDTHH:mm')` parsed as server-local; `TZ` unset on host | Explicit zone strings + `TZ=Europe/Lisbon` on server; never ambient-zone date math (Pitfall 2) |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Unindexed overlap/status queries | Booking endpoint and dashboard slow down as `bookings` grows; `EXPLAIN` shows full scan | Composite indexes `(customer_id, starts_at)`, `(status, starts_at)` from day one | Thousands of rows — a busy salon hits this within a year of daily use; the conflict-check query runs on *every* booking attempt |
| Loading all bookings into `v-data-table` for the admin | Janky scroll, slow first paint of "Minhas Marcações"/admin lists | Server-side pagination (`v-data-table-server`) or at least date-range-limited queries | Hundreds of rows; customer lists grow unbounded |
| Uncompressed service photos as base64 in memory | WebView OOM crashes on low-end phones; slow upload | `quality: 60–85`, `targetWidth/Height ≤ 1024–2048`, JPEG; upload as Blob/File not data-URL where possible | Any multi-megapixel photo on a budget Android |
| No timeout/retry on API calls | Spinner hangs forever on weak 3G (salon clients on mobile data) | Axios/fetch timeouts + friendly retry UI; app must degrade gracefully when offline (bundle loads from APK, API doesn't) | Not scale — happens on day one in the field |
| `SELECT *` + JSON round-trips for dashboards | Dashboard slow as data grows | Aggregate in SQL (`SUM(price) GROUP BY DATE(starts_at)`) | Hundreds of bookings |
| mysql2 sync-style blocking calls | Node event loop stalls under concurrent requests | Use the promise API (`mysql2/promise`), never `querySync` patterns | Any concurrency — 2 clients booking at once |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Admin routes without server-side role check | Any customer with curl manages services/revenue | `authenticate` + `authorize('admin')` on every `/api/admin/*` (Pitfall 7) |
| `role` accepted from signup body | Self-registration as admin | Hardcode `role:'customer'` at signup; seed admin in DB |
| IDOR on bookings (`/api/bookings/:id` by id only) | Customer cancels/reads someone else's booking | Scope every query by `req.user.id`; return 404/403 on mismatch |
| JWT secret in source or weak | Full token forgery → admin takeover | `process.env.JWT_SECRET` ≥256-bit random, gitignored `.env`, rotate if leaked |
| Long-lived access token, no rate limiting | Brute force; prolonged theft window | 15-min access + rotating refresh; `express-rate-limit` on `/login` |
| Cleartext HTTP carrying credentials | Token/password sniffable on shared Wi‑Fi | HTTPS end-to-end; if HTTP is unavoidable for MVP, document the risk and keep tokens short-lived |
| Passwords not hashed with bcrypt/argon2 | DB leak = plaintext passwords | `bcrypt` (cost ≥10) or argon2; never store/receive plaintext |
| Secrets in `VITE_*` env vars | Everything in the bundle is public | VITE_ vars are for non-secret config only (API URL, flags) — secrets live server-side |
| Trusting client-sent `price`/`total` on booking create | Client books a service for 0.01 | Server recomputes price/duration from `services` table; client sends only `service_id` + slot |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Slot list shows times that get rejected at confirm (stale availability) | Frustration, lost booking, calls to the salon | Treat availability as advisory; on 409, refresh slots inline and preselect the next free one with a clear pt message |
| No timezone/label on slot times | Client shows up an hour off (or doubts the app) | Render times in the salon's zone with a visible label ("Horas de Lisboa") |
| Back button exits app instead of closing a dialog | Perceived as a crash/bug | Global back handler (Pitfall 4) |
| Keyboard covers the submit button on login/booking | Client can't finish booking on common Android keyboards | Keyboard/viewport handling + test lowest field (Pitfall 5) |
| `v-data-table` on 360px-wide phone: horizontal scroll / unreadable columns | Admin can't review bookings on her phone — the whole point of the APK | Use mobile card layouts (`mobile-breakpoint` prop, restored in Vuetify ≥3.6) or custom list rows; verify on a real narrow screen |
| Dialogs as centered desktop modals on phones | Awkward reach, clipped content | `useDisplay().mobile` → `v-dialog fullscreen` / `v-bottom-sheet` for pickers (service selection, date/time) |
| Cancelling feels destructive with no confirmation | Accidental taps cancel a real booking | Confirm dialog + toast with undo where feasible; distinguish cancel vs. reschedule |
| No offline/error state (APK loads instantly, API fails silently) | "App is broken" on weak network | Global error toasts, retry buttons, skeleton/loading states on every data view |
| Status shown only by color | Color-blind clients miss rejected bookings | Color + icon + text label on every status chip |

## "Looks Done But Isn't" Checklist

- [ ] **Booking creation:** "works" single-threaded — verify with **two concurrent requests** to the same slot; one must get 409. Check for transaction + `FOR UPDATE` in code.
- [ ] **Revenue dashboard:** matches manual cash count — verify money columns are `DECIMAL`, sums happen in SQL, and historical rows aren't affected by later price edits (price snapshot).
- [ ] **Auth:** try calling an `/api/admin/*` endpoint with a **customer token** and with **no token** — both must be rejected server-side (401/403), not just hidden in UI.
- [ ] **APK API connectivity:** release build (not live-reload) on a **physical device** on real mobile data — not emulator, not `npm run dev`.
- [ ] **Login persistence:** background the app, kill it from recents, reopen — still logged in (Preferences, not localStorage). Then rotate a `VITE_API_BASE_URL` and confirm a rebuild was actually required/ran.
- [ ] **Back button:** with a dialog open → closes dialog; nested route → previous screen; root → backgrounds app (three separate tests).
- [ ] **Keyboard:** lowest input on the login and booking forms visible above keyboard on a device with a soft keyboard (test a Xiaomi/Redmi-class phone if possible).
- [ ] **Status bar:** content not under the clock/notch on Android 15+ device.
- [ ] **Slot generation:** change device timezone (or server `TZ`) and confirm slots/day boundaries don't shift — business rules must not read ambient zone.
- [ ] **Photos:** pick/take a photo on a real device, confirm upload size/quality, and confirm **no broad storage permissions** were declared.
- [ ] **IDOR:** customer A's token against customer B's `booking_id` → rejected.
- [ ] **DST sanity:** booking created before a clock change still displays at the correct salon-local time after it (single-zone app: verify slot grid around the transition dates).

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Double-booked slot discovered in prod | **HIGH** (customer trust) | Manually reconcile affected bookings; add transaction/lock immediately; write a concurrency test; notify affected clients personally — for a salon, a phone call, not an email |
| Revenue wrong due to FLOAT/price-mutation | **MEDIUM** | `ALTER TABLE ... MODIFY price DECIMAL(10,2)`; recompute history is only possible if raw data retained — otherwise footnote the report and re-audit manually against receipts |
| Token storage migration (localStorage → Preferences) | **LOW–MEDIUM** | One-time migration read from localStorage → Preferences on first launch; force re-login if missing; delete old keys after copy |
| APK shipped pointing at wrong URL / cleartext blocked | **MEDIUM** (rebuild + redistribute APK) | Fix `.env.production`/config, rebuild, reinstall — no server-side fix exists; **prevent** via on-device smoke test |
| Missing admin authorization found late | **MEDIUM–HIGH** (assume compromise) | Add middleware to all routes, rotate JWT secret (logs everyone out), audit logs for abused endpoints, check whether service/revenue data was altered |
| Timezone drift already in stored bookings | **HIGH** (ambiguous history) | Freeze existing data as-is, document the convention, convert only new writes; manually review bookings around DST transition dates |
| Edge-to-edge/keyboard issues found by users | **LOW** | CSS safe-area padding + keyboard plugin config; ship as a patch build |

## Pitfall-to-Phase Mapping

Roadmap phases don't exist yet — map these topic labels onto the 3–5 coarse phases when creating the roadmap. Ordering rationale: **schema + auth + booking correctness are the irreversible decisions and must precede UI polish and APK packaging.**

| Pitfall | Prevention Phase (topic) | Verification |
|---------|--------------------------|--------------|
| 1. Double-booking race | **Booking core** (schema + write path) | Concurrent-request test returns exactly one 200 + one 409 |
| 2. Timezone/slot handling | **Foundation/schema** (date model decision) | DST-boundary and `TZ`-change tests pass; no ambient-zone date code (`grep` for `new Date('...T...')` without offset) |
| 3. Cleartext/server URL | **Foundation** (API config) + **Android packaging** | Release APK on physical device hits production API; build fails if `VITE_API_BASE_URL` missing |
| 4. Back button | **App shell** (handler) / **Android packaging** (test pass) | 3-case adb back-button test script passes |
| 5. Keyboard/status bar | **App shell** (safe-area from day 1) / **Android packaging** (device pass) | Lowest form field visible above keyboard; content clear of status bar on Android 15+ |
| 6. JWT storage | **Auth** | Kill-app-from-recents test keeps session; no `localStorage` token hits in `src/` |
| 7. Admin auth/RBAC | **Auth** (middleware first) → enforced in **Admin/dashboard** | Negative tests: no token → 401, customer token on admin route → 403 |
| 8. MySQL schema (money, snapshot, indexes, status) | **Foundation/schema** | `EXPLAIN` on conflict + revenue queries uses indexes; dashboard matches cash count; price edit doesn't change history |
| Vuetify mobile layout | **Admin/dashboard UI** + **booking UI** | Tested at 360px width on device, not just DevTools |
| Photo capture/upload | **Services CRUD** (admin photos) | Real-device pick+upload; manifest has no broad `READ_MEDIA_*` |
| Pool exhaustion / injection | **Foundation/API** | Error-path connection release test; `grep` for string-concatenated SQL |

## Sources

- Prevent double-booking via DB locking — opencals.com/blog/prevent-double-booking-system-design (2026-10), dev.to stangineer (2026-10), kdpisda.in Ambarsthan case study (2026-03) — MySQL `FOR UPDATE` pattern, unique-index-insufficiency, REPEATABLE READ snapshot behavior — **HIGH** (multiple independent sources agree; consistent with InnoDB semantics)
- Timezone handling in scheduling — appntmnts.io (2026-07), muneebdev.com DST-booking guide (2026-07), meet.neos.network (2026-07), dev.to Casablanca salon post-mortem (2026-06) — wall-clock vs instant, IANA zones, server-TZ leakage — **HIGH**
- Capacitor config / cleartext — capacitorjs.com/docs/config (official, v8): `server.cleartext` "not intended for production", cleartext disabled by default API 28 — **HIGH**; Android network security config — developer.android.com/privacy-and-security/security-config — **HIGH**; usesCleartextTraffic deprecation + Android 17 CT defaults — censuus.com citing Android docs (2026-10) — **MEDIUM**
- Back button / status bar / keyboard — capacitorjs.com/docs/apis/app (official `backButton`, `exitApp`), capacitorjs.com/docs/apis/status-bar (official: `overlaysWebView`/`backgroundColor` not available Android 15+, Android 16 edge-to-edge enforcement), capacitorjs.com/docs/apis/system-bars, capawesome edge-to-edge guide (Capacitor 8.3.2 CSS-first), ionic-team/capacitor issue #8093 (keyboard/status bar on HyperOS) — **HIGH**
- Storage — capacitorjs.com/docs/guides/security + /guides/storage (official: localStorage transient/evictable, Preferences API recommendation), capgo.app key-value comparison (2026-10), capawesome secure-preferences docs — **HIGH**
- Camera/file picker — capacitorjs.com/docs/apis/camera (official Android Photo Picker, no permissions unless `saveToGallery`), capawesome file-handling & camera guides, capgo scoped-storage article (Play policy on `READ_MEDIA_*`) — **HIGH**
- Money in MySQL — dev.mysql.com "Problems with Floating-Point Values" (official), techearl.com DECIMAL vs integer cents (2026-05), Aaron Francis "Storing money in MySQL", aliyun 1M-row FLOAT drift experiment (2026-09) — **HIGH**
- JWT/RBAC — freecodecamp RBAC article (2026-07), auth0 Express RBAC sample, knowledgegate JWT refresh article (2026-08), stackdevlife secure Node checklist (2025-06) — verify-vs-decode, pin algorithms, rate limiting, signup role hardcoding — **HIGH** (industry-standard, multiple sources)
- Vuetify mobile — v3.vuetifyjs.com display/`useDisplay` docs, data-table mobile mode restored in v3.6 (SO answer citing vuetify issue #16784), `mobile-breakpoint` prop docs (v3.4+), bottom-sheet docs — **MEDIUM–HIGH** (official docs + issue tracker)
- Vite env build-time semantics — vite.dev/guide/env-and-mode (official), laplusda "Vite env undefined in production" (2026-08), tidewave build-time vs runtime (2026-10) — **HIGH**
- Capacitor↔Vite packaging — otakit.app Vite→Capacitor guide (2026-07): `base: './'` for WebView origins — **MEDIUM**

---
*Pitfalls research for: Salão Linda (salon booking/management APK — Capacitor + Vue + Vuetify + Express/MySQL)*
*Researched: 2026-11-16*
