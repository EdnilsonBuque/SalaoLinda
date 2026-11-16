# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-11-16)

**Core value:** O cliente marca o seu serviço no telemóvel sem espera confusa e a dona sabe no fim do dia quanto faturou.

**Current focus:** Phase 2 — Services & Booking Core (validated)

## Current Position

Phase: 2 of 4 (Services & Booking Core)
Plan: 1 of 1 completed + E2E validated in current phase
Status: Pesquisa (02-RESEARCH.md), plano (02-01-PLAN.md), UI-SPEC (02-UI-SPEC.md) + E2E completa (14/14 testes curl contra API MySQL real); coordenação com Copilot em `.planning/COORDINATION.md`
Last activity: 2026-11-16 — Fase 2 research+plan+UI-SPEC+E2E validated (register/login/403 RBAC/401/logout/reset/booking/confirmação/rejeição); commits `b166bf7` + `df12284` + `1f774ed`; coordenação definida em COORDINATION.md

Progress: [██████████] 100%

## Performance Metrics

**Velocity:**
- Total plans completed: 3 (01-01, 01-02, 02-01 — research+plan+E2E)
- Average duration: –
- Total execution time: ~1 sessão (esta execução)

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 | 2/2 implementados | – | – |
| 2 | 1/1 research+plan+UI-SPEC+E2E | – | – |

**Recent Trend:**
- Last 5 plans: 02-01, 01-02, 01-01
- Trend: N/A

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.

Recent decisions affecting current work:

- [Roadmap]: 4 fases coarse — Foundation → Services & Booking Core → Dashboard/Ratings/History → APK
- [Roadmap]: Race-safety (transactional overlap guard) é critério de aceitação da Fase 2
- [Roadmap]: MOB-02 (design mobile-first pt) mapeado para a Fase 4 — verificação final em dispositivo; base visual assenta na Fase 1
- [Coordination]: Protocolo OpenCode ↔ Copilot em `.planning/COORDINATION.md` — lanes definidas, prefixos de commit, conflitos resolvidos por `git status`; UI-SPEC Fase 2 entregue

### Pending Todos

- ✅ Migrations/bootstrap/E2E AUTH — FEITO 2026-11-16 (utilizador `salao`/`salao123`; BD `salao_linda`; API em :3001)
- ✅ UI-SPEC da Fase 1 (01-UI-SPEC.md) — commitado ( `d639653` )
- ✅ UI-SPEC da Fase 2 (02-UI-SPEC.md) — commitado ( `df12284` )
- ✅ Verificação final da Fase 1 (gsd-verifier → VERIFICATION.md) — pendente na lane OpenCode
- Verificação final da Fase 2 (gsd-verifier → VERIFICATION.md) — pendente
- Manter guarda `VITE_API_BASE_URL` ao configurar builds Capacitor/API (Fase 4)

### Blockers/Concerns

- ~~Acesso MySQL~~ **RESOLVIDO 2026-11-16**: root usa auth_socket → criado utilizador dedicado `salao` com privilégios só em `salao_linda`. `docker-compose.yml` fica como alternativa (Docker não instalado neste ambiente).
- ✅ Phase 2 research + plan + UI-SPEC + E2E validados — 27/27 requisitos (AUTH-01..04 + SERV-01..04 + BOOK-01..04 + APPT-01..03 + ADM-01) passam em ambiente MySQL real
- **Coordenação multi-agente:** protocolo em `.planning/COORDINATION.md` — OpenCode (GSD gates/docs) ↔ Copilot (código `api/src`,`web/src`). Respeitar lanes antes de editar.

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| v2 | APPT-04 (reagendar), QUEUE-01 (fila), AUTH-05 (email), NOTIF-01 (push), REBOOK-01 | Deferred | 2026-11-16 |

## Session Continuity

Last session: 2026-11-16
Stopped at: Phase 2 — research + plan + UI-SPEC + E2E todos validados contra MySQL real. Pendente: verifier final (gsd-verifier) para ambas as fases; execução da Lane B (Copilot) com plans 02-01 quando tiver BD acessível; UI-SPEC Fase 3 em preparação.
Resume file: `.planning/phases/02-services-booking-core/02-01-PLAN.md`
Coordination file: `.planning/COORDINATION.md` (ler antes de editar ficheiros partilhados)
Roadmap file: `.planning/ROADMAP.md` (4 fases coarse; Phase 2 risk peak — lock strategy & slot engine)