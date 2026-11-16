# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-11-16)

**Core value:** O cliente marca o seu serviço no telemóvel sem espera confusa e a dona sabe no fim do dia quanto faturou.
**Current focus:** Phase 1 — Foundation: Scaffold, Schema & Auth

## Current Position

Phase: 2 of 4 (Services & Booking Core)
Plan: 1 of TBD in current phase
Status: Research + plan delivered (02-RESEARCH.md + 02-01-PLAN.md); E2E pendente de DB migrations/boot neste ambiente
Last activity: 2026-11-16 — Fase 2 research + plano 02-01 entregues (services CRUD, booking engine transacional, Minhas Marcações, admin confirm/reject); coords com Copilot em `.planning/COORDINATION.md`

Progress: [████████░░] 85%

## Performance Metrics

**Velocity:**
- Total plans completed: 2 (01-01, 01-02 — implementados e E2E validados 2026-11-16)
- Average duration: –
- Total execution time: ~1 sessão (esta execução)

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1 | 2/2 implementados | – | – |

**Recent Trend:**
- Last 5 plans: 01-02, 01-01
- Trend: N/A

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: 4 fases coarse — Foundation → Services & Booking Core → Dashboard/Ratings/History → APK
- [Roadmap]: Race-safety (transactional overlap guard) é critério de aceitação da Fase 2
- [Roadmap]: MOB-02 (design mobile-first pt) mapeado para a Fase 4 — verificação final em dispositivo; base visual assenta na Fase 1

### Pending Todos

- ✅ Migrations/bootstrap/E2E AUTH — FEITO 2026-11-16 (utilizador dedicado `salao`/`salao123` em `api/.env`; BD `salao_linda`; ver 01-01/01-02 Verification).
- UI-SPEC da Fase 1 (01-UI-SPEC.md) — em geração.
- Verificação final da Fase 1 (gsd-verifier → VERIFICATION.md).
- Manter guarda `VITE_API_BASE_URL` ao configurar builds Capacitor/API (Fase 4).

### Blockers/Concerns

- ~~Acesso MySQL~~ **RESOLVIDO 2026-11-16**: root usa auth_socket → criado utilizador dedicado `salao` com privilégios só em `salao_linda`. `docker-compose.yml` fica como alternativa (Docker não instalado neste ambiente).
- Fase 2 precisa de `--research-phase` no plan-phase (lock flavor FOR UPDATE vs GET_LOCK, granularidade dos slots) — ver research/SUMMARY.md.
- **Coordenação multi-agente:** protocolo em `.planning/COORDINATION.md` — OpenCode (GSD gates/docs) ↔ Copilot (código `api/src`,`web/src`). Respeitar lanes antes de editar.

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| v2 | APPT-04 (reagendar), QUEUE-01 (fila), AUTH-05 (email), NOTIF-01 (push), REBOOK-01 | Deferred | 2026-11-16 |

## Session Continuity

Last session: 2026-11-16
Stopped at: Phase 1 — código completo, E2E AUTH-01..04 validado contra MySQL real (commit `511afd6`). Pendente: 01-UI-SPEC (em geração) e verificação final (gsd-verifier). Coordenação com Copilot ativa.
Resume file: `.planning/phases/01-foundation-scaffold-schema-auth/01-02-PLAN.md`
Coordination file: `.planning/COORDINATION.md` (ler antes de editar ficheiros partilhados)
