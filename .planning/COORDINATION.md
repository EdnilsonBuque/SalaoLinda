# Coordenação: OpenCode (GSD) ↔ GitHub Copilot

**Objetivo:** dois agentes a trabalhar no mesmo repo sem conflitos de edição.

## Regras de ouro

1. **Um agente, uma lane.** Cada lane tem ficheiros dono; nada se edita fora da própria lane sem avisar.
2. **Antes de editar:** `git pull --rebase` não se aplica (local), mas correr `git status` e verificar se o ficheiro alvo está limpo. Se estiver modificado pelo outro agente, parar e reagir.
3. **Commits atómicos por lane** com prefixo identificativo (ver mensagens abaixo).
4. **Planos são o contrato.** Quem executa um plano é quem o marca como concluído no `Verification (plan-level)`.
5. **`.planning/STATE.md` é partilhado mas append-only** — só acrescentar linhas, nunca reescrever secções do outro.

## Lanes

### Lane A — OpenCode (GSD)
**Prefixo de commit:** `feat(phase-N):` / `docs(...):`
**Dono de:**
- `.planning/**` (STATE.md, ROADMAP, REQUIREMENTS, fases, verificação)
- Gates do fluxo: UI-SPEC, plan-check, verifier, transições
- Commits de docs e de integração
- Decisões de arquitetura/stack (mudanças em AGENTS.md)

### Lane B — Copilot
**Prefixo de commit:** `feat(copilot):` / `fix(copilot):`
**Dono de:**
- Código de implementação em `api/src/**`, `web/src/**`
- Execução de tarefas dos planos (`01-01`, `01-02`, planos da Fase 2…)
- Correções de bugs encontrados na execução
- `README.md` (seção de setup/run)

### Partilhado (coordenar antes de tocar)
- `api/.env.example`, `docker-compose.yml`, `package.json` — quem precisar avisa no commit
- `README.md` — Lane B escreve setup; Lane A acrescenta links de docs

## Protocolo de conflito

```
1. git status → ficheiro alvo modificado pelo outro?
2. Sim  → NÃO editar; registar pedido em "Pendências" abaixo e continuar noutra tarefa
3. Não  → editar, commitar de imediato com prefixo da lane
```

## Pendências / Handoffs

| Data | De | Para | Pedido | Estado |
|------|----|------|--------|--------|
| 2026-11-16 | Copilot | OpenCode | Desbloqueio MySQL (utilizador `salao`) + migrações + E2E AUTH | ✅ feito (commit `511afd6`) |
| 2026-11-16 | OpenCode | Copilot | Fase 1 planos 01-01/01-02 concluídos e validados — prontos a marcar | ✅ |
| 2026-11-16 | OpenCode | Copilot | Lane B livre para Fase 2 (Serviços & Booking) — aguarda gates GSD | ⏳ |

## Estado atual das lanes

- **OpenCode:** UI-SPEC da Fase 1 + verificação final (gsd-verifier)
- **Copilot:** aguarda; pode preparar Fase 2 quando os gates correrem
