# Héritage Géraud (MVP)

Web-app pour **centraliser des documents** (PDF/IMG/DOCX) liés à une succession et en extraire des **faits uniquement** (sans interprétation).

## Règles “Facts only”
- L’app **n’infère pas** et ne donne **aucun conseil**.
- Un fait = champ structuré + **source obligatoire**: `(documentId, pageNumber, excerpt<=300, extractedAt, extractorVersion)`.
- Si absent → **inconnu** (v1: on n’invente rien, on extrait seulement ce qui est explicitement présent).

## Stack
- Next.js (App Router) + TypeScript + Tailwind
- PostgreSQL + Prisma
- Stockage fichiers sur disque (CapRover persistent app data)
- Jobs async via table `Job` en Postgres (polling)

## Prérequis
- Node 24 + `pnpm`
- Docker + Docker Compose

## Démarrage local

### 1) Démarrer l’infra

```bash
docker compose up -d
```

Services:
- Postgres: `localhost:5432` (db `heritage_geraud`, user/pass `hg/hg`)

### 2) Configurer l’ENV (simple)
Comme on est en monorepo, **Next** lit ses env depuis `apps/web` et le **worker** depuis `apps/worker`.

- Copier `apps/web/env.example` → `apps/web/.env.local`
- Copier `apps/worker/env.example` → `apps/worker/.env`

> Note: ces fichiers `.env*` ne sont pas committés.

### 3) Installer + Prisma

```bash
pnpm install
```

Appliquer Prisma en dev (le schéma est dans `packages/db/prisma/schema.prisma`):

```bash
cd packages/db
pnpm prisma:migrate:dev
```

### 4) Lancer web + worker

```bash
pnpm dev
```

## Déploiement CapRover (option B: 1 seule app)
CapRover ne déploie pas un `docker-compose.yml` complet, mais on peut faire simple avec **1 app** qui lance **web + worker** dans le même container.

### Fichiers
- `captain-definition`
- `Dockerfile`
- `scripts/start-caprover.sh` (migrations + worker + next)

### À fournir côté CapRover (variables d’env)
- `DATABASE_URL` (Neon ou autre Postgres)
- `UPLOAD_DIR` (chemin monté en “Persistent App Data”, ex: `/app/data/uploads`)
- `JOB_POLL_INTERVAL_MS` (ex: `2000`)
- `EXTRACTOR_VERSION` (ex: `v1`)

> Important: sans auth (choix volontaire), l’app est publique si le domaine est accessible.

## Parcours MVP
- Ouvrir `http://localhost:3000`
- Créer un dossier: `/casefiles`
- Dans un dossier: `Documents` → upload PDF → `Enqueue ingest`
  - le worker extrait le texte par page et remplit `DocumentPage`
- `Facts` → bouton **Extract facts** → table (facts + source)
- Validation humaine: **Valider / Rejeter / Éditer (valide)** (audit log en DB)

## API (MVP)
- `POST /api/casefiles` (create)
- `GET /api/casefiles` (list)
- `POST /api/casefiles/:id/documents/upload` (multipart `files[]`)
- `POST /api/documents/:id/ingest`
- `POST /api/casefiles/:id/extract-facts`
- `PATCH /api/facts/:id` (validate/reject/edit + AuditLog)

## Limites (volontaires, v1)
- Pas d’auth (comme demandé): **tout est public** si l’URL est accessible.
- Extraction v1: PDF texte uniquement (OCR/DOCX à brancher ensuite).

