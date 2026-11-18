---
title: Integração M-Pesa real em produção
trigger_condition: O salão tiver conta M-Pesa Business activa com NUIT registada (ou aparecer agregador com sandbox acessível, ex. ClicPay sair de piloto)
planted_date: 2026-11-18
---

# Seed: Integração M-Pesa real em produção

## Ideia

Substituir o `MockGateway` de pagamento pelo sandbox/produção reais do **M-Pesa (Vodacom Moçambique)**, mantendo o fluxo da marcação intacto — a abstracção `PaymentGateway` (`criarCobranca` / `webhook` / `verificar`) foi desenhada exactamente para isto.

## O que já está pronto quando o gatilho disparar

- Fluxo de depósito de 50% com estados `aguarda-deposito` → `confirmada` já a funcionarem com o simulador.
- O adaptador Mock replica a semântica do C2B push do M-Pesa (prompt → PIN → callback), por isso o adaptador real só tem de mapear:
  - `criarCobranca()` → POST `https://api.sandbox.vm.co.mz:18352/mpesa/c2b/v1/payrequest` (produção: host oficial sem porta de sandbox)
  - `webhook` → endpoint público para o callback do M-Pesa (precisa de URL HTTPS exposto — i.e. a API já em produção)
  - `verificar` → endpoint de *query* para confirmar estado (nunca confiar só no callback)

## Pré-requisitos para produção (do portal oficial)

1. Conta **M-Pesa Business (Lipa)** + NUIT da entidade
2. Documentos legais por tipo de entidade + formação/checklist
3. Pedido por email a `M-Pesa.business@vm.co.mz`
4. Número MSISDN de teste registado no perfil do portal para validar o sandbox antes

## Riscos a vigiar

- Sandbox só contacta o MSISDN de teste do perfil — testes com números reais exigem produção.
- Callbacks exigem URL pública HTTPS: relevar o deploy da API (hoje corre em `0.0.0.0:3001` na LAN).
- e-Mola continua sem sandbox (só contrato) — se as clientes usarem majoritariamente Movitel, ponderar agregador ou pagamento só em Vodacom.

## Gatilho

Quando: conta M-Pesa Business activa, **ou** decisão de ir a produção com pagamentos reais.
Ação: implementar `MpesaGateway` por baixo da interface existente + correr testes end-to-end no sandbox com o MSISDN de teste, sem tocar no fluxo de marcação.
