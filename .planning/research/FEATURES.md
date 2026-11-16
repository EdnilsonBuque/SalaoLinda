# Feature Research

**Domain:** Salon booking / management mobile app (single small beauty salon)
**Researched:** 2026-11-16
**Confidence:** MEDIUM-HIGH

Competitor evidence gathered from official product pages (Booksy, Fresha, Square Appointments), specialized small-salon tools (Tilavon, Barberly, NextMe, Qeazy, WaitQ), retention/UX industry sources, and owner community threads (Reddit, Trustpilot, Capterra). Confidence per claim noted in Sources.

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete. Split by who feels the pain.

**Client side:**

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Service catalog with **photo, price, duration** | Fresha explicitly sells "price and timeframe for all services on a simple menu"; Booksy clients pick service → see open slots. Price visibility is the #1 current pain (PROJECT.md: "sem informação de preços/disponibilidade") | LOW | Admin CRUD already in scope — the catalog is a *view* of it. Duration is load-bearing: it drives slot math |
| Booking flow: service → date → time → confirm | The core transaction; every competitor's primary path | MEDIUM | Must be ≤ 3 taps after login. See anti-feature on forced registration |
| Availability that respects duration + prevents double-booking | A booking app that lets two clients collide at 14:00 is broken, not incomplete | **HIGH** | Hardest logic in the product. Needs slot generation, buffer/overlap rules, and the admin's confirm step as a second gate |
| "Minhas Marcações" list with status | Client must answer "did my booking go through?" without calling the salon | LOW | Status labels (pendente/confirmada/rejeitada/cancelada) are the entire communication layer per Out of Scope |
| Client-initiated cancel / reschedule | "Easy rescheduling" is a listed must-have in salon-software roundups; otherwise clients revert to WhatsApp | LOW-MEDIUM | Reschedule = cancel + new booking; must re-run availability check. Cancellation needs a deadline rule to protect the dona |
| Booking confirmation feedback (immediate, in-app) | Fresha: "Once you make your booking, you get the confirmation right away" — silence reads as failure | LOW | For request-approval model: immediate *"pedido enviado, aguarda confirmação"* is the confirmation |
| Login/register with roles (cliente vs dona) | Both audiences need distinct surfaces; admin without a protected area = unusable | MEDIUM | Include password reset from day 1 — "forgot password" with no reset is a top support trigger |
| Post-appointment rating (note + comment) | Reviews are core to Booksy/Fresha client apps; also a stated Active requirement | LOW | Gate it: only allow rating a *completed* booking, once, from that client |

**Admin (dona) side:**

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Pending-bookings inbox with confirm / reject | The product's approval model; without it the model doesn't exist | LOW | Reject should optionally carry a reason — silent rejection drives clients back to WhatsApp |
| Service CRUD (foto, preço, duração) | She must change prices/durations herself; hardcoded services = dev dependency for every change | LOW | |
| Daily/weekly revenue view | Core Value: "a dona sabe no fim do dia quanto faturou" | MEDIUM | Revenue = Σ price of *completed* bookings — so it depends on a real status lifecycle, not a counter |
| Today's schedule / day view | You cannot run a salon without seeing today | MEDIUM | Same data as client schedule, different projection |

### Differentiators (Competitive Advantage)

Aligned with Core Value. These are where Salão Linda wins against "call/WhatsApp/boca" and against Booksy/Fresha bloat.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Visible waiting queue / "fila"** | Directly attacks the stated pain ("fila e espera"). Competitors have *waitlists* (Square: fill gaps from cancellations; Tilavon/Barberly/NextMe: walk-in kiosks + TV displays) but those are separate paid products or Plus-tier features. For a neighborhood salon, showing "you are 3rd, ~25 min" in-app is a real, ownable win | MEDIUM | Scope it as **status of today's line**, not a full kiosk/TV walk-in system (see anti-features). Depends on today's schedule + per-service duration |
| **Approval model as a feature, not a bug** | Instant-booking competitors force full automation. Request-approval is a documented, legitimate mode (Glamorph, Creav, OctopusPro, Bookify all offer it explicitly): "owner keeps control". Single owner + variable service lengths (braids can run 3h) makes manual approval *correct* here | LOW | Position it honestly: client gets a clear pending state, not a false instant confirm |
| **Ratings tied to real completed bookings** | Booksy/Fresha reviews live on a *marketplace* (public discovery). Here ratings are private quality signal for the dona — no moderation burden, no marketplace dynamics | LOW-MEDIUM | Average + comment per service feeds "popular services" insight |
| **Popular-services insight** | "Which service actually makes money" — service-popularity reports are a named feature in Tilavon/Glown/WAJ/DINGG analytics suites, but buried behind their dashboards. Surfacing it as a simple ranked list for a 1-owner salon is disproportionate value | MEDIUM | Derived from bookings × price; needs completed-status data |
| **Lightweight, no-marketplace, zero-commission** | The loudest owner complaint about incumbents: Fresha takes 20% marketplace commission + creeping fees; Reddit: platforms "lock your clients into their own massive ecosystem, take heavy commission cuts" (verified in owner threads) | — (positioning) | Salão Linda is *her* app with *her* clients. This is the pitch, and it's the reason to reject marketplace features |
| **Portfolio photos per service** | Booksy centers "import photos" / portfolio; a braids/makeup salon sells on visuals | LOW | Admin uploads photos with the service — no separate feature needed beyond gallery view |
| **Booking history for repeat clients** | Addresses "sem registo de clientes frequentes". "Client card" is standard (Booksy client card, SalonGrid client notes) | MEDIUM | Admin sees: past visits, spend, last visit, notes. High value for a neighborhood regulars business |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Online payments / deposits / no-show fees** | Every competitor has it (Square deposits, Fresha no-show protection); feels "modern" | Explicitly Out of Scope: salon receives in person. Payment infra = gateway contracts, PCI, refunds, disputes — months of work for a feature that doesn't change the dona's actual cash flow | Register the *faturado* value when a booking completes (already in scope) |
| **Marketplace / discovery / public salon profile** | Fresha and Booksy grew on it; looks like free growth | Commission complaints are the #1 incumbent resentment; requires critical mass of salons you don't have; splits focus. Single salon = nothing to discover | Client shares her booking link; Google Business Profile instead |
| **Real-time chat / two-way messaging** | "Clients message constantly" | Out of Scope, and correctly so: status transitions (pendente/confirmada/rejeitada) + optional rejection reason cover 95%. Chat = delivery, read receipts, moderation, always-on expectation | Booking status + push/in-app notification |
| **Full walk-in kiosk, TV display, QR check-in** | Barbershop tools (Barberly, ScanQueue, NextMe, WaitQ) make it look standard | Built for multi-staff barbershops with foot traffic volume this salon doesn't have. Hardware + kiosk UX + sync complexity | In-app queue position for clients who are *already in the booking system* |
| **Multi-staff calendars, commissions, payroll** | Vagaro/GlossGenius/Square all have staff modules | One owner. Staff scheduling is a different product with role conflicts and permission matrices | Single-resource calendar = the dona |
| **SMS/WhatsApp marketing campaigns, email blasts, loyalty points, birthday automations** | Retention blogs push all of it (rebooking follow-ups, milestones, referrals) | Each is a channel + template + consent + provider-cost system. Classic scope creep with no validation | v1.x: one automated post-completion rebooking nudge — the single highest-ROI retention tactic (rebooking rate 60–70% target per industry sources) |
| **Forced account creation before showing availability** | "Security" / "we need their contact" | Booking-flow audits attribute ~37% drop-off to forced early sign-up; accounts-before-value is a known abandonment driver (Baymard-derived UX sources) | Let clients browse services + availability first; require login only at confirm. (If registration is a hard requirement, keep it to one screen: phone/WhatsApp + name) |
| **Inventory / retail POS, product sales** | Fresha/Square bundle POS | Salon sells services, not stock (nothing in PROJECT.md) | Nothing — track service revenue only |
| **Live streaming, classes, ecommerce, website builder** | Vagaro ships these; GlossGenius ships a website builder | Feature-checkbox bloat for a 1-owner neighborhood salon | Out of scope permanently |
| **Public reviews with moderation / reply tools** | Marketplace parity | Reviews are private signal here; public reviews create moderation work and fake-review risk with zero discovery benefit | Private rating visible to admin + client's own history |

## Feature Dependencies

```
[Auth + Roles]
    └──requires──> (nothing — root)
         ├──requires──> [Service CRUD]
         │       └──requires──> [Service Catalog view]
         │                └──requires──> [Booking flow]
         │                        └──requires──> [Availability / slot engine]
         │                                 └──requires──> [Booking status lifecycle]
         │                                          ├──requires──> [Minhas Marcações + cancel/reschedule]
         │                                          ├──requires──> [Admin confirm/reject inbox]
         │                                          ├──requires──> [Post-service rating]
         │                                          ├──requires──> [Revenue dashboard (daily/weekly)]
         │                                          └──requires──> [Popular services insight]
         │
         └──requires──> [Today schedule view]
                  └──requires──> [Queue / fila visibility]

[Booking status lifecycle] ──conflicts──> [Online payments]  (excluded)
[Rating] ──enhances──> [Popular services insight]
[Queue visibility] ──enhances──> [Booking status lifecycle]
```

### Dependency Notes

- **Booking flow requires Availability/slot engine:** slot generation from service duration × working hours × existing bookings is the foundation. If this is wrong, every downstream feature (queue estimates, dashboard, reschedule) inherits the error. *This is the phase that needs the deepest research.*
- **Revenue dashboard requires Booking status lifecycle:** revenue is only meaningful if bookings reliably reach a `completed` state with an associated price. A dashboard built on "all confirmed bookings" over-reports (no-shows, cancellations).
- **Rating requires completed bookings:** gating on status prevents rating a rejected/cancelled appointment — also prevents the admin from gaming or being spammed.
- **Queue visibility requires Today schedule + status:** the fila is a projection of today's confirmed bookings ordered by time; it must exclude cancelled/rejected entries in real time.
- **Minhas Marcações requires status lifecycle:** cancel/reschedule mutate state, so status transitions must exist and be validated *before* the client-facing list is built.
- **Popular services requires completed bookings** (or at minimum confirmed ones) — a v1.x derivation, not a standalone feature.
- **Reject reason conflicts with "no chat":** not a real conflict, but reject-reason must be a short canned message, not free-form thread.

## MVP Definition

### Launch With (v1)

Minimum viable product — validate the core loop: client books → dona decides → service happens → money is recorded.

- [ ] **Login / Registo with roles** — everything else is gated on knowing who is who
- [ ] **Service CRUD (admin)** — services must exist before they can be booked
- [ ] **Service catalog view (client)** — photo, price, duration; answers current pain #1
- [ ] **Availability/slot engine** — the product's technical core; no collisions
- [ ] **Booking flow with pending state** — service → date → time → *pedido enviado*
- [ ] **Admin confirm/reject inbox** — the approval model itself
- [ ] **Minhas Marcações + cancel** — clients need an escape hatch or they revert to WhatsApp
- [ ] **Status lifecycle (pendente/confirmada/rejeitada/cancelada/concluída)** — single source of truth for every other feature
- [ ] **Revenue dashboard (day/week)** — Core Value #2 for the dona
- [ ] **Post-service rating (nota + comentário)** — required, and cheap
- [ ] **Today schedule view (admin)** — she can't operate the day without it
- [ ] **APK via Capacitor** — the delivery form is part of MVP

### Add After Validation (v1.x)

- [ ] **Queue / "fila" visibility** — trigger: first week of real bookings proves waiting is the pain it appears to be; build on confirmed today-schedule data
- [ ] **Reschedule (alterar)** instead of only cancel — trigger: clients asking to move, not just cancel
- [ ] **Reject reason (canned options)** — trigger: clients re-booking after rejection without understanding why
- [ ] **Booking history / client card for admin** — trigger: dona asks "who is this regular?"
- [ ] **One automated post-completion rebooking nudge** — trigger: confirmed bookings exist to nudge; highest-ROI retention move
- [ ] **Push notifications for confirm/reject** — trigger: dona missing decisions; needs a push channel (Capacitor + FCM) beyond in-app badges

### Future Consideration (v2+)

- [ ] **SMS/WhatsApp reminders (24h/2h)** — industry-standard no-show reducer, but costs per message and needs a provider; defer until no-shows are measured as a real problem
- [ ] **Popular-services ranked insight** — needs enough completed-booking history to mean anything
- [ ] **Deposits / no-show protection** — only if no-shows prove costly *and* user re-opens the payment question (currently Out of Scope)
- [ ] **Walk-in kiosk / TV queue display** — only if foot traffic volume justifies hardware
- [ ] **Public shareable salon page / booking link** — cheap, but post-launch

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Availability / slot engine (no double-booking) | HIGH | HIGH | P1 |
| Booking flow (service → date → time → confirm) | HIGH | MEDIUM | P1 |
| Status lifecycle + admin confirm/reject | HIGH | MEDIUM | P1 |
| Service catalog with photo/price/duration | HIGH | LOW | P1 |
| Auth + roles (cliente/dona) | HIGH | MEDIUM | P1 |
| Minhas Marcações + cancel | HIGH | LOW | P1 |
| Admin service CRUD | HIGH | LOW | P1 |
| Revenue dashboard (day/week) | HIGH | MEDIUM | P1 |
| Today schedule view (admin) | HIGH | MEDIUM | P1 |
| Post-service rating | MEDIUM | LOW | P1 |
| Queue / fila visibility | HIGH | MEDIUM | P2 |
| Push notifications (confirm/reject) | MEDIUM | MEDIUM | P2 |
| Reschedule (alterar) | MEDIUM | MEDIUM | P2 |
| Reject reason (canned) | MEDIUM | LOW | P2 |
| Client history / booking record for admin | MEDIUM | MEDIUM | P2 |
| Popular-services insight | MEDIUM | MEDIUM | P2 |
| Post-completion rebooking nudge | MEDIUM | MEDIUM | P3 |
| SMS/WhatsApp reminders | HIGH | HIGH | P3 |
| Deposits / online payments | HIGH | HIGH | P3 (Out of Scope today) |
| Walk-in kiosk / TV display | LOW | HIGH | P3 |
| Marketplace / discovery | LOW | HIGH | P3 (anti-feature) |
| Multi-staff / payroll | LOW | HIGH | P3 (anti-feature) |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

## Competitor Feature Analysis

| Feature | Booksy | Fresha | Square Appointments | Small-salon tools (Tilavon / Barberly / NextMe) | Our Approach |
|---------|--------|--------|---------------------|--------------------------------------------------|--------------|
| Online booking, service → slot | Yes (client app + marketplace) | Yes | Yes | Yes | Same core flow |
| Confirmation model | Instant | Instant | Instant (with approval-style controls) | Varies | **Request approval** — documented mode, correct for 1 owner + variable-duration services |
| Client cancel/reschedule | Yes | Yes | Yes | Yes | v1: cancel; v1.x: reschedule |
| Reminders | Automated (24h follow-up on reviews; reminders standard) | Up to 3 reminders per booking | Email/text reminders | Core feature (24h + 2h SMS) | v1: in-app status only; v1.x push; v2 SMS |
| Payments / deposits / no-show fees | Yes (Boost upsells) | Yes (20% marketplace commission resentment) | Yes (deposits, no-show fees) | Some | **No** — Out of Scope; record faturado value |
| Waitlist | Limited | Marketplace-driven | Yes (Plus-tier waitlist for open slots) | Full walk-in queue + kiosk/TV (Tilavon, Barberly, NextMe, WaitQ) | **In-app fila position** for booked clients — no kiosk hardware |
| Ratings/reviews | Yes — public marketplace reviews, automated 2nd request at 24h | Yes — public marketplace | Limited | No | **Private** rating on completed bookings — no moderation burden |
| Revenue analytics | Basic | Advanced (paid tiers) | Basic | Service-popularity + daily/weekly/monthly reports (DINGG, Tilavon, Glown) | Day/week revenue + popular services, sized for 1 owner |
| Client history / notes | Client card | Client records | Customer directory | Client notes | v1.x booking history for regulars |
| Marketplace / discovery | Core growth driver | Core growth driver | No | No | **No** — anti-feature (commission + focus split) |
| Marketing (email/SMS campaigns) | Yes (paid add-ons) | Yes (paid tiers) | Basic | Sometimes | **No** — defer; single rebooking nudge only |
| Multi-staff scheduling | Yes | Yes | Yes | Yes (barber-per-chair) | **No** — single owner |

**Read of the landscape:** incumbents compete on *breadth* (marketplace, payments, marketing, staff). Salão Linda's advantage is *depth on one loop* — book → confirm → serve → record → rate — plus the queue visibility those incumbents either bury in a paid tier or solve with separate kiosk products. The owner community's dominant complaint about incumbents (fees, lock-in, commission) is exactly what a single-salon, zero-commission, no-marketplace app avoids by design.

## Sources

- **Booksy features** — https://biz.booksy.com/features , https://booksy.com/en-us (official; HIGH confidence for feature existence)
- **Booksy reviews workflow** — https://biz.booksy.com/blog/how-booksy-reviews-work (official; automated 2nd review request at 24h — MEDIUM, product marketing)
- **Fresha features / scheduling / notifications** — https://fresha.com/for-business/features , https://fresha.com/for-business/features/scheduling (official; HIGH)
- **Fresha pricing & "best salon software"** — https://fresha.com/for-business/salon/best-salon-software (official; MEDIUM — marketing comparisons)
- **Fresha commission/fee complaints** — https://www.reddit.com/r/smallbusiness/comments/1fnv696/experience_with_fresha , https://adminif.ai/blog/true-cost-free-salon-software (community/third-party; MEDIUM — consistent across multiple sources)
- **Square Appointments features (waitlist, cancellation policy, deposits, no-show fees)** — https://squareup.com/us/en/appointments/features , https://squareup.com/us/en/appointments/pricing (official; HIGH)
- **Waitlist is a Plus-tier feature** — https://waitless-sable.vercel.app/articles/does-square-appointments-have-waitlist (third-party; LOW — verify before citing tier specifics)
- **Walk-in queue products** — https://tilavon.com/features/waitlist-management , https://barberly.co/en/barbershop-walk-in-queue-management , https://nextmeapp.com/industries/beauty-and-wellness/ , https://qeazy.app/solutions/salons (official product pages; HIGH for existence of the category)
- **Service popularity / revenue reporting** — https://dingg.app/sa/features/salon-reporting-software , https://glown.io/salon-analytics-software , https://tilavon.com/docs/reports (official; MEDIUM)
- **Request-approval vs instant booking as a documented mode** — https://glamorph.com/features/online-booking , https://creav.io/help/bookings-calendar/booking-page-setup , https://octopuspro.com/bookings-and-appointments/ , https://bookify.mt/blog/prebook-appointments-malta (official docs; HIGH for existence — all four implement it)
- **Must-have booking features (reminders, easy rescheduling)** — https://bookb.io/blog/salon-booking-software-features , https://skhaira.com/blog/top-5-features-every-salon-booking-app-needs-2026 (industry blogs; MEDIUM — dated 2026, consistent with each other)
- **Forced account creation abandonment (~37% figure)** — https://xolapp.com/blog/booking-page-login-friction , https://dayclerk.com/articles/the-booking-flow-audit (third-party UX analyses referencing Baymard; MEDIUM for direction, **LOW for the exact 37% number** — treat as indicative)
- **Rebooking / retention tactics** — https://help.salongrid.com/docs/automations , https://yocale.com/en/resources/how-to-rebook-salons , https://zoca.com/post/how-to-rebook-salons (industry; MEDIUM — "60–70% rebooking target" is a vendor benchmark, not independent research)
- **Owner sentiment on marketplace lock-in** — https://www.reddit.com/r/smallbusiness/comments/1udbk9e/ (community; MEDIUM — consistent with Fresha fee complaints above)
- **NOT verified:** Context7 has no coverage of SaaS booking products (it indexes developer libraries); no official Booksy/Fresha docs were fetched directly — feature claims rest on official marketing pages via search. Tier/pricing specifics are time-sensitive and were deliberately not recorded as fact.

---
*Feature research for: Salão Linda — salon booking & management app*
*Researched: 2026-11-16*
