# Phase 5: Especialistas e Pagamentos (aprovacao + deposito 50%) - Research

**Researched:** 2026-11-18
**Domain:** RBAC de especialistas, máquina de estados de marcação, pagamentos mobile-money sandbox
**Confidence:** HIGH (codebase + requirements) / MEDIUM (gateway sandbox details)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Fluxo de marcação (ordem dos estados)
- A marcação segue: pedido → **aprovação do especialista** → aguarda-depósito (50%) → confirmada → concluída; a aprovação acontece **antes** do pagamento — nunca se paga por um horário que pode ser recusado
- A marcação **só é válida (confirmada) depois de pago o depósito de 50%** do valor do serviço (PAY-01)
- Rejeição pelo especialista mantém-se com motivo curto opcional (continuidade do ciclo existente)

#### Expiração do depósito
- Depois de aprovada, a marcação fica "à espera do depósito" até um **prazo definido**; sem pagamento nesse prazo, **expira e o horário volta a ficar livre** (PAY-02)
- A expiração liberta a disponibilidade — nunca pode deixar slots fantasma bloqueados na agenda

#### Pagamento (sandbox mobile money)
- Método de referência: **mobile money (M-Pesa / e-Mola)** — o que as clientes usam de facto em Maputo, valores em MZN
- Fluxo de pagamento simulado com a semântica do C2B push do M-Pesa: descrição da cobrança → prompt de pagamento → confirmação com PIN → callback de sucesso/fracasso (PAY-04)
- A implementação fica **abstraida atrás de uma interface de gateway** (`criarCobranca`/`webhook`/`verificar`) com um gateway simulado agora, para permitir trocar pelo M-Pesa real sem tocar no fluxo de marcação (gatilho registado em `.planning/seeds/mpesa-real-production.md`)

#### Restante 50% no salão
- O restante 50% é pago **presencialmente no salão**; o **admin (dona) marca como pago** ao balcão (PAY-03)
- A marcação concluída distingue: depósito recebido, restante recebido, total

#### Papéis e RBAC
- **Cada especialista tem login próprio** (role "especialista") e vê na sua caixa de aprovação **apenas as marcações dos serviços que lhe pertencem** (SPEC-02)
- O admin (dona) mantém **visão total** sobre todas as marcações de ambos os especialistas; o cliente mantém o comportamento actual (SPEC-03)
- A aprovação deixa de ser exclusiva do admin — passa a ser do especialista dono do serviço (revoga parcialmente ADM-01)

#### Roteamento e disponibilidade
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

### Deferred Ideas (OUT OF SCOPE)
- Gateway M-Pesa real em produção — seed com gatilho (conta M-Pesa Business + NUIT)
- Reembolso automático do depósito em cancelamentos — v1: manual pela admin
- e-Mola como método pago — sem sandbox disponível
- Notificações push de aprovação/pagamento (NOTIF-01 já está em v2)
- Taxas de não-comparação (permanece fora de âmbito)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SPEC-01 | Cada serviço tem um especialista configurado e a marcação encaminha-se automaticamente | Schema: `services.specialist_id` + snapshot `appointments.specialist_id` (§Schema Approach); roteamento no `createAppointment` |
| SPEC-02 | Especialista tem login próprio (role "especialista") e vê só as suas marcações | Extensão do enum `users_role` + middleware `requireRole` + rota `/api/specialist/*` (§RBAC) |
| SPEC-03 | Especialista aprova/rejeita (motivo opcional); admin vê todas | Transição `pendente → aguarda_deposito`/`rejeitada` no serviço de marcação (§State Machine) |
| SPEC-04 | Conflito de horário verificado por especialista, nunca por salão | Filtro por `specialist_id` em `getActiveBookingsForDay` mantendo o lock transaccional (§Overlap Guard) |
| PAY-01 | Só fica confirmada após depósito de 50% | Remover `pendente → confirmada` do admin; `confirmada` só via verificação do gateway (§State Machine) |
| PAY-02 | "À espera do depósito" com prazo; expira e liberta o slot | Coluna `deposit_deadline` + filtro de prazo na query de disponibilidade + expiração lazy (§Expiry) |
| PAY-03 | Restante 50% registado pelo admin; concluída distingue depósito/restante/total | Tabela `payments` (kind `deposito`/`restante`) + endpoint admin (§Payments Schema) |
| PAY-04 | Fluxo mobile money sandbox abstraído em interface de gateway | `api/src/payments/` com `criarCobranca`/`verificar`/`webhook` + MockGateway (§Gateway Abstraction) |
</phase_requirements>

## Summary

A fase estende o motor de marcação existente (que já tem ciclo de estados, guarda transaccional anti-dupla-marcação e regras de política em `appointmentPolicy.js`) para um modelo de **3 roles** (cliente/admin/especialista) e um **fluxo de estados alargado** com dois estados novos (`aguarda_deposito`, `expirida`) e uma tabela `payments`. O código-base é sólido e bem separado (policy pura vs. serviço com transacções vs. rotas finas), por isso a fase é majoritariamente: (1) alterações de schema Knex (enum de roles + enum de estados + `specialist_id` + `payments`), (2) reescrita das transições de estado para bloquear o bypass `pendente → confirmada`, (3) filtro por especialista na query de sobreposição, (4) camada de gateway de pagamento simulada, (5) extensão do frontend que hoje assume binariedade `isAdmin`.

**Descoberta crítica:** o admin hoje pode fazer `pendente → confirmada` directamente (`updateAdminAppointment`, `api/src/services/appointmentService.js:196-201`) e o botão "Confirmar" da UI usa exactamente isso (`AdminAppointmentsView.vue:86`). Se não se remover essa transição, **PAY-01 é contornável pelo admin** — é o risco #1 desta fase.

**Descoberta estrutural:** a protecção das rotas `/api/admin/services|appointments|reviews` não está nos próprios ficheiros — vem da *ordem de montagem* em `server.js` (`app.use('/api/admin', adminRoutes)` montado antes dos sub-routers, e `adminRoutes` aplica `router.use(authenticate, requireAdmin)` a tudo o que começa por `/api/admin`). Reordenar montagens ou colocar rotas de especialista sob `/api/admin` quebra a segurança (especialista levaria 403, ou rotas novas ficariam abertas).

**Primary recommendation:** snapshot `specialist_id` em `appointments` (não só em `services`), remover `pendente → confirmada` do endpoint admin, expiração lazy com filtro de prazo *directamente na query de disponibilidade* (a correcção nunca depende de um job a correr), e MockGateway com a mesma assinatura `criarCobranca/verificar/webhook` documentada no seed M-Pesa.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Roteamento serviço→especialista | Database / Storage | API / Backend | `services.specialist_id` é configuração persistida; API só lê |
| Caixa de aprovação do especialista | API / Backend | Browser / Client | Filtro e transições são regras de negócio servidor; UI só lista/actua |
| Guarda de conflito por especialista | API / Backend | Database / Storage | Transacção + `SELECT ... FOR UPDATE` + filtro `specialist_id` (nunca confiar no cliente) |
| Expiração do depósito | API / Backend | Database / Storage | Comparação de `deposit_deadline` no servidor, na query de disponibilidade |
| Fluxo de pagamento (prompt→PIN→callback) | API / Backend | Browser / Client | Gateway é servidor; o cliente só apresenta o prompt/PIN simulados e envia a confirmação |
| Registo do restante 50% | API / Backend | Browser / Client | Acção admin autenticada; UI botão "registar restante pago" |
| Estado/labels/novos chips | Browser / Client | — | `formatters.js` STATUS_PRESENTATION, guards do router, bottom nav por role |
| Sessão/JWT do especialista | API / Backend (JWT) | Browser / Client (armazenamento) | Já genericizado por role — sem mudança de infra, só de valores de role |

## Standard Stack

### Core (já instalado — NENHUM pacote novo é necessário para esta fase)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| express | ^5.3.0 | Rotas `/api/specialist/*`, `/api/payments/*` | Padrão do projecto; async errors automáticos |
| knex + mysql2 | ^3.3.0 / ^3.24.6 | Migrations Knex + transacções `FOR UPDATE` | Padrão do projecto (decidido em STACK.md §4.2) |
| zod | ^4.6.7 | Schemas das novas rotas (aprovação, pagamento, registo de restante) | Padrão do projecto (STACK.md §4.3) |
| jsonwebtoken / bcryptjs | ^9.0.3 / ^3.0.3 | Login do especialista | Já genericizado por `role` no payload e no `authenticate` |
| dayjs | ^1.11.23 | Prazo de expiração, contagens | Padrão do projecto (STACK.md §4.5) |

### Supporting (existentes, reaproveitados)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| express-rate-limit | ^8.7.4 | Limitar tentativas de pagamento/login do especialista | Reutilizar padrão de `authLimiter` em `auth.routes.js` |
| node:test (built-in) | Node 26 | Testes unitários da policy + integração | Já em uso em `api/test/` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|----------|----------|
| Explica lazy (recomendado) | `node-cron`/job periódico | Job周期ico acrescenta dependência e não corrige slots já lidos; lazy garante correcção mesmo com processo reiniciado — ver §Expiry |
| Tabela `payments` (recomendada) | Colunas `deposit_paid_at`/`remainder_paid_at` em `appointments` | Colunas são mais simples mas não guardam referência de gateway, tentativas falhadas nem idempotência do webhook — pagamentos querem a sua própria tabela |
| Snapshot `specialist_id` em `appointments` | JOIN a `services` em cada query | JOIN só funciona se o admin nunca reatribuir o serviço; snapshot preserva o histórico e torna a query de sobreposição um filtro simples |

**Installation:** nenhum — `npm install` não é necessário para esta fase.

**Version verification:** N/A (sem pacotes novos). Todos os pacotes acima já resolvem em `api/package-lock.json` e correm no ambiente verificado (Node v26.13.0, API a responder em :3001).

## Package Legitimacy Audit

**Sem pacotes novos.** Esta fase não instala dependências externas: o MockGateway é JS próprio (uma simulação, não uma reimplementação de biblioteca), a expiração usa lazy-check/setInterval built-in, e todo o resto reutiliza deps já instaladas. Protocolo de legitimidade: não aplicável.

## Architecture Patterns

### System Architecture Diagram

```
[Cliente app]                [Especialista app]              [Admin app]
     │                            │                              │
     │ POST /api/appointments     │ GET /api/specialist/         │ GET /api/admin/
     │  (serviceId, date, time)   │   appointments (filtro       │   appointments (tudo)
     ▼                            │   por specialist_id)         ▼
┌─────────────────────────────────┴──────────────────────────────────────┐
│ API Express (server.js)                                                │
│                                                                        │
│  appointmentService.createAppointment ──┐                              │
│    trx: FOR UPDATE services │ │
│    + slot check por specialist_id  ◄── services.specialist_id         │
│    + insert (specialist_id snapshot, status 'pendente')                │
│                                                                        │
│  approveAppointment (especialista/admin)                               │
│    pendente ──▶ 'aguarda_deposito' (+ deposit_deadline) │
│         └────▶ 'rejeitada' (motivo opcional)                          │
│                                                                        │
│  expireDeposits() lazy (em getAvailability / lists)                    │
│    'aguarda_deposito' + prazo passado ──▶ 'expirada' (slot livre)      │
│                                                                        │
│  payments/  (gateway abstraction)                                     │
│    criarCobranca() ──▶ MockGateway (prompt → PIN → callback)           │
│    webhook / verificar() ──▶ trx: payment 'completo'                   │
│                        ──▶ 'aguarda_deposito' ──▶ 'confirmada'         │
│    admin marca restante ──▶ payments(kind='restante','completo')       │
└───────────────┬────────────────────────────────────────────────────────┘
                ▼
        MySQL 8.4 (knex, DATETIME wall-clock Africa/Maputo)
        users(role+especialista) │ services(specialist_id)
        appointments(+specialist_id, +deposit_deadline, enum+2)
        payments(appointment_id, kind, amount, status, gateway_ref)
```

### Recommended Project Structure

```
api/src/
├── payments/                    # NOVO — camada de gateway (decisão do agente)
│   ├── gateway.js               # interface: criarCobranca / verificar / webhook (JSDoc contract)
│   └── mockGateway.js           # simula C2B push M-Pesa: prompt → PIN → callback
├── middleware/
│   └── requireRole.js           # NOVO — requireRole('admin') / requireRole('especialista')
│                                #   (ou requireSpecialist.js, seguindo requireAdmin.js)
├── routes/
│   ├── specialistAppointment.routes.js   # NOVO — /api/specialist/appointments
│   └── payment.routes.js                 # NOVO — /api/appointments/:id/deposit + /api/payments/*
├── services/
│   ├── appointmentService.js    # transições alargadas + filtro por specialist_id
│   ├── appointmentPolicy.js     # policy pura: estado efectivo com prazo, slots por especialista
│   └── paymentService.js        # NOVO — liga gateway ↔ transacções de appointment
├── scripts/
│   └── bootstrap-specialists.js # NOVO — segue o padrão de bootstrap-admin.js
└── config/
    └── salon.js                 # + depositDeadlineMinutes (env-overridable)

api/migrations/
├── 202611180001_alter_users_role_add_especialista.js
├── 202611180002_alter_services_add_specialist_id.js
├── 202611180003_alter_appointments_add_specialist_and_deposit.js   # + enum estados
└── 202611180004_create_payments.js
```

### Pattern 1: Transições de estado com transacção + guarda de transição (EXISTENTE — estender)

**What:** `updateAdminAppointment` já faz `trx → SELECT ... FOR UPDATE → tabela de transições permitidas → UPDATE`. Toda mudança de estado novo reutiliza este padrão.
**When to use:** aprovação do especialista, pagamento → confirmada, expiração.
**Example (o que MUDA — remover bypass de pagamento):**

```javascript
// api/src/services/appointmentService.js — updateAdminAppointment (ACTUAL, linhas 196-201)
const allowed = appointment.status === 'pendente'
  ? ['confirmada', 'rejeitada']          // ❌ 'confirmada' aqui permite pular o depósito (PAY-01)
  : appointment.status === 'confirmada'
    ? ['concluida']
    : []

// FASE 5 — tabela de transições alargada:
const allowedByStatus = {
  pendente:          ['aguarda_deposito', 'rejeitada'],  // aprovação do especialista (SPEC-03)
  aguarda_deposito:  ['confirmada', 'expirada', 'cancelada'], // confirmada SÓ via paymentService
  confirmada:        ['concluida', 'cancelada'],          // cancelada = reembolso manual v1
  rejeitada: [], expirada: [], cancelada: [], concluida: [] // terminais (exceto registo de restante)
}
// 'confirmada' passa a ser inalcançável por PATCH de status — só paymentService a escreve.
```

**Source:** padrão observado em `api/src/services/appointmentService.js:191-215` [VERIFIED: local codebase].

### Pattern 2: Guarda transaccional anti-dupla-marcação (EXISTENTE — estender por especialista)

**What:** `createAppointment` faz lock de todas as linhas de `services` (`FOR UPDATE`), re-verifica disponibilidade dentro da transacção e insere. Serializa pedidos concorrentes.
**When to use:** manter exactamente assim; só muda o *conjunto de bloqueio* (query), não o lock.
**Example (a mudança SPEC-04):**

```javascript
// ACTUAL — bloqueia TUDO o que colide no tempo, qualquer especialista (linhas 70-78):
async function getActiveBookingsForDay(query, date) {
  return query('appointments')
    .select('starts_at', 'ends_at')
    .whereIn('status', ACTIVE_STATUSES)          // ['pendente','confirmada']
    .andWhere('starts_at', '<', close).andWhere('ends_at', '>', open)
}

// FASE 5 — por especialista + prazo de depósito (esboço):
// ACTIVE = pendente | confirmada | (aguarda_deposito AND deposit_deadline > agora)
async function getActiveBookingsForDay(query, date, specialistId) {
  return query('appointments')
    .select('starts_at', 'ends_at')
    .where('specialist_id', specialistId)                    // SPEC-04: salas paralelas
    .andWhere((q) => q
      .whereIn('status', ['pendente', 'confirmada'])
      .orWhere((qq) => qq.where('status', 'aguarda_deposito')
        .andWhere('deposit_deadline', '>', salonDateTimeToString(getSalonDateTime(now)))))
    .andWhere('starts_at', '<', close).andWhere('ends_at', '>', open)
}
// getAvailability(serviceId, date) resolve service.specialist_id e chama com esse specialistId.
// createAppointment mantém o FOR UPDATE em services (serialização) e usa o mesmo filtro.
```

**Source:** padrão observado em `api/src/services/appointmentService.js:70-78,109-138` [VERIFIED: local codebase]; regra de sobreposição em `appointmentPolicy.js:90-94` [VERIFIED: local codebase].

### Pattern 3: RBAC por middleware de role (EXISTENTE — estender)

**What:** `authenticate` carrega `req.user` com role vinda da BD; `requireAdmin` compara `role !== 'admin'`. Login é genérico — qualquer role entra pelo mesmo `/api/auth/login`.
**When to use:** rotas do especialista.
**Example:**

```javascript
// api/src/middleware/requireRole.js (novo, espelha requireAdmin.js)
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Acesso reservado' })
    }
    next()
  }
}
// specialistAppointment.routes.js:
router.use(authenticate, requireRole('especialista'))
// ownership NÃO é só middleware — o UPDATE leva .where({ specialist_id: req.user.id })
```

**Source:** `api/src/middleware/requireAdmin.js`, `authenticate.js:15-17`, `authService.login` sem filtro de role [VERIFIED: local codebase]. Nota: `authenticate` re-lê o utilizador da BD em cada pedido, portanto mudanças de role propagam-se sem re-login.

### Pattern 4: Interface de gateway de pagamento (NOVO)

**What:** contrato mínimo para trocar Mock → M-Pesa real sem tocar no fluxo de marcação.
**When to use:** PAY-04 + seed `mpesa-real-production.md`.
**Example:**

```javascript
// api/src/payments/gateway.js — contrato (JSDoc), inspirado no seed .planning/seeds/mpesa-real-production.md
// criarCobranca({ appointmentId, amount, msisdn, description })
//   → { chargeId, status: 'aguarda_pin', prompt: { description, amount } }
// verificar(chargeId)
//   → { chargeId, status: 'completo' | 'falhado' | 'pendente', raw }
// webhook handler (req) → { chargeId, status, signatureOk }   // M-Pesa real: Result/Callback URL
//
// MockGateway: expõe também confirmPin(chargeId, pin) para simular o prompt no telemóvel:
//   pin correcto (definido p.ex. '1234' ou qualquer 4 dígitos — decisão do agente) → 'completo'
//   caso contrário → 'falhado'. O callback entra pelo MESMO caminho que o webhook real
//   (paymentService.processGatewayEvent), para o fluxo de marcação ser idêntico no futuro.
```

**Source:** contrato documentado em `.planning/seeds/mpesa-real-production.md` e `.planning/notes/booking-flow-specialists-payments.md` [CITED: canonical refs do projecto]; semântica C2B push confirmada por pesquisa (portal oficial `developer.mpesa.vm.co.mz`, endpoints C2B) [MEDIUM].

### Anti-Patterns to Avoid

- **Deixar `pendente → confirmada` no PATCH admin:** contorna PAY-01. Remover e fazer o admin "Confirmar" virar "Aprovar" (`aguarda_deposito`).
- **Pôr rotas de especialista sob `/api/admin/*`:** `adminRoutes` aplica `requireAdmin` a tudo sob o prefixo → especialista levaria 403. Usar `/api/specialist/*`.
- **Reordenar `app.use` em `server.js`:** a segurança das rotas admin actuais depende da ordem (montar `/api/admin` primeiro). Se reordenar, adicionar `router.use(authenticate, requireAdmin)` explícito nos sub-routers (padrão já usado em `adminReview.routes.js`).
- **Filtrar conflitos por JOIN a `services` em vez de snapshot:** reatribuição de serviço reescreve o passado; dois pedidos concorrentes podem "ver" especialistas diferentes durante a janela de edição.
- **Expiração só num job periódico:** se o processo não correr, slots ficam fantasma. O filtro de prazo tem de estar na query de disponibilidade (lazy), job é só optimização.
- **Confiar no cliente para dizer "pagou":** o estado `confirmada` só é escrito por `paymentService` após `verificar()`/webhook do gateway — nunca por um `PATCH /status` vindo da UI do cliente.
- **Assumir `!auth.isAdmin` = cliente:** o App.vue usa binariedade em 6 sítios (linhas 6-7, 25, 52, 89) — com um 3.º role o especialista cairia na nav de cliente.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Estado de pagamento de uma marcação | Flags soltas em `appointments` sem histórico | Tabela `payments` com `kind`/`status`/`gateway_ref` | Tentativas falhadas, idempotência de webhook, distinguir depósito vs restante sem parsing de datas |
| Detecção de expiração | `setTimeout` por marcação em memória | Comparação `deposit_deadline` na query (wall-clock `getSalonDateTime`) | Membro de memória morre com restart; o processo pode reiniciar a meio do prazo |
| Semântica M-Pesa C2B | Chamar HTTP real no fluxo de marcação | Interface `criarCobranca/verificar/webhook` + MockGateway | Credenciais sandbox não existem ainda; o seed de produção exige esta fronteira |
| Validação dos novos endpoints | `if` soltos nos handlers | zod schemas (padrão `appointmentSchemas.js`) | Consistência com o projecto + erros de campo para a Vuetify |
| Auth do especialista | Segundo sistema de login/tokens | O mesmo `authenticate` + novo `requireRole` | JWT já carrega `role`; `authenticate` re-lê da BD |

**Key insight:** o projecto já decidiu estas fronteiras (policy pura / serviço transaccional / rotas finas / zod / knex). A fase correcta é *encaixar* nelas, não paralelizar.

## Common Pitfalls

### Pitfall 1: Bypass de pagamento via endpoint admin
**What goes wrong:** admin (ou UI antiga) marca `confirmada` sem depósito — PAY-01 falha silenciosamente.
**Why it happens:** `updateAdminAppointment` permite `pendente → confirmada` hoje e `AdminAppointmentsView` tem botão "Confirmar" que o usa.
**How to avoid:** remover `confirmada` das transições do PATCH; `confirmada` só é escrita por `paymentService`; UI do admin passa o botão para "Aprovar" → `aguarda_deposito`.
**Warning signs:** qualquer E2E que consiga `PATCH {status:'confirmada'}` directamente.

### Pitfall 2: Especialista bloqueado ou rota aberta por ordem de montagem
**What goes wrong:** rotas novas sob `/api/admin` dão 403 ao especialista; ou rotas novas montadas *antes* de `/api/admin` ficam sem auth (o middleware do `adminRoutes` só corre para pedidos que entram por lá).
**Why it happens:** a protecção real de `adminAppointment.routes`/`adminService.routes` é implícita — vem de `app.use('/api/admin', adminRoutes)` ser montado primeiro em `server.js:42-45` e do `router.use(authenticate, requireAdmin)` sem caminho em `admin.routes.js:10` [VERIFIED: local codebase].
**How to avoid:** rotas do especialista em `/api/specialist/*` com `router.use(authenticate, requireRole('especialista'))` explícito; nos sub-routers admin novos, incluir `router.use(authenticate, requireAdmin)` explícito (defesa em profundidade, padrão de `adminReview.routes.js`).
**Warning signs:** teste curl sem token a devolver 200 em rota admin.

### Pitfall 3: Slots fantasma após expiração
**What goes wrong:** marcação `aguarda_deposito` prorrogada mantém o horário bloqueado para sempre (PAY-02 violado).
**Why it happens:** `ACTIVE_STATUSES = ['pendente','confirmada']` — ou `aguarda_deposito` fica de fora (slot liberta-se cedo demais, cliente paga por horário roubado) ou entra sem condição de prazo (nunca expira).
**How to avoid:** incluir `aguarda_deposito` com `deposit_deadline > agora` na mesma query; e fazer o flip para `expirada` lazy em `getAvailability`/listagens (mesma transacção).
**Warning signs:** E2E: aprovar → esperar prazo (configurar prazo curto p.ex. 1 min em env) → `/availability` mostra o slot livre.

### Pitfall 4: Corrida entre pagamento e expiração
**What goes wrong:** webhook do pagamento e expiração lazy atualizam a mesma linha ao mesmo tempo → estado inconsistente (ex.: pagamento completo mas `expirada`).
**Why it happens:** ambas escrevem em `aguarda_deposito`.
**How to avoid:** ambos os caminhos usam `trx('appointments').where({id}).forUpdate()` e a tabela de transições exige `status actual === aguarda_deposito`; o segundo escritor recebe 409 e trata do caso (pagamento tardio → devolver/registar como falhado, decisão do agente).
**Warning signs:** teste de concorrência: disparar `confirmPin` e `expireDeposits` quase simultaneamente.

### Pitfall 5: Bottom nav/guards binários
**What goes wrong:** especialista vê nav de cliente, acede a `/admin/*` (leva 403 do servidor — correcto mas má UX) ou é redirecionado para home.
**Why it happens:** `auth.isAdmin` é binário em `stores/auth.js:12`, guards `meta.admin` em `router/index.js:45`, e `App.vue` faz `v-if="!auth.isAdmin"` / `v-else`.
**How to avoid:** getter `isSpecialist`, guard `meta.specialist`, três ramos explícitos na nav (cliente / especialista / admin), e redirect por role após login (`LoginView` hoje manda tudo para `/`).
**Warning signs:** logar como especialista e ver "Serviços/Marcações" de cliente.

### Pitfall 6: Alteração de enum MySQL nativo via Knex
**What goes wrong:** `table.enu(...).alter()` com `useNative + enumName` pode gerar DDL inesperado; `users_role` e `appointments_status` são enums nativos (`migrations/0001` e `0004` usam `useNative: true`).
**Why it happens:** Knex documenta `.alter()` mas o comportamento com `enumName` em MySQL tem nuances.
**How to avoid:** após `npm run migrate:latest`, verificar com `SHOW COLUMNS FROM users;` / `SHOW COLUMNS FROM appointments;`; se o Knex falhar, usar `knex.raw('ALTER TABLE appointments MODIFY status ENUM(...) NOT NULL DEFAULT \'pendente\'')` na migration. Rollback testado com `migrate:rollback`.
**Warning signs:** erro de DDL no migrate; valores novos ausentes no `ENUM` apesar da migration "passar".

### Pitfall 7: Serviço sem especialista configurado
**What goes wrong:** `services.specialist_id` nullable (necessário para as linhas existentes) → cliente marca serviço sem roteamento.
**Why it happens:** migration não pode pôr `NOT NULL` sem backfill dos 2 especialistas primeiro.
**How to avoid:** ordem de arranque: migrate → `bootstrap:especialists` → atribuir especialistas a todos os serviços (UI admin ou script de backfill) → `createAppointment` rejeita serviços sem especialista com mensagem clara; dados de demonstração/seed completos antes do E2E.
**Warning signs:** 409/400 "Serviço sem especialista" no E2E.

### Pitfall 8: Estado do repo e testes de integração pré-existentes
**What goes wrong:** baseline sujo — dezenas de ficheiros de código *untracked/modified* em `git status` (código das fases 2-4 nunca commitado em `api/src/services`, views, etc.), e `booking.integration.test.js` **já falha hoje** (linha 159: `GET /admin/users/:id/appointments` → 404 — rota nunca criada; `reportService.getAdminDashboard`/`listAdminClients` existem mas não estão ligados a nenhuma rota) [VERIFIED: local codebase + execução do teste].
**Why it happens:** fases 3/4 entregues parcialmente; commit discipline da COORDINATION.md (Lane B) não seguida para o código.
**How to avoid:** o executor deve (a) confirmar `git status` e commitar o baseline com prefixo de lane antes de editar, (b) não tratar a falha do teste de integração como regressão da fase, (c) saber que "dashboard com visibilidade de depósito/restante" (PAY-03) depende de haver rotas de dashboard — ver Open Questions #3.
**Warning signs:** `node --test` vermelho à partida; diffs gigantes no primeiro commit da fase.

## Runtime State Inventory

> Não é fase de rename/refactor/migração de string — não se aplica. Itens de dados afectados pela migração de schema (cobertos acima):

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `users` (roles `client`/`admin` existentes), `services` (linhas existentes sem especialista), `appointments` (estados antigos inalterados — enum só acrescenta valores) | Migration enum + backfill de `services.specialist_id` (Pitfall 7) |
| Live service config | Nenhuma (sem serviços externos configurados) | — |
| OS-registered state | Nenhum | — |
| Secrets/env vars | Novo env sugerido: `DEPOSIT_DEADLINE_MINUTES` (default p.ex. 30), opcional `MOCK_PAYMENT_PIN` | Adicionar a `api/.env.example` + `config/salon.js` |
| Build artifacts | APK existente (`apk/SalaoLinda-debug.apk`) fica desactualizado após UI nova | Re-compilar no fim da fase (fora do âmbito de código; packaging mantém-se) |

**Nothing else found:** verificado por leitura de `api/.env`, `api/.env.example`, `web/.env`, `docker-compose.yml`.

## Code Examples

Verified patterns from the codebase/official sources:

### Transição de estado com transacção (estender — fonte: appointmentService.js)
```javascript
// Fonte: api/src/services/appointmentService.js:191-215 (actual) — reutilizar o formato
await db.transaction(async (trx) => {
  const appointment = await trx('appointments').where({ id: appointmentId }).forUpdate().first()
  if (!appointment) throw httpError(404, 'Marcação não encontrada')
  const allowed = allowedByStatus[appointment.status] ?? []
  if (!allowed.includes(status)) throw httpError(409, 'A alteração de estado não é permitida')
  await trx('appointments').where({ id: appointmentId }).update({ status, updated_at: now })
})
```

### Listagem do especialista (novo — espelha listAdminAppointments, appointmentService.js:177-189)
```javascript
// GET /api/specialist/appointments — mesmo padrão de date-filter + where('specialist_id', req.user.id)
export async function listSpecialistAppointments(specialistId, { date = getSalonDate(), status }) {
  const query = appointmentQuery()          // reutilizar o join existente (adicionar s.specialist_id + u do especialista)
    .where('a.specialist_id', specialistId) // SPEC-02: só as suas
    .andWhere('a.starts_at', '>=', `${date} 00:00:00`)
    .andWhere('a.starts_at', '<', `${nextDate} 00:00:00`)
    .orderBy('a.starts_at', 'asc')
  if (status) query.andWhere('a.status', status)
  return (await query).map(mapAppointment)
}
```

### Registo do restante 50% (novo — segue formato de resposta do projecto)
```javascript
// POST /api/admin/appointments/:id/remainder  (requireAdmin explícito)
// 1) trx: appointment FOR UPDATE, exige status 'concluida' (ou 'confirmada' — decisão do agente)
// 2) exige NÃO existir payment kind='restante' completo (idempotente)
// 3) insert payments { appointment_id, kind:'restante', amount: price_at_booking - deposito,
//                      method:'balcao', status:'completo', paid_at }
// resposta: { payment, totals: { deposito, restante, total } }  // PAY-03: distingue os três
```

### Guards do router (estender — fonte: web/src/router/index.js)
```javascript
// Fonte: web/src/router/index.js:33-49 — acrescentar:
// routes: { path: '/especialista/marcacoes', meta: { requiresAuth: true, specialist: true } }
// guard:  if (to.meta.specialist && !auth.isSpecialist) return { name: 'home' }
// stores/auth.js: isSpecialist: (s) => s.user?.role === 'especialista'
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Aprovação exclusiva do admin (`pendente→confirmada`) | Aprovação do especialista (`pendente→aguarda_deposito`); `confirmada` só via pagamento | Fase 5 (ADM-01 revogado parcialmente) | Endpoint admin, UI da agenda e testes existentes têm de mudar |
| Conflito de tempo por salão (1 cadeira) | Conflito por especialista (2 salas paralelas) | Fase 5 (SPEC-04) | `getActiveBookingsForDay` + `getAvailability` ganham filtro |
| Estado binário admin/cliente | 3 roles | Fase 5 (SPEC-02) | Nav, guards, redirects, forms de serviço |
| Sem pagamentos (Out of Scope revogado) | Depósito 50% sandbox + restante no balcão | 2026-11-18 | Tabela `payments`, gateway, novos estados |

**Deprecated/outdated:**
- Botão "Confirmar" → `confirmada` na `AdminAppointmentsView` (linha 86): substituir por "Aprovar" → `aguarda_deposito`.
- `adminAppointmentStatusSchema` enum `['confirmada','rejeitada','concluida']`: passa a incluir `aguarda_deposito` (aprovação) e a excluir `confirmada` como escolha directa.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | O admin **mantém capacidade** de aprovar (fallback), além do especialista — "revoga parcialmente ADM-01" é ambíguo | State Machine | Se for specialist-only, remover `aguarda_deposito` das transições admin e o botão admin desaparece; baixo risco, decisão de UI |
| A2 | Prazo default do depósito = 30 min, configurável via `DEPOSIT_DEADLINE_MINUTES` | Expiry | Prazo errado afaste clientes ou cedo demais slots; env permite ajustar sem código |
| A3 | MockGateway aceita qualquer PIN de 4 dígitos como sucesso (+ botão "simular falha") | Gateway | Só afecta UX do teste; contrato `verificar/webhook` não muda |
| A4 | Serviços existentes são reatribuídos manualmente/UI ao especialista (nullable + backfill) | Schema | Se o utilizador quiser automático, acrescenta script de backfill na bootstrap |
| A5 | "Visibilidade de depósito/restante no dashboard" (fase boundary) pode ser satisfeita nas listagens/detalhe de marcações, sem criar rotas de dashboard | Payments | Se o dashboard existir na fase 3 completa, acrescentar agregação — ver Open Questions #3 |
| A6 | Semântica M-Pesa C2B (prompt→PIN→callback, sandbox `api.sandbox.vm.co.mz:18352`) conforme nota de exploração 2026-11-18 | Gateway | Apenas o MockGateway entra nesta fase; se a nota estiver errada, só o adaptador futuro é afectado |

## Open Questions

1. **O admin pode ainda aprovar marcações, ou a aprovação passa a ser exclusiva do especialista?**
   - What we know: CONTEXT.md diz "revoga **parcialmente** ADM-01"; success criteria #2 só exige que o especialista aprove e o admin veja tudo.
   - What's unclear: se o admin mantém o poder de aprovar (fallback para o dia em que o especialista não entra).
   - Recommendation: manter aprovação admin como fallback (menor mudança, alinha com "visão total"); specialist-only é um botão a remover depois. Marcar como decisão do discuss-phase.

2. **Duração do prazo de depósito e valor exacto do PIN do mock.**
   - What we know: PAY-02 exige "prazo definido"; nenhum valor definido em lado nenhum.
   - What's unclear: minutos (30? 2h?) e se o PIN é fixo ou qualquer 4 dígitos.
   - Recommendation: env `DEPOSIT_DEADLINE_MINUTES=30` + PIN fixo `1234` documentado no `.env.example`; confirmar com o utilizador no discuss-phase.

3. **Dashboard: as rotas de dashboard não existem.**
   - What we know: `reportService.getAdminDashboard`/`listAdminClients` estão escritos mas não montados (`/api/admin/dashboard` → 404 verificado); `booking.integration.test.js` falha por causa disto; ADM-02..04/RATE são Fase 3 no traceability e o STATE.md diz fases completas.
   - What's unclear: se a Fase 3 ficou incompleta ou se o dashboard vive noutro sítio não detectado.
   - Recommendation: **fora do âmbito da Fase 5** excepto se o utilizador exigir "ganhos com visibilidade de depósito/restante" (fronteira da fase diz "apenas ganha visibilidade"). Tratar como gap da Fase 3 num `/gsd-quick`, não misturar aqui. Confirmar no discuss-phase.

4. **Baseline commit antes de começar.**
   - What we know: `git status` mostra ~40 ficheiros untracked/modified das fases 2-4 (código nunca commitado).
   - What's unclear: se o utilizador quer um commit de baseline pré-fase.
   - Recommendation: commit de baseline com prefixo da lane antes da primeira edição da fase (regra 3 da COORDINATION.md).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| MySQL server | Migrations + runtime | ✓ (127.0.0.1:3306, verificado) | 8.4.11 | — |
| MySQL client CLI | Verificar enums após migrate | ✓ | 8.4.11 | `knex migrate:status` |
| Node.js | API + testes | ✓ | v26.13.0 | — |
| API server (:3001) | E2E curl | ✓ (a correr, `node --watch`) | dev | `npm run dev` em `api/` |
| Web dev (:3000) | E2E manual da UI | ✓ (vite a correr) | — | `npm run dev` em `web/` |
| Credenciais admin | E2E | ✓ (`api/.env`: `840000000` / Admin123!) | — | `npm run bootstrap:admin` |
| M-Pesa sandbox real | Nada nesta fase (MockGateway) | ✗ (sem credenciais) | — | MockGateway — é o plano |
| Docker | Alternativa de BD | ✗ (não instalado; BD local a funcionar) | — | MySQL nativo já activo |

**Missing dependencies with no fallback:** nenhum.
**Missing dependencies with fallback:** M-Pesa sandbox → MockGateway (por design desta fase).

## Validation Architecture

> `workflow.nyquist_validation: false` em `.planning/config.json` — secção incluída a pedido do orquestrador, mas em modo E2E (padrão verificado do projecto: "14/14 curl tests" por fase) em vez de mapa estrito de testes por requisito.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `node:test` (built-in, Node 26) + `assert/strict` |
| Config file | nenhum (sem script `test` em `api/package.json` — executar directamente) |
| Quick run command | `cd api && node --env-file=.env --test test/appointmentPolicy.test.js` (4 pass, verificado) |
| Full suite command | `cd api && node --env-file=.env --test test/` (4 pass + 1 skip de integração) |
| Integration command | `cd api && RUN_DB_INTEGRATION_TESTS=1 ADMIN_PHONE=840000000 ADMIN_PASSWORD='Admin123!' node --env-file=.env --test test/booking.integration.test.js` — **falha hoje** (pré-existente, linha 159) |
| Lint (frontend) | `cd web && npm run lint` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SPEC-01 | Serviço tem especialista; marcação snapshota `specialist_id` | unit+integration | `node --env-file=.env --test test/` + curl E2E (ver abaixo) | ❌ Wave 0 |
| SPEC-02 | Especialista vê só as suas marcações; cliente/admin recusados | integration (curl) | `curl /api/specialist/appointments` com token especialista vs cliente vs admin | ❌ Wave 0 |
| SPEC-03 | Aprovação/rejeição pelo especialista com motivo | unit (transições) + curl | Novo `test/appointmentTransitions.test.js` ou estender policy test | ❌ Wave 0 |
| SPEC-04 | Sobreposição por especialista, incl. concorrência | unit (`generateAvailableSlots` com filtro) + integration | Estender `appointmentPolicy.test.js` + curl com 2 serviços/2 especialistas na mesma hora | ❌ Wave 0 |
| PAY-01 | `confirmada` inalcançável sem pagamento | integration (curl) | `PATCH /admin/appointments/:id/status {confirmada}` → **esperado 409** | ❌ Wave 0 |
| PAY-02 | Expiração liberta o slot | integration (curl, prazo=1min) | Aprovar → esperar → `/services/:id/availability` mostra slot + estado `expirada` | ❌ Wave 0 |
| PAY-03 | Restante registado; totais depósito/restante/total | integration (curl) | `POST .../remainder` → totais; duplicado → 409 | ❌ Wave 0 |
| PAY-04 | Fluxo prompt→PIN→callback por trás da interface | unit (MockGateway) + curl | `criarCobranca → confirmPin(pinho errado)=falhado → pinho certo=completo → estado da marcação` | ❌ Wave 0 |

### E2E curl (padrão do projecto — fonte: EXECUTION_SUMMARY.md "14/14 curl tests")

Sequência mínima recomendada (adaptar de `booking.integration.test.js`, que já faz este fluxo por HTTP):

1. login admin → criar 2 utilizadores com role `especialista` (bootstrap) → criar 2 serviços (um por especialista)
2. register cliente → POST `/api/appointments` (horário X) → 201 `pendente` com `specialistId`
3. GET `/api/services/:id/availability?date=` nos **dois** serviços para o mesmo horário → ambos oferecem (salas paralelas) — SPEC-04
4. login especialista A → GET `/api/specialist/appointments` → só vê as suas; especialista B não as vê — SPEC-02
5. especialista A PATCH aprova → `aguarda_deposito` + `depositDeadline` visível — SPEC-03
6. login cliente → `PATCH /api/admin/appointments/:id/status {confirmada}` → 409 — PAY-01
7. cliente `POST /api/appointments/:id/deposit` → prompt → PIN errado → `falhado` (continua `aguarda_deposito`) → PIN certo → `confirmada` — PAY-04
8. espera do prazo (env=1min) noutro caso → estado `expirada` + slot volta à disponibilidade — PAY-02
9. admin `POST .../remainder` na concluída → totais; repetir → 409 — PAY-03
10. concorrência: dois POST `/api/appointments` simultâneos para o **mesmo** especialista/hora → um 201, outro 409 (guarda existente reforçada) — SPEC-04

### Sampling Rate

- **Per task commit:** `node --env-file=.env --test test/appointmentPolicy.test.js` (< 1 s)
- **Per wave merge:** `node --env-file=.env --test test/` + `cd web && npm run lint`
- **Phase gate:** sequência E2E curl acima verde + regressão dos 14 cenários das fases 1-2 (fluxo antigo do cliente/admin continua a passar)

### Wave 0 Gaps

- [ ] `api/test/` — novos casos: transições de estado (PAY-01), filtro por especialista em slots (SPEC-04), MockGateway (PAY-04)
- [ ] `api/package.json` — adicionar script `"test": "node --env-file=.env --test test/"` (não existe hoje)
- [ ] Script/curl do E2E da fase (o projecto não guarda os curl tests em ficheiro — considerar `api/test/e2e-phase5.sh` ou documentar no VERIFICATION)
- [ ] `api/.env.example` — `DEPOSIT_DEADLINE_MINUTES`
- [ ] **Pré-existente (não bloqueante):** `booking.integration.test.js` linha 159 falha (rota `/admin/users/:id/appointments` inexistente — gap da Fase 3)

## Security Domain

> `security_enforcement` não está em `.planning/config.json` → tratado como **enabled**.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | yes (sem mudança) | JWT access/refresh existentes; login do especialista usa o mesmo `/api/auth/login` |
| V3 Session Management | yes (sem mudança) | `refresh_tokens` com rotação/reuso-detection já implementados |
| V4 Access Control | **yes (principal da fase)** | `requireRole('especialista')` + ownership no WHERE do UPDATE (`.where({ specialist_id: req.user.id })`) + admin mantém `requireAdmin` |
| V5 Input Validation | yes | zod nos novos endpoints (aprovação, deposit, remainder, PIN) |
| V6 Cryptography | yes (sem mudança) | HS256/bcrypt já em uso; NÃO inventar crypto para o mock (PIN é simulação, não segredo criptográfico) |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Especialista A aprova/edita marcação do especialista B | Tampering | Filtro `specialist_id = req.user.id` no próprio `UPDATE`/`SELECT`, não só no middleware |
| Cliente fabrica "pagou" e põe `confirmada` | Tampering | `confirmada` só escrita por `paymentService` após `verificar()`; nenhum `PATCH /status` do cliente aceita `confirmada` |
| Webhook de pagamento forjado (replay/duplicado) | Spoofing | `gateway_ref` UNIQUE + estado da transição exige `aguarda_deposito`; mock: header secreto partilhado; real: assinatura (seed) |
| Brute-force do PIN/mock ou de login do especialista | Elevation | Reutilizar `authLimiter` (rate-limit) em endpoints de pagamento/login |
| Reordenação/montagem de rotas deixa endpoint admin aberto | Elevation | `router.use(authenticate, requireAdmin)` explícito nos sub-routers admin novos (Pitfall 2) |
| Informação: cliente vê marcações alheias via rota nova | Info Disclosure | Rotas de listagem sempre com `where user_id/specialist_id` + testes negativos no E2E (passo 4) |

## Sources

### Primary (HIGH confidence)
- Leitura directa do codebase: `api/src/services/appointmentService.js`, `appointmentPolicy.js`, `authService.js`, `auth.js` middleware, `requireAdmin.js`, `server.js`, `app.js`, migrations 0001-0005, `api/package.json`, `web/src/router/index.js`, `App.vue`, `stores/auth.js`, `AdminAppointmentsView.vue`, `formatters.js` — todos os claims marcados [VERIFIED: local codebase]
- `.planning/phases/05-.../05-CONTEXT.md`, `.planning/REQUIREMENTS.md` (SPEC-01..04, PAY-01..04), `.planning/ROADMAP.md` (6 success criteria), `.planning/notes/booking-flow-specialists-payments.md`, `.planning/seeds/mpesa-real-production.md` [CITED: canonical refs]
- Execução real no ambiente: `node --test` (4 pass), curl de auth em `/api/admin/*` (401/403/200 conforme role), `/api/admin/dashboard` → 404 [VERIFIED: local run, 2026-11-18]

### Secondary (MEDIUM confidence)
- WebSearch: portal oficial M-Pesa Moçambique (`developer.mpesa.vm.co.mz`, API C2B/Reversals/Transaction Status, modelos STK-push/PIN) — confirma a nota de exploração; endpoints exactos do sandbox conforme `.planning/notes/` [MEDIUM — comunidade + portal oficial, não re-verificado contra documentação da API esta sessão]

### Tertiary (LOW confidence)
- Nenhum.

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — sem pacotes novos; tudo verificado a correr no ambiente
- Architecture: **HIGH** — padrões lidos no código; transições e lock guard documentados; mapa de responsabilidade por tier é raciocínio sobre o codebase existente
- Pitfalls: **HIGH** para Pitfalls 1-5, 8 (verificados por leitura/execução); **MEDIUM** para Pitfall 6 (nuance Knex/enum conhecida mas não executada ainda)
- Gateway/payment: **MEDIUM** — contrato é decisão do projecto (HIGH); semântica M-Pesa C2B via nota de exploração + pesquisa (MEDIUM)

**Research date:** 2026-11-18
**Valid until:** 30 dias (stack estável; único ponto móvel seria mudança de estado do repo — rever `git status` antes de executar)
