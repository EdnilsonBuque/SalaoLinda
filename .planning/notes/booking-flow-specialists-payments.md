---
title: Fluxo de marcação com especialistas e pagamento parcial
date: 2026-11-18
context: Exploração /gsd-explore — decisão do utilizador sobre 2 especialistas, aprovação e depósito de 50%
---

# Fluxo de marcação com especialistas e pagamento parcial

## Decisões do utilizador (Socratic exploration)

| Tema | Decisão |
|------|---------|
| Ordem do fluxo | **Aprovação → depois pagamento** (nunca pagar por um horário que pode ser recusado) |
| Expiração | Depois de aprovada, fica "à espera do depósito" com **prazo**; sem pagamento, **expira e o horário volta a ficar livre** |
| Método de pagamento | **Mobile money (M-Pesa / e-Mola)** — o que as clientes usam de facto em Maputo |
| Restante 50% | Pago ao balcão no salão; **o admin regista o recebimento** |
| Especialistas | **Login próprio por especialista** (cabeleireiro + manicurista) — cada um vê só as suas marcações; a dona vê tudo |
| Horários | **Mesmos horários, salas paralelas** — seg–sáb 09:00–18:00, ambos atendem ao mesmo tempo |

## Máquina de estados da marcação (resultante)

```
pedido ──(especialista aprova)──▶ aguarda-deposito ──(pagamento 50%)──▶ confirmada ──(atendimento)──▶ concluida
  │                                   │                                     │
  │(especialista rejeita)             │(prazo expira)                       │(admin marca restante pago)
  ▼                                   ▼                                     ▼
rejeitada                          expirada                            concluida + restante pago
```

Regras críticas:
- **Validade só com depósito**: `confirmada` só é alcançável através do pagamento de 50%.
- **Expiração liberta o slot**: `aguarda-deposito` é um estado com deadline — o job/timer devolve o horário à disponibilidade.
- **Conflito por especialista**: a query de sobreposição passa de `WHERE colide no tempo` para `WHERE colide no tempo E MESMO especialista`. Corte (cabeleireiro) e manicure às 10:00 coexistem; dois cortes às 10:00, nunca.

## Estratégia de pagamento (sandbox)

Investigação de 2026-11-18:

- **M-Pesa (Vodacom)** — sandbox **público e grátis**: registo em `developer.mpesa.vm.co.mz` → API key → `api.sandbox.vm.co.mz:18352`. Modelo C2B push (prompt no telemóvel + PIN, equivalente a STK). Sandbox só contacta o MSISDN de teste do perfil. Produção exige conta M-Pesa Business + NUIT + pedido por email.
- **e-Mola (Movitel)** — **sem sandbox público**: SOAP/USSD-push (`BCCSGateway`), WSDL e credenciais só após contrato assinado. O `brilliant_mind/emola-sdk` (PHP) traz stub `fake()` — sinal de ausência de ambiente de teste.
- **ClicPay (Maputo)** — sandbox + API com KYC individual (BI), mas ainda em piloto do Banco de Moçambique.
- **pay.co.mz / MoPayment** — só produção.

**Decisão arquitectónica recomendada:** camada `PaymentGateway` desacoplada (`criarCobranca` / `webhook` / `verificar`) com `MockGateway` primeiro (simula prompt → PIN → callback com o mesmo semântica do M-Pesa) e o sandbox real do M-Pesa como segundo adaptador. Assim a troca por gateway real não toca no fluxo da marcação.

## Papéis resultantes (RBAC)

- **admin (dona)** — visibilidade total, regista o restante 50%, gere serviços
- **especialista** ×2 — login próprio, vê e aprova/rejeita só as marcações dos seus serviços
- **cliente** — marca, paga o depósito, cancela

## Efeitos em artefactos existentes

- `REQUIREMENTS.md`: novos SPEC-01..04 + PAY-01..04; **ADM-01 anotado** (aprovação passa ao especialista); item "Pagamentos online / depósitos" **revogado do Out of Scope**.
- `ROADMAP.md`: nova **Fase 5** acrescentada (execução 1→2→3→4→5).
- Observação lateral: o estado das Fases 1–4 no roadmap diz "Not started" apesar de o produto já estar construído e instalado em APK — merece sincronização quando se retomar o `/gsd-progress`.
