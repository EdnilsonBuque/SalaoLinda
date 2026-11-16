# Requirements — Salão Linda

**Version:** v1 (draft)
**Created:** 2026-11-16
**Source:** PROJECT.md + pesquisa Features/Architecture (`.planning/research/`)

## v1 Requirements

### Autenticação (AUTH)

- [ ] **AUTH-01**: Cliente cria conta (nome, contacto, palavra-passe) e entra na app
- [ ] **AUTH-02**: Admin (dona) entra com credenciais de admin e acede à área de gestão
- [ ] **AUTH-03**: Utilizador sai (logout) de qualquer ecrã e a sessão persiste entre aberturas da app
- [ ] **AUTH-04**: Admin redefinir a palavra-passe de um cliente quando este o solicitar (sem infraestrutura de email em v1)

### Serviços (SERV)

- [ ] **SERV-01**: Cliente vê a lista de serviços com foto, preço e duração
- [ ] **SERV-02**: Admin cria um serviço com nome, descrição, foto, preço e duração
- [ ] **SERV-03**: Admin edita os dados de um serviço existente (preço, duração, foto, nome)
- [ ] **SERV-04**: Admin remove um serviço do catálogo

### Marcação (BOOK)

- [ ] **BOOK-01**: Cliente escolhe serviço → data → hora e envia uma marcação
- [ ] **BOOK-02**: A app mostra apenas horários disponíveis que respeitam a duração do serviço e não colidem com marcações existentes (nunca há dupla marcação na mesma hora)
- [ ] **BOOK-03**: Após enviar, o cliente vê confirmação imediata "pedido enviado — aguarda confirmação"
- [ ] **BOOK-04**: Cliente escolhe a data num calendário e vê a disponibilidade do dia antes de ir ao salão

### Minhas Marcações (APPT)

- [ ] **APPT-01**: Cliente vê a lista das suas marcações com estado (pendente / confirmada / rejeitada / cancelada / concluída)
- [ ] **APPT-02**: Cliente cancela uma marcação pendente ou confirmada (dentro do prazo definido pelo admin)
- [ ] **APPT-03**: Estados mudam apenas pelas ações permitidas: cliente cancela, admin confirma/rejeita/conclui — o cliente não pode alterar estados por conta própria

### Gestão do salão — Admin (ADM)

- [ ] **ADM-01**: Admin vê as marcações pendentes e confirma ou rejeita cada uma (rejeição opcionalmente com motivo curto)
- [ ] **ADM-02**: Admin vê o horário do dia (agenda de hoje) com todos os estados
- [ ] **ADM-03**: Admin vê os ganhos do dia e da semana (soma das marcações concluídas, com o preço registado na marcação)
- [ ] **ADM-04**: Admin vê os serviços mais procurados (ranking por número de marcações/conclusões)
- [ ] **ADM-05**: Admin vê a lista de clientes registados com o seu histórico de marcações

### Avaliação (RATE)

- [ ] **RATE-01**: Após o atendimento (marcação concluída), o cliente atribui uma nota (estrelas) e um comentário ao serviço
- [ ] **RATE-02**: Cada marcação concluída pode ser avaliada apenas uma vez, apenas pelo cliente dono da marcação
- [ ] **RATE-03**: Admin vê as avaliações recebidas (nota + comentário) e a média por serviço

### Aplicação Android (MOB)

- [ ] **MOB-01**: APK Android instalável gerado com Capacitor
- [ ] **MOB-02**: Interface mobile-first em português (telas, cartões, botões, calendário) com design cuidado

## v2 Requirements (adiados)

- [ ] **APPT-04**: Cliente altera (reagenda) uma marcação em vez de apenas cancelar
- [ ] **QUEUE-01**: Cliente vê a sua posição na fila e o tempo estimado de espera para o dia marcado *(resolve "fila e espera" — depende do ciclo de estados estar sólido; gatilho: primeira semana de marcações reais)*
- [ ] **AUTH-05**: Cliente recupera a palavra-passe por email (requer SMTP configurado)
- [ ] **NOTIF-01**: Push notifications de confirmação/rejeição (Capacitor + FCM)
- [ ] **REBOOK-01**: Lembrete automático pós-atendimento para reagendar

## Out of Scope

- Pagamentos online / depósitos / taxas de não-comparação — o salão recebe presencialmente; regista-se apenas o valor faturado
- Marketplace / perfil público do salão / descoberta — salão único, sem comissões nem complexidade de marketplace
- Chat / mensagens em tempo real — o estado da marcação + motivo curto de rejeição cobrem a comunicação
- Kiosk de walk-in / TV de fila / QR check-in — hardware desnecessário para o volume do salão
- Multi-equipa / comissões / salários — dona única
- Campanhas SMS/WhatsApp, email marketing, pontos de fidelidade — escopo que não muda o fluxo de caixa real
- POS / inventário de produtos — o salão vende serviços
- iOS — pedido é APK Android

## Traceability

<!-- Preenchido pelo roadmap: REQ-ID → Fase -->

| Requirement | Phase |
|-------------|-------|
| AUTH-01 | Phase 1 |
| AUTH-02 | Phase 1 |
| AUTH-03 | Phase 1 |
| AUTH-04 | Phase 1 |
| SERV-01 | Phase 2 |
| SERV-02 | Phase 2 |
| SERV-03 | Phase 2 |
| SERV-04 | Phase 2 |
| BOOK-01 | Phase 2 |
| BOOK-02 | Phase 2 |
| BOOK-03 | Phase 2 |
| BOOK-04 | Phase 2 |
| APPT-01 | Phase 2 |
| APPT-02 | Phase 2 |
| APPT-03 | Phase 2 |
| ADM-01 | Phase 2 |
| ADM-02 | Phase 3 |
| ADM-03 | Phase 3 |
| ADM-04 | Phase 3 |
| ADM-05 | Phase 3 |
| RATE-01 | Phase 3 |
| RATE-02 | Phase 3 |
| RATE-03 | Phase 3 |
| MOB-01 | Phase 4 |
| MOB-02 | Phase 4 |

**Coverage:** 25/25 v1 requirements mapped — no orphans, no duplicates.
