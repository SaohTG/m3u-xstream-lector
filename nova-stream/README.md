# NovaStream Monorepo

[![NovaStream CI](https://github.com/YOUR_USERNAME/YOUR_REPONAME/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/YOUR_REPONAME/actions/workflows/ci.yml)

NovaStream is a full-stack, production-ready streaming application for managing and viewing M3U and Xtream Code playlists. It provides a clean, modern interface for Live TV, Movies, and Series.

This monorepo contains:
- `packages/api`: A NestJS 10 backend for all business logic.
- `packages/web`: A Next.js 14 frontend (App Router).
- `packages/shared`: Shared types and utilities between the frontend and backend.

## ✨ Features

- **M3U & Xtream Support**: Link one M3U or Xtream playlist at a time.
- **Unified Library**: Browse Live TV, Movies, and Series from your provider.
- **Heuristic Classification**: Automatically detects Movies and Series from M3U playlists.
- **Robust Discovery**: Finds the correct Xtream `player_api.php` endpoint across multiple ports.
- **Modern Tech Stack**: NestJS, Next.js, PostgreSQL, Docker, TailwindCSS, shadcn/ui.
- **Production Ready**: Full Docker & Portainer support with a CI/CD pipeline for automated image builds.

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v18 or later
- **pnpm**: v8 or later (`npm install -g pnpm`)
- **Docker**: Latest version
- **Docker Compose**: Latest version

### 1. Local Development (with Docker)

This is the recommended way to run NovaStream locally.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/YOUR_USERNAME/YOUR_REPONAME.git
    cd nova-stream
    ```

2.  **Create environment files:**
    - Copy `.env.example` to `.env` in `packages/api`.
    - Copy `.env.example` to `.env` in `packages/web`.
    - No changes are needed for the default local setup.

3.  **Start the services:**
    Use the provided Makefile shortcut:
    ```bash
    make up
    ```
    Or run Docker Compose directly:
    ```bash
    docker-compose up --build -d
    ```

4.  **Access the application:**
    - **Web App**: [http://localhost:3000](http://localhost:3000)
    - **API Health Check**: [http://localhost:4000/api/health](http://localhost:4000/api/health)

### 2. Production Deployment (with Portainer)

This setup assumes you are deploying to a server with Portainer and a domain name. It uses pre-built images from a container registry.

1.  **CI/CD Setup (First Time Only):**
    - The GitHub Actions workflow in `.github/workflows/ci.yml` is configured to build and push Docker images to the GitHub Container Registry (GHCR).
    - You must create a **Personal Access Token (Classic)** with the `write:packages` scope.
    - Add this token as a repository secret named `CR_PAT`.
    - On your first push to `main`, the images will be built and pushed to `ghcr.io/YOUR_ORG/novastream-api:latest` and `ghcr.io/YOUR_ORG/novastream-web:latest`.

2.  **Deploy the Portainer Stack:**
    - In Portainer, go to **Stacks** > **Add stack**.
    - Give it a name (e.g., `novastream`).
    - Copy the contents of `portainer-stack.yml` into the web editor.
    - In the **Environment variables** section, define the required variables:
      - `ORG`: Your GitHub username or organization name.
      - `POSTGRES_PASSWORD`: A secure password for the database.
      - `DOMAIN`: The public domain for your app (e.g., `app.mydomain.com`). This is used for CORS and API URLs.
    - Click **Deploy the stack**.

---

## 🛠️ Makefile Commands

A `Makefile` is included for convenience.

- `make up`: Start all services.
- `make down`: Stop all services.
- `make build`: Rebuild the Docker images.
- `make logs`: Tail the logs of all services.
- `make shell-api`: Get a shell inside the running API container.
- `make install`: Install all dependencies using `pnpm`.
- `make lint`: Lint the entire codebase.
- `make test`: Run all unit tests.
- `make test-e2e`: Run API end-to-end tests.
- `make format`: Format code with Prettier.
- `make clean`: Remove `node_modules` and build artifacts.

---

## ✅ Validation Checklist

After deploying locally or in production, verify the following:

- [ ] **API Health**: `GET /api/health` returns `{"ok":true}`.
- [ ] **Link M3U**: `POST /api/playlists/link` with a valid M3U URL activates the playlist.
- [ ] **Link Xtream**: `POST /api/playlists/link` with Xtream credentials discovers the server and activates it.
- [ ] **Fetch Channels**: `GET /api/live/channels` returns a list of channels.
- [ ] **Fetch VOD**: `GET /api/vod/movies` and `GET /api/vod/series` return content if available.
- [ ] **Web UI**: The frontend loads at `http://localhost:3000`.
- [ ] **Web UI Linking**: You can successfully link a playlist from the Settings page.
- [ ] **Web UI Playback**: You can navigate to the TV section and play a live channel.
