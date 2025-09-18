# Nova Stream — MVP (SaaS web)

MVP web (Next.js 14 + PostgreSQL + Prisma) : authentification JWT (cookies httpOnly), liaison Xtream **persistante et chiffrée**, proxy TMDB (reviews uniquement), lecteur intégré (HLS). UI moderne type Netflix/Apple (Tailwind).

## 🚀 Lancement rapide (Docker)

```bash
cp .env.example .env
# Générez une clé de 32 octets base64 pour le chiffrement Xtream :
# Linux/macOS:
#   openssl rand -base64 32
# Windows (PowerShell):
#   [Convert]::ToBase64String((1..32 | %%{{Get-Random -Maximum 256}}))

# Éditez .env (secrets JWT + TMDB + NOVA_CRYPT_KEY_BASE64)
docker-compose up --build -d
# Dans un autre terminal (à faire une seule fois):
docker exec -it $(docker ps -qf "name=web") npx prisma migrate deploy
# OU depuis l'hôte (si Node installé):
#   npm install
#   npx prisma migrate dev
```

- App : http://localhost:3000
- DB : `postgres://nova:nova@localhost:5432/nova`

### Comptes de démo
Créez un compte via **/auth/register** puis liez un compte Xtream via **/onboarding/xtream**.

> Les endpoints Xtream réels varient selon le fournisseur. Adaptez `src/app/api/xtream/*` si besoin (patterns URL VOD/séries/live, posters, etc.).

## 🔐 Sécurité
- Mots de passe hashés (argon2).
- JWT access/refresh (cookies http-only).
- Identifiants Xtream chiffrés **au repos** via AES-256-GCM (clé dans `NOVA_CRYPT_KEY_BASE64`).
- Middleware protège pages et APIs ; refresh silencieux via `/api/auth/refresh` (à appeler côté client via timer si souhaité).

## 📚 Architecture
- **Frontend/Backend**: Next.js App Router
- **DB**: PostgreSQL + Prisma
- **Auth**: `src/app/api/auth/*`
- **Xtream**: `src/app/api/xtream/*`
- **TMDB (reviews)**: `src/app/api/tmdb/review`
- **Lecteur**: `src/app/watch/[type]/[id]` avec HLS.js

## 📦 Roadmap (extrait)
- MVP (présent) → Beta (multi-profils, EPG, “Continuer à regarder”) → v1 (billing SaaS, admin, analytics).
Voir `docs/roadmap.md`.

## 🧪 Dév local (sans Docker)
```bash
npm install
cp .env.example .env
# Mettez DATABASE_URL vers un Postgres local (ou utilisez sqlite si vous préférez)
npx prisma migrate dev
npm run dev
```

## 🧾 OpenAPI
Cf. `openapi.yaml`.

## 📝 Licence
Propriété du projet Nova Stream — usage interne MVP.
