# Phase 2: Cloudflare/Vercel Frontend & Streamlined Backend Docker Deployment Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Decouple and streamline MobileCommerce deployment by configuring the React frontend for zero-server Vercel / Cloudflare Pages hosting and simplifying the backend Docker setup into a lightweight 2-container architecture (NestJS 11 + Redis 7), eliminating Nginx entirely.

**Architecture:** 
- Frontend: Static SPA deployed to Vercel / Cloudflare Pages with `vercel.json` and `_redirects` routing rewrites, communicating via HTTPS with the backend.
- Backend: Multi-stage Dockerized NestJS 11 running on port 3000 linked with Redis 7 Alpine container via internal bridge network.
- Security: Configured CORS in NestJS allowing local development, Vercel preview domains, and production custom domain.

**Tech Stack:** React 19, Vite 8, Vercel/Cloudflare Pages SPA routing, NestJS 11, Docker, Docker Compose, Redis 7, GitHub Actions.

---

## File Structure Map

### Frontend (`MobileCommerce/frontend/`)
- `vercel.json` - SPA URL rewrite rules for Vercel
- `public/_redirects` - SPA rewrite rules for Cloudflare Pages / Netlify
- `src/services/apiClient.ts` - Read `import.meta.env.VITE_API_URL` dynamically

### Backend & Infrastructure (`MobileCommerce/`)
- `backend/src/main.ts` - Enhance CORS with dynamic origin matching for Vercel / Cloudflare preview URLs
- `infrastructure/docker/backend.Dockerfile` - Production multi-stage Alpine build for NestJS
- `docker-compose.yml` - Streamlined dev setup (Redis + Backend NestJS, no Nginx)
- `docker-compose.prod.yml` - Streamlined production setup (Redis + Backend NestJS, no Nginx)
- `.env.example` - Standardized environment variables reference
- `.github/workflows/deploy.yml` - Automated CI deployment pipeline

---

## Tasks

### Task 1: Frontend Vercel & Cloudflare Pages Configuration

**Files:**
- Create: `frontend/vercel.json`
- Create: `frontend/public/_redirects`
- Modify: `frontend/src/services/apiClient.ts`

- [ ] **Step 1: Create `frontend/vercel.json`**
Configure client-side routing rewrites so all paths route to `/index.html`:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

- [ ] **Step 2: Create `frontend/public/_redirects`**
Add rule for Cloudflare Pages / Netlify:
```text
/*    /index.html   200
```

- [ ] **Step 3: Update `frontend/src/services/apiClient.ts` for dynamic backend URL**
Ensure `baseURL` uses `import.meta.env.VITE_API_URL || '/api'`.

- [ ] **Step 4: Verify Frontend Build**
Run: `npm run build` in `frontend`
Expected: Success with 0 errors.

- [ ] **Step 5: Commit**
```bash
git add frontend/vercel.json frontend/public/_redirects frontend/src/services/apiClient.ts
git commit -m "feat(frontend): configure vercel and cloudflare pages deployment"
```

---

### Task 2: Backend CORS & Multi-Stage Dockerfile Optimization

**Files:**
- Modify: `backend/src/main.ts`
- Modify: `infrastructure/docker/backend.Dockerfile`

- [ ] **Step 1: Enhance CORS Configuration in `backend/src/main.ts`**
Update `app.enableCors` to accept requests from:
- `http://localhost:5173` (Vite dev)
- `http://localhost:3000`
- Any `*.vercel.app` domain
- Any `*.pages.dev` domain
- Custom frontend domain configured via `FRONTEND_URL` environment variable.

- [ ] **Step 2: Refactor `infrastructure/docker/backend.Dockerfile` to Multi-stage**
Create clean 2-stage build:
- Stage 1 (Builder): install dependencies, copy source, generate Prisma client, build NestJS.
- Stage 2 (Runner): copy dist, node_modules (pruned with `--omit=dev` and prisma engine), expose port 3000, run as `node` user.

- [ ] **Step 3: Verify Backend Build**
Run: `npm run build` in `backend`
Expected: Success with 0 errors.

- [ ] **Step 4: Commit**
```bash
git add backend/src/main.ts infrastructure/docker/backend.Dockerfile
git commit -m "feat(backend): configure flexible CORS and optimize multi-stage Dockerfile"
```

---

### Task 3: Streamline Docker Compose & Clean Up Nginx Artifacts

**Files:**
- Modify: `docker-compose.yml`
- Modify: `docker-compose.prod.yml`
- Delete: `infrastructure/docker/nginx.Dockerfile`, `infrastructure/docker/frontend.Dockerfile`, `infrastructure/nginx/` (or mark deprecated)
- Modify: `.env.example`

- [ ] **Step 1: Update `docker-compose.yml`**
Remove Nginx service. Keep `redis` and `backend`. Expose backend on port `3000:3000` and redis on `6379:6379`.

- [ ] **Step 2: Update `docker-compose.prod.yml`**
Remove Nginx and frontend services (since frontend is hosted on Vercel/Cloudflare). Keep `redis` and `backend`.

- [ ] **Step 3: Standardize `.env.example`**
Add all necessary environment variables with clear comments and dummy credentials:
- `DATABASE_URL`
- `PORT`
- `NODE_ENV`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `REDIS_HOST`, `REDIS_PORT`
- `FRONTEND_URL`

- [ ] **Step 4: Commit**
```bash
git add docker-compose.yml docker-compose.prod.yml .env.example
git commit -m "chore(infra): streamline docker compose by removing nginx containers"
```

---

### Task 4: Complete GitHub Actions CI/CD Pipeline

**Files:**
- Modify: `.github/workflows/backend-ci.yml`
- Modify: `.github/workflows/frontend-ci.yml`
- Modify: `.github/workflows/deploy.yml`

- [ ] **Step 1: Enhance `backend-ci.yml`**
Ensure it installs dependencies, validates Prisma schema, runs unit tests (`npm test`), and runs `npm run build`.

- [ ] **Step 2: Enhance `frontend-ci.yml`**
Ensure it installs dependencies, runs linter (`npm run lint`), and builds production bundle (`npm run build`).

- [ ] **Step 3: Implement `.github/workflows/deploy.yml`**
Provide a working deployment action that can trigger a container rebuild on push to `main`.

- [ ] **Step 4: Commit**
```bash
git add .github/workflows/
git commit -m "ci: complete automated github actions testing and deployment workflows"
```
