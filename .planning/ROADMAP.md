# Roadmap: Salão Linda - Gestão e Marcações

## Overview

O percurso vai da fundação ao APK: primeiro o esqueleto (scaffold Vue 3 + Vuetify, schema MySQL com DECIMAL/fuso `Africa/Maputo`, auth JWT com RBAC servidor-side), depois o coração do produto — catálogo de serviços e o motor de marcação à prova de dupla marcação com o ciclo de estados e a caixa de aprovação do admin; a seguir as projeções que dão valor à dona (agenda de hoje, ganhos dia/semana, serviços procurados, clientes frequentes) e as avaliações pós-atendimento; por fim o empacotamento Android com Capacitor e a passagem de verificação em telemóvel físico. Granularidade coarse (4 fases) para rapidez até ao APK.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [ ] **Phase 1: Foundation — Scaffold, Schema & Auth** - Monorepo, migrations Knex (MySQL 8.4) e autenticação JWT com papéis
- [ ] **Phase 2: Services & Booking Core** - Catálogo CRUD, motor de disponibilidade sem colisões, ciclo de estados, Minhas Marcações e caixa de aprovação do admin
- [ ] **Phase 3: Dashboard, Ratings & Client History** - Agenda de hoje, ganhos dia/semana, ranking de serviços, histórico de clientes e avaliações
- [ ] **Phase 4: Android APK Packaging** - APK Capacitor instalável e verificação em telemóvel físico

## Phase Details

### Phase 1: Foundation — Scaffold, Schema & Auth
**Goal**: Contas e sessão funcionam sobre uma base sólida — scaffold Vue 3 + Vuetify, schema MySQL e auth JWT/RBAC no servidor
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04
**Success Criteria** (what must be TRUE):
  1. Cliente cria conta (nome, contacto, palavra-passe) e entra na app sem ajuda de terceiros
  2. Admin entra com credenciais de admin e acede à área de gestão; um cliente tenta aceder e é recusado pelo servidor (não só pela interface)
  3. Utilizador sai (logout) de qualquer ecrã e a sessão persiste entre fechar e reabrir a app
  4. Admin redefine a palavra-passe de um cliente quando este pede, e o cliente entra com a nova palavra-passe
**Plans**: TBD
**UI hint**: yes

### Phase 2: Services & Booking Core
**Goal**: O ciclo completo de marcação funciona de ponta a ponta — cliente marca sem nunca haver dupla marcação, admin aprova
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: SERV-01, SERV-02, SERV-03, SERV-04, BOOK-01, BOOK-02, BOOK-03, BOOK-04, APPT-01, APPT-02, APPT-03, ADM-01
**Success Criteria** (what must be TRUE):
  1. Admin cria, edita e remove serviços (nome, descrição, foto, preço, duração) e as alterações refletem-se no catálogo do cliente
  2. Cliente vê a lista de serviços com foto, preço e duração
  3. Cliente escolhe serviço → data (calendário) → hora e envia a marcação, recebendo a confirmação imediata "pedido enviado — aguarda confirmação"
  4. A app mostra apenas horários livres que respeitam a duração e não colidem com marcações existentes; dois pedidos simultâneos para a mesma hora nunca criam dupla marcação — o segundo recebe aviso de conflito e horários atualizados
  5. Cliente vê Minhas Marcações com o estado correto e cancela uma pendente/confirmada; admin confirma ou rejeita cada pendente (motivo curto opcional); estados mudam apenas pelas ações permitidas
**Plans**: TBD
**UI hint**: yes

### Phase 3: Dashboard, Ratings & Client History
**Goal**: A dona gere o salão com números e histórico, e os clientes avaliam o atendimento concluído
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: ADM-02, ADM-03, ADM-04, ADM-05, RATE-01, RATE-02, RATE-03
**Success Criteria** (what must be TRUE):
  1. Admin vê o horário do dia (agenda de hoje) com todas as marcações e respetivos estados
  2. Admin vê os ganhos do dia e da semana somando o preço registado em cada marcação concluída (editar preço de um serviço não altera ganhos passados)
  3. Admin vê o ranking dos serviços mais procurados por número de marcações/conclusões
  4. Admin vê a lista de clientes registados com o histórico de marcações de cada um
  5. Depois de uma marcação concluída, o cliente atribui nota (estrelas) + comentário — uma única vez e só pelo dono da marcação — e o admin vê as avaliações recebidas e a média por serviço
**Plans**: TBD
**UI hint**: yes

### Phase 4: Android APK Packaging
**Goal**: A app chega às mãos do utilizador como APK Android instalável, com a interface mobile-first verificada em dispositivo real
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: MOB-01, MOB-02
**Success Criteria** (what must be TRUE):
  1. APK Android gerado com Capacitor instala e abre num telemóvel físico
  2. Na app instalada, login, marcação e dashboard funcionam contra o backend real (URL da API configurada no build, não localhost)
  3. Interface mobile-first em português (telas, cartões, botões, calendário) com design cuidado verificada num ecrã de 360px, sem elementos cortados ou cobertos pelo teclado
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation — Scaffold, Schema & Auth | 0/TBD | Not started | - |
| 2. Services & Booking Core | 0/TBD | Not started | - |
| 3. Dashboard, Ratings & Client History | 0/TBD | Not started | - |
| 4. Android APK Packaging | 0/TBD | Not started | - |
