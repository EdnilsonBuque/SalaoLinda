# Salão Linda - Gestão e Marcações

## What This Is

Aplicação móvel (APK Android) para o Salão Linda, um salão de beleza de bairro que faz cortes, tranças, manicure, pedicure e maquilhagem. Clientes criam conta, veem serviços (foto, preço, duração), marcam hora e avaliam o atendimento; a dona (admin) gere serviços, confirma/rejeita marcações e acompanha os ganhos do dia/semana. As marcações deixam de ser por chamada/WhatsApp/boca e passam a ter registo organizado.

## Core Value

O cliente marca o seu serviço no telemóvel sem espera confusa e a dona sabe no fim do dia quanto faturou — sem isso, o produto não serve.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

(None yet — ship to validate)

### Active

<!-- Current scope. Building toward these. -->

- [ ] Login / Registo (cliente cria conta; admin/dona entra para gerir o salão)
- [ ] Lista de Serviços com foto, preço e duração
- [ ] Marcação: cliente escolhe serviço, data e hora
- [ ] Minhas Marcações: cliente vê, cancela ou altera as suas marcações
- [ ] Gestão de Serviços (CRUD) pelo admin
- [ ] Confirmar Marcação: admin confirma ou rejeita marcações
- [ ] Avaliação: cliente dá nota e comentário depois do atendimento
- [ ] Dashboard de ganhos do dia/semana para o admin
- [ ] Registo de clientes frequentes (lista + histórico visível ao admin)
- [ ] Aplicação Android (APK) gerada com Capacitor

*Nota: fila/posição de espera é v2 (QUEUE-01 em REQUIREMENTS.md) — depende do ciclo de estados estar sólido.*

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- Pagamentos online — o salão recebe presencialmente; só se regista o valor faturado
- Multi-salon/franquias — é um salão único (dona única)
- iOS — o pedido é APK Android
- Chat/mensagens em tempo real — comunicação é via estado da marcação (pendente/confirmada/rejeitada)
- Supabase/Firebase — decidido MySQL (ver Key Decisions)

## Context

- Salão de bairro: cortes, tranças, manicure, pedicure, maquilhagem
- Problemas atuais: fila e espera, marcações perdidas (WhatsApp/boca), sem informação de preços/disponibilidade, sem controlo de ganhos, sem registo de clientes frequentes
- Idioma da interface: Português (pt)
- Público: clientes do bairro (app mobile leve) + dona (admin)

## Constraints

- **Tech stack**: Vue.js + Vuetify (frontend), Capacitor (APK Android), Node.js + Express + MySQL (backend/API), JavaScript/HTML/CSS — pedido explícito do utilizador
- **Banco de dados**: MySQL 8.4 LTS — pedido explícito ("Bd: MySQL para um apk android"); dev local sem password (root via socket)
- **Fuso horário do salão**: `Africa/Maputo` (confirmado pelo utilizador) — modelo wall-clock + IANA, datas `DATE`/`DATETIME` (não `TIMESTAMP`), `TZ` fixado no servidor
- **UI**: "lindo design" — interface cuidada, moderna, mobile-first, em português
- **Ambiente**: projeto greenfield, sem código existente

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Backend Node.js + Express 5 + MySQL (API REST) | Mesmo JavaScript do frontend; Express 5 dá error-handling assíncrono grátis; MySQL exige servidor além do APK | — Pending |
| Knex 3.3 (migrations + queries parametrizadas) sobre mysql2 puro | Migrations desde a fase 1; Prisma 7 rejeitado (driver adapters obrigatórios, client gerado fora da árvore) | — Pending |
| MySQL (não Supabase/Firebase) | Especificação do utilizador muda para MySQL no fim | — Pending |
| Vue 3.5 + Vuetify 4.3 + Vite + Capacitor 8 | Pedido explícito; scaffold com `npm create vuetify` (spreng Vite 8 quebra a cascade-layer do Vuetify 4) | — Pending |
| Fuso `Africa/Maputo` wall-clock + DATETIME | Confirmado pelo utilizador; decisão de schema irreversível | — Pending |
| Auth JWT simples (1 token ~14 dias, `@capacitor/preferences`) para MVP | Capacitor WebView é cross-origin (cookies complicados); refresh-rotation adiado para v1.x | — Pending |
| Granularidade Coarse (3-5 fases) | Utilizador pediu rapidez até ao APK | — Pending |
| Modo YOLO + verificação ligada | Execução rápida sem portões interativos, com plan-check e verificação de qualidade | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-11-16 after initialization*
