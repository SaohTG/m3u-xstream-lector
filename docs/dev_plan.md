# Plan de développement

## MVP (Semaines 1–4)
- Auth (register/login JWT), profil minimal.
- Import **M3U** & **Xtream** (connexion + fetch).
- Parsing + regroupement (Films/Séries/Live).
- TMDB (affiche + titre) de base.
- UI Web : Home + 4 sections + Player HLS + Ma Liste.
- API favorites/progress + persistance Postgres.
- Docker Compose (db, api, web).

## Beta (Semaines 5–8)
- Profils multiples, contrôle parental basique.
- Recherche globale, filtres par genres.
- Détails série : saisons/épisodes + **next episode**.
- UX zapping rapide Live TV.
- Amélioration perf (memo, suspense, pagination).
- Mobile (Expo) alpha : Login, Home, Player, Ma Liste.

## v1 (Semaines 9–12)
- EPG avancé (si disponible via source Xtream).
- SSO (Apple/Google) optionnel.
- Paramètres : langues, sous‑titres (si fournis par la source).
- QA, tests E2E critiques, crash/error reporting.
- Préparation Store listings et site marketing.
