# Phase 5: Especialistas e Pagamentos (aprovacao + deposito 50%) — Context

**Gathered:** 2026-11-18
**Status:** Ready for planning
**Source:** Sessão `/gsd-explore` → `.planning/notes/booking-flow-specialists-payments.md` (decisões do utilizador)

<domain>
## Phase Boundary

Esta fase transforma o modelo "dona decide tudo" num modelo de **2 especialistas com login próprio** e introduce **pagamento parcial** na marcação:

- **Entra:** roteamento serviço→especialista, caixa de aprovação por especialista, novo estado de marcação "à espera de depósito" com expiração automática, camada de pagamento mobile-money em sandbox (depósito de 50%), registo do restante 50% recebido no salão, conflito de horário verificado por especialista.
- **Sai (não toca):** catálogo de serviços (apenas ganha campo de especialista), avaliações, dashboard/ganhos (apenas ganha visibilidade de depósito/restante), packaging APK (mantém-se; apenas se re-compila).
- **Fora de âmbito:** gateway de pagamento real em produção (ver seed `mpesa-real-production`), reembolsos automáticos, notificações push, multi-salão.

</domain>

<decisions>
## Implementation Decisions

### Fluxo de marcação (ordem dos estados)
- A marcação segue: pedido → **aprovação do especialista** → aguarda-depósito (50%) → confirmada → concluída; a aprovação acontece **antes** do pagamento — nunca se paga por um horário que pode ser recusado
- A marcação **só é válida (confirmada) depois de pago o depósito de 50%** do valor do serviço (PAY-01)
- Rejeição pelo especialista mantém-se com motivo curto opcional (continuidade do ciclo existente)

### Expiração do depósito
- Depois de aprovada, a marcação fica "à espera do depósito" até um **prazo definido**; sem pagamento nesse prazo, **expira e o horário volta a ficar livre** (PAY-02)
- A expiração liberta a disponibilidade — nunca pode deixar slots fantasma bloqueados na agenda

### Pagamento (sandbox mobile money)
- Método de referência: **mobile money (M-Pesa / e-Mola)** — o que as clientes usam de facto em Maputo, valores em MZN
- Fluxo de pagamento simulado com a semântica do C2B push do M-Pesa: descrição da cobrança → prompt de pagamento → confirmação com PIN → callback de sucesso/fracasso (PAY-04)
- A implementação fica **abstraida atrás de uma interface de gateway** (`criarCobranca`/`webhook`/`verificar`) com um gateway simulado agora, para permitir trocar pelo M-Pesa real sem tocar no fluxo de marcação (gatilho registado em `.planning/seeds/mpesa-real-production.md`)

### Restante 50% no salão
- O restante 50% é pago **presencialmente no salão**; o **admin (dona) marca como pago** ao balcão (PAY-03)
- A marcação concluída distingue: depósito recebido, restante recebido, total

### Papéis e RBAC
- **Cada especialista tem login próprio** (role "especialista") e vê na sua caixa de aprovação **apenas as marcações dos serviços que lhe pertencem** (SPEC-02)
- O admin (dona) mantém **visão total** sobre todas as marcações de ambos os especialistas; o cliente mantém o comportamento actual (SPEC-03)
- A aprovação deixa de ser exclusiva do admin — passa a ser do especialista dono do serviço (revoga parcialmente ADM-01)

### Roteamento e disponibilidade
- **Cada serviço tem um especialista configurado** (cabeleireiro ou manicurista/pedicurista) e a marcação encaminha-se automaticamente para esse especialista (SPEC-01)
- Os dois especialistas trabalham o **mesmo horário** (seg–sáb, 09:00–18:00) em **salas paralelas** (SPEC-04)
- A verificação de conflitos de horário passa a ser **por especialista**: corte (cabeleireiro) e manicure às 10:00 coexistem; dois cortes às 10:00 nunca coexistem — incluindo sob pedidos simultâneos (guarda transaccional existente deve ser reforçada por `specialist_id`)

### the agent's Discretion
- Design físico do schema (tabela `payments`? colunas extra em `appointments`? enum de estados) — decisão do agente, desde que os estados acima sejam observáveis
- Mecanismo de expiração (cron/job periódico vs. verificação lazy ao listar slots) — o agente escolhe, desde que o slot nunca fique bloqueado para lá do prazo
- Estrutura de código da camada de pagamento (pasta `api/src/payments/`, naming dos métodos) — seguir padrões existentes em `api/src/services/`
- Layout/UI exato da caixa de aprovação do especialista e do ecrã de pagamento — seguir o design mobile existente (bottom nav, cards rounded xl, pt-PT)
- Onde vive o campo de especialista no formulário do serviço (admin) e como se faz o bootstrap dos 2 especialistas
- Política de cancelamento pelo cliente **depois** de pago o depósito (reembolso manual/fora da app é aceitável em v1 — não automatizar)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Regras de negócio capturadas (fonte da verdade das decisões)
- `.planning/notes/booking-flow-specialists-payments.md` — máquina de estados, decisões Socráticas, investigação de gateways (M-Pesa sandbox público, e-Mola sem sandbox, ClicPay em piloto)
- `.planning/REQUIREMENTS.md` — **SPEC-01..04** e **PAY-01..04** (secção "Novos Requirements"); ADM-01 anotado; item de pagamentos revogado do Out of Scope
- `.planning/ROADMAP.md` — Fase 5: goal, 6 success criteria, Depends on Phase 4
- `.planning/seeds/mpesa-real-production.md` — contrato da interface de gateway para troca futura

### Código existente a respeitar (padrões e contratos)
- `api/migrations/` — sequência Knex `YYYYMMDDHHMMSS_create_*.js` (0001 users … 0005 reviews) — a nova migration segue este formato
- `api/src/services/appointmentService.js` + `api/src/services/appointmentPolicy.js` — ciclo de estados actual e regras de transição; daqui sai a máquina de estados alargada
- `api/src/middleware/authenticate.js` + `api/src/middleware/requireAdmin.js` — padrão de RBAC actual (roles admin/cliente) a estender para "especialista"
- `api/src/routes/*.js` + `api/src/app.js` + `api/src/server.js` — montagem de rotas (padrão a repetir para rotas de especialista e de pagamento)
- `api/src/validators/appointmentSchemas.js` — validação zod dos pedidos de marcação
- `api/src/config/salon.js` + `api/src/config/env.js` — horário de abertura e configuração (prazo de expiração deve viver aqui/env)
- `web/src/router/index.js` — guards `requiresAuth` / `admin` / `guest` (adicionar guard de especialista)
- `web/src/App.vue` — bottom navigation por role (adicionar entrada da caixa de aprovação do especialista)
- `web/src/views/AppointmentsView.vue` + `web/src/views/AdminAppointmentsView.vue` — padrões de lista/estado a reutilizar
- `web/src/stores/auth.js` + `web/src/services/api.js` — sessão/JWT e chamadas à API
- `.planning/phases/02-services-booking-core/02-RESEARCH.md` e `02-UI-SPEC.md` — decisões técnicas e contrato visual da fase do motor de marcação

</canonical_refs>

<specifics>
## Specific Ideas

- O utilizador descreveu o fluxo como: *"quando o cliente selecionar cada tipo de serviço vai para o seu especialista configurado, e ele deve aprovar a marcação; a marcação só é considerada válida depois do pagamento de 50% do valor, e o restante será entregue no salão — adaptar um sistema de pagamento sandbox"*
- Pesquisa de gateways (2026-11-18): M-Pesa sandbox público em `developer.mpesa.vm.co.mz` (host `api.sandbox.vm.co.mz:18352`, modelo C2B push + PIN); e-Mola sem sandbox público (só contrato assinado); ClicPay com sandbox mas em piloto do Banco de Moçambique
- Credenciais actuais de admin: `840000000` / `Admin123!` (bootstrap em `api/src/scripts/bootstrap-admin.js`) — o bootstrap dos especialistas deve seguir o mesmo padrão

</specifics>

<deferred>
## Deferred Ideas

- Gateway M-Pesa real em produção — seed com gatilho (conta M-Pesa Business + NUIT)
- Reembolso automático do depósito em cancelamentos — v1: manual pela admin
- e-Mola como método pago — sem sandbox disponível
- Notificações push de aprovação/pagamento (NOTIF-01 já está em v2)
- Taxas de não-comparação (permanece fora de âmbito)

</deferred>

---

*Phase: 05-especialistas-e-pagamentos-aprovacao-deposito-50*
*Context gathered: 2026-11-18 via /gsd-explore (síntese da nota de exploração)*
