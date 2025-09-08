# IPTV Multiplatform App (Web + iOS/Android + API)

Monorepo de démarrage **prêt à l’emploi** pour une application IPTV de type Netflix :
- Connexion via **M3U** ou **Xtream Codes**
- **Compte unique** synchronisé (favoris, progression)
- 4 sections : **Films**, **Séries**, **TV en direct**, **Ma Liste**
- Enrichissement **TMDB** (affiches, métadonnées)
- **Docker Compose** pour API + Postgres + Web

## Démarrage rapide (Docker)

1) Dupliquez les variables d'environnement :  
```bash
cp .env.example .env
cp backend/.env.example backend/.env
```
2) Lancez :
```bash
docker compose up --build
```
- API NestJS disponible sur `http://localhost:4000`
- Web (Vite) sur `http://localhost:5173`

> ⚠️ Mobile (Expo) se lance en local hors Docker : voir `mobile/README.md`.

## Démarrage local (sans Docker)

- **API** :
  ```bash
  cd backend
  npm i
  npm run start:dev
  ```
- **Web** :
  ```bash
  cd web
  npm i
  npm run dev
  ```
- **Mobile (Expo)** :
  ```bash
  cd mobile
  npm i
  npm run start
  ```

## Exemple d’appels API

- **Créer un compte**
```bash
curl -X POST http://localhost:4000/auth/register -H "Content-Type: application/json" -d '{
  "email":"demo@user.com","password":"demo123","displayName":"Demo"
}'
```

- **Se connecter (JWT)**
```bash
curl -X POST http://localhost:4000/auth/login -H "Content-Type: application/json" -d '{
  "email":"demo@user.com","password":"demo123"
}'
```

- **Parser une playlist M3U**
```bash
curl -X POST http://localhost:4000/playlists/parse-m3u -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" -d '{
  "url":"https://exemple.com/playlist.m3u"
}'
```

- **Connexion Xtream**
```bash
curl -X POST http://localhost:4000/playlists/xtream/connect -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" -d '{
  "baseUrl":"http://your-xtream-host:port",
  "username":"user",
  "password":"pass"
}'
```

- **Ajouter aux favoris**
```bash
curl -X POST http://localhost:4000/library/favorites/toggle -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" -d '{
  "mediaId":"ext:12345","title":"Inception","type":"movie","posterUrl":"https://image..."
}'
```

- **Mettre à jour la progression**
```bash
curl -X POST http://localhost:4000/library/progress -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" -d '{
  "mediaId":"ext:12345","position":120,"duration":8400
}'
```

## Avertissement légal
Ce projet fournit un **lecteur** pour des playlists fournies par l’utilisateur. Vous êtes responsable du respect des **droits et licences** applicables à tout flux que vous utilisez.
