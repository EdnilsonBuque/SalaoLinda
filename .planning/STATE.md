# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-11-16)

**Core value:** O cliente marca o seu serviço no telemóvel sem espera confusa e a dona sabe no fim do dia quanto faturou.
**Current focus:** Phase 1 — Foundation: Scaffold, Schema & Auth

## Current Position

Phase: 1 of 4 (Foundation — Scaffold, Schema & Auth)
Plan: 2 of 2 in current phase
Status: Implemented (código entregue); verificação DB/E2E bloqueada por acesso MySQL neste ambiente
Last activity: 2026-11-16 — Fase 1 executada (01-01, 01-02 implementados; web build e checks de sintaxe OK; migrations/E2E pendentes de credenciais DB válidas)

Progress: [█████░░░░░] 45%

## Performance Metrics

**Velocity:**
- Total plans completed: 0 (implementados, verificação E2E pendente)
- Average duration: –
- Total execution time: ~1 sessão (esta execução)

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: (none)
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

- Executar `api` migrations/bootstrap/admin e E2E AUTH-01..04 num ambiente com acesso MySQL 8.4 válido (local: root socket/sudo ou utilizador dedicado; Docker: `docker compose up -d`).
- Confirmar UX de bootstrap admin (script vs seed) conforme ambiente (script `npm run bootstrap:admin` implementado).
- Manter guarda `VITE_API_BASE_URL` ao configurar builds Capacitor/API (Fase 4).

### Blockers/Concerns

- **Ambiente atual:** MySQL 8.4 está ativo mas acesso `root@localhost`/TCP falha sem privilégios (auth_socket/sudo não disponível sem interação). `npm run migrate:latest` falhou com "Access denied"; criação de BD/migrations/bootstrap e testes E2E contra DB real não puderam ser concluídos aqui. Código e `docker-compose.yml` prontos.
- Fase 2 precisa de `--research-phase` no plan-phase (lock flavor FOR UPDATE vs GET_LOCK, granularidade dos slots) — ver research/SUMMARY.md.

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| v2 | APPT-04 (reagendar), QUEUE-01 (fila), AUTH-05 (email), NOTIF-01 (push), REBOOK-01 | Deferred | 2026-11-16 |

## Session Continuity

Last session: 2026-11-16
Stopped at: Phase 1 implemented (01-01, 01-02). Verificações sem DB: `web` build OK, `api` syntax/checks OK, migrations definidas. Pendente: executar migrations/bootstrap e E2E AUTH em ambiente com acesso MySQL.
Resume file: `.planning/phases/01-foundation-scaffold-schema-auth/01-02-PLAN.md`
