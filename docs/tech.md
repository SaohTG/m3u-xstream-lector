# Documentation technique

## Stack
- Next.js 14 (App Router) + TailwindCSS (dark, grid, skeletons)
- Prisma + PostgreSQL
- JWT cookies httpOnly (access + refresh)
- Crypto AES-256-GCM (identifiants Xtream au repos)
- HLS.js pour lecture m3u8

## Schéma DB (Prisma)
Voir `prisma/schema.prisma` : `User`, `XtreamLink`, `RefreshToken`, `Device`, `WatchlistItem`, `Progress`.

## Endpoints (OpenAPI)
Voir `openapi.yaml`.

## Flux d’auth
1. **Register/Login** → set cookies `nova_access` & `nova_refresh`.
2. Middleware protège routes.
3. **Refresh** : `/api/auth/refresh` génère un nouvel access si refresh valide.

## Intégration Xtream
- `POST /api/xtream/link` : enregistre (chiffré) host/port/username/password.
- `GET /api/xtream/detail` : *proxy* vers Xtream (exemple simplifié).
- `GET /api/xtream/stream` : construit l’URL de flux (VOD/séries/live).

> Adaptez les patterns d’URL selon votre fournisseur Xtream (certains fournissent `.mp4`/`.ts`/`.m3u8`).

## Sécurité
- Rate limiting à ajouter derrière un proxy (Cloudflare/NGINX) ou middleware Redis.
- CORS : pas nécessaire en même origine (web+api). Sinon restreindre aux domaines Nova.
- Validation : **zod** possible sur chaque payload (omise pour concision MVP).

## Lecteur
- `src/app/watch/[type]/[id]` :
  - Si `.m3u8` → HLS.js
  - Sinon fallback <video src="..."> (MP4/TS).

## TMDB (reviews)
- `/api/tmdb/review` : recherche par titre, renvoie `overview` en **fr-FR**.
- **Important** : **aucune image** TMDB n’est utilisée (contrainte stricte).

## Déploiement
- Docker (web + db).
- Secrets via `.env`.
- Migration Prisma à l’init.
