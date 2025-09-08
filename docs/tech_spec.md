# Spécification technique

## Stack
- **Backend**: Node.js **NestJS**, **TypeORM**, **Postgres**, **JWT**, **Axios** (TMDB/Xtream), **Class‑Validator**.
- **Web**: **React** + **Vite**, **Tailwind**, **React Router**, **Axios**, **hls.js**.
- **Mobile**: **Expo (React Native)**.
- **Infra**: **Docker Compose** (db, api, web).

## Architecture (aperçu)
```
[Web React] ——                ——> [API NestJS] ——> [Postgres]
[Mobile RN] —/         |                           |    \— TMDB (enrichissement)
                        \— Xtream/M3U (source utilisateur)
```

## Sécurité
- **JWT** (Access token). Hash **bcrypt**.
- CORS restrictif (origin configurée). Rate‑limit (à ajouter).
- Validation DTO (class‑validator). Sanitization basique.
- Pas d’hébergement de contenus : **proxy interdit** par défaut.

## Données (simplifié)
- **User**(id, email, passwordHash, displayName, createdAt)
- **PlaylistSource**(id, userId, type: 'M3U'|'XTREAM', url/baseUrl, username?, password?)
- **MediaItem**(id, externalId, type: 'movie'|'series'|'channel', title, posterUrl, group, streamUrl?)
- **Favorite**(id, userId, mediaId, createdAt)
- **Progress**(id, userId, mediaId, position, duration, updatedAt)

## Endpoints (exemples)
- `POST /auth/register {email,password,displayName}`
- `POST /auth/login {email,password}` → `{access_token}`
- `POST /playlists/parse-m3u {url}` → `items[]`
- `POST /playlists/xtream/connect {baseUrl,username,password}` → `categories, items`
- `POST /library/favorites/toggle {mediaId, title, type, posterUrl}`
- `POST /library/progress {mediaId, position, duration}`

### Exemple réponse parse-m3u
```json
{
  "items": [{
    "externalId": "m3u:123",
    "title": "Inception (2010)",
    "group": "Movies",
    "type": "movie",
    "posterUrl": "https://image.tmdb.org/t/p/w500/..."
  }]
}
```

## TMDB
- `search/multi?query=...` pour récupérer `poster_path`. Clé API via `TMDB_API_KEY`.

## UI/UX
- Grilles d’affiches (responsive), survol → résumé.  
- Page détail (poster, synopsis, bouton **Lire**).  
- Player HLS (web), player RN (expo‑av). **Reprise** depuis `Progress`.

## Scalabilité (évolution)
- Cache Redis pour TMDB, pagination, index DB, CDN images (TMDB).  
- Ajout rate‑limit, audit logs (winston), SSO OAuth2 (Apple/Google).

## Conformité
- Aucun contenu hébergé ni proxifié. Conditions d’usage claires.  
- Respect des stores (Apple/Google) : **BYO playlist**.
