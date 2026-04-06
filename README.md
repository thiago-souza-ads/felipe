# Felipe — Sistema de Gestão Documental Inteligente

Sistema de gestão documental com busca por linguagem natural (RAG), autenticação JWT e multi-tenant.

**URL:** https://felipe.nextagent.com.br

## Arquitetura

```
felipe.nextagent.com.br
       │
  [Traefik v3] → TLS / Let's Encrypt
       │
  ┌────┴──────────────────────────────────┐
  │  /api/auth  /api/users  /api/docs  /  │
  ├────────────────────────────────────────┤
  │  auth:3001  users:3002  docs:3003  frontend:3000 │
  └────┬──────────────────────────────────┘
       │
  [PostgreSQL + pgvector] + [MinIO]
```

## Microserviços

| Serviço | Porta | Responsabilidade |
|---------|-------|-----------------|
| auth | 3001 | Login, registro, JWT, refresh token |
| users | 3002 | Perfis de usuário, roles |
| docs | 3003 | Upload, extração, embeddings, RAG chat |
| frontend | 3000 | Interface web Next.js |

## Stack

- **Runtime:** Node.js 20 + TypeScript
- **Framework:** Fastify
- **ORM:** Prisma
- **Banco:** PostgreSQL 16 + pgvector
- **Storage:** MinIO (S3-compatible)
- **LLM:** Anthropic Claude (claude-3-5-haiku) para chat RAG
- **Frontend:** Next.js 14 + Tailwind CSS
- **Deploy:** Docker Swarm + Traefik

## Endpoints

### Auth (`/api/auth`)
- `POST /api/auth/register` — Criar conta
- `POST /api/auth/login` — Login (retorna JWT + refresh token)
- `POST /api/auth/refresh` — Renovar access token
- `POST /api/auth/logout` — Logout
- `GET  /api/auth/me` — Dados do usuário autenticado

### Users (`/api/users`)
- `GET  /api/users/me` — Perfil do usuário
- `PUT  /api/users/me` — Atualizar perfil
- `GET  /api/users` — Listar todos (admin)
- `DELETE /api/users/:id` — Deletar usuário (admin)

### Docs (`/api/docs`)
- `POST /api/docs/upload` — Upload de documento (multipart)
- `GET  /api/docs` — Listar documentos do usuário
- `GET  /api/docs/:id` — Detalhes + URL de download
- `DELETE /api/docs/:id` — Deletar documento
- `POST /api/docs/chat` — Chat por linguagem natural

## Tipos de Arquivo Suportados

PDF, DOCX, TXT, PNG, JPG, XLSX

## Rodar Localmente

```bash
# 1. Subir infra local
docker compose up postgres minio -d

# 2. Auth
cd services/auth && cp .env.example .env && npm install && npm run migrate && npm run dev

# 3. Users
cd services/users && cp .env.example .env && npm install && npm run migrate && npm run dev

# 4. Docs
cd services/docs && cp .env.example .env && npm install && npm run migrate && npm run dev

# 5. Frontend
cd frontend && cp .env.example .env && npm install && npm run dev
```

## Secrets GitHub Actions (para CI/CD)

Configure em Settings > Secrets:

| Secret | Valor |
|--------|-------|
| VPS_HOST | IP da VPS |
| VPS_USER | root |
| VPS_SSH_KEY | Chave SSH privada |
| POSTGRES_PASSWORD | Senha forte |
| JWT_SECRET | String longa e aleatória |
| ANTHROPIC_API_KEY | sk-ant-... |
| MINIO_ACCESS_KEY | minioadmin |
| MINIO_SECRET_KEY | Senha forte |
| GH_TOKEN | Token GitHub |

## Empresa

NextAge — Todos os direitos reservados.
