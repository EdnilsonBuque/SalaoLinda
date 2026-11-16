# Salão Linda — Gestão e Marcações

Aplicação móvel (APK Android) para gestão de serviços, marcações e ganhos do **Salão Linda**.

- **Web/App:** `web/` — Vue 3 + Vuetify 4 (Vite)
- **API:** `api/` — Node.js + Express 5 + MySQL 8.4 (Knex + mysql2)
- **Fuso do salão:** `Africa/Maputo` (`SALON_TZ`), datas de marcação em `DATETIME` wall-clock (sem `TIMESTAMP`)
- **Idioma UI:** português

## Pré-requisitos

- Node.js 26.x LTS recomendado (Node >= 22)
- npm
- MySQL 8.4 LTS em execução localmente **ou** Docker (`docker compose`)

## Configuração

### 1) Base de dados

**Opção A — Docker (recomendado quando disponível):**
```bash
docker compose up -d
```
Cria MySQL 8.4 com BD `salao_linda` (utf8mb4). Ver `docker-compose.yml`.

**Opção B — MySQL local (Ubuntu/dev sem password para root via socket):**
```bash
mysql -u root -e "CREATE DATABASE IF NOT EXISTS salao_linda CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```
Se o acesso root exigir `sudo`, execute com privilégios adequados e ajuste `api/.env`.

### 2) API

```bash
cd api
cp .env.example .env   # ajustar segredos e credenciais DB
npm install
npm run migrate:latest
npm run bootstrap:admin
npm run dev            # http://localhost:3001
```

Scripts úteis: `npm run migrate:rollback`, `npm run migrate:status`, `npm start`.

Bootstrap admin usa `ADMIN_NAME`, `ADMIN_PHONE`, `ADMIN_PASSWORD` do `api/.env`.

### 3) Web

```bash
cd web
cp .env.example .env   # VITE_API_BASE_URL obrigatório
npm install
npm run dev            # http://localhost:3000
```

`web/src/config.js` falha explicitamente se `VITE_API_BASE_URL` estiver em falta (evita APK apontado para localhost por engano).

## Verificação rápida (Fase 1 / AUTH)

1. Migrar BD e correr `bootstrap:admin`.
2. Iniciar API e Web.
3. Registar cliente (nome, contacto, palavra-passe) e confirmar login automático.
4. Terminar sessão e voltar a entrar; recarregar a página confirma persistência de sessão.
5. Entrar como admin (`ADMIN_PHONE`/`ADMIN_PASSWORD`) → aceder a **Gestão de clientes** e redefinir palavra-passe de um cliente.
6. Entrar como cliente com a nova palavra-passe.
7. Confirmar que cliente não acede a `/api/admin/*` (403 no servidor).

## Convenções importantes

- Dinheiro: `DECIMAL(10,2)`; snapshots em marcações (`price_at_booking`, `duration_at_booking`).
- Tempos de marcação: `DATETIME` wall-clock no fuso `Africa/Maputo` (nunca `TIMESTAMP` para estes campos).
- Papéis: `client` | `admin` (RBAC aplicado no servidor).
- Tokens: JWT access + refresh com rotação; refresh tokens persistidos/revogáveis.

## Notas

- Docker pode não estar disponível em todos os ambientes; use MySQL 8.4 local equivalente.
- APK/Capacitor e build Android são alvo da Fase 4.
