# Sipun Das — Portfolio (Full Stack)

Modern portfolio with premium UI + **Node.js + Express + MongoDB (primary) / SQLite (auto fallback)** backend + proper site manager.

## Page structure
The public portfolio is split into focused pages:
- `index.html` — concise landing page with the liquid crystal hero, selected-work teaser and primary CTA
- `about.html` — story, experience and working philosophy
- `services.html` — focused service offerings and process
- `work.html` — searchable, filterable project archive with case-study modal
- `contact.html` — contact details and validated project enquiry form

All public pages share the responsive glass/liquid navigation and redesigned footer. `admin-login.html` is the dedicated sign-in page and `admin.html` is the private site manager dashboard.

## Which DB is easy for a portfolio website?
**SQLite** — zero-config single file (`backend/portfolio.db`), no Atlas account, no IP whitelist, no password, persists across restarts. The server uses **MongoDB Atlas when `MONGODB_URI` works, and automatically falls back to local SQLite** if MongoDB fails — so the site never shows offline demo data just because Atlas had a hiccup. Health check (`GET /api/health`) reports `"db": "mongodb" | "sqlite"` and the frontend label shows which one is live.

## Features
- 🌌 A single deep navy/teal visual system with warm coral accents, translucent surfaces and 3D CSS artwork
- ⌨️ Typing roles, animated counters, skill bars, scroll reveal, reviews slider, FAQ accordion, back-to-top
- 📁 **Projects** — live from API with demo fallback; filter (All/Featured/Full-stack/Frontend/Backend) + search + sort + ★ featured flag
- 📬 Contact form with validation → `POST /api/messages` → inbox
- 🛠️ **Site manager** (`admin-login.html` → `admin.html`) — authenticated dashboard with Overview stats, Projects CRUD + star/unstar, Inbox with read/unread, editable Internships content, Settings (API base + key). Guarded by `ADMIN_KEY` (`backend/.env`, default `admin123`)
- ☁️ **Cloudinary uploads** — project cover images only (jpg/png/webp/gif/avif/svg, 5MB max) in `portfolio/images/`; delete removes the asset too

## Quick start

### 1. Frontend only (demo data)
Just open `index.html` in a browser. Projects show demo data until backend runs.

### 2. Backend (Node + MongoDB)
```bash
cd backend
npm install
cp .env.example .env   # then edit .env with your MongoDB Atlas URI
npm run dev            # → http://localhost:5000
```
- Health: `GET http://localhost:5000/api/health`
- Frontend auto-connects to `http://localhost:5000`. Override: `localStorage.setItem('api_base','http://localhost:5000')`
- Seed demo projects to MongoDB: `npm run seed` (needs MONGODB_URI set)

### Free MongoDB (Atlas)
1. https://cloud.mongodb.com → free M0 cluster → Database Access (user+pass) → Network Access (allow 0.0.0.0/0)
2. Connect → Drivers → copy URI → paste into `backend/.env` as `MONGODB_URI`
3. `npm run seed` then `npm run dev`

Without `MONGODB_URI`, server runs on local SQLite file (`backend/portfolio.db`, auto-created + seeded).

## UI effects & features
- Scroll progress bar, cursor glow spotlight, shrinking navbar
- Hero entrance stagger, floating profile badges, animated gradient text, drifting orbs
- Project cards: skeleton shimmer loading, staggered entrance, 3D hover tilt, shine sweep, image zoom + overlay
- Buttons: shine-sweep hover; skill bars animate on scroll; timeline slides in; modal/toast polish
- Respects `prefers-reduced-motion`

### Cloudinary uploads — project cover images ONLY
- Creds live in `backend/.env`: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- Admin upload field (`image`) accepts **images only** (`jpg/png/webp/gif/avif/svg`, max 5MB) → stored in Cloudinary folder `portfolio/images/` (`resource_type: image`)
- **Project files (PDF/ZIP/DOC/video) are NOT stored** — only the cover image shown in the frontend
- Stored on the project: `imageUrl` (CDN URL), `imagePublicId`, `mediaType: 'image'`
- Without Cloudinary creds, upload requests fail with a clear message — paste an Image URL instead

### Portfolio documents
- Resume, internship certificates and recommendation letters live in Cloudinary under `portfolio/documents/` (PDFs as `resource_type: raw`, certificate images as `resource_type: image`)
- Run `cd backend && node upload-documents.js` to (re)upload the documents from the repo root
- The site never serves local document assets: `/api/documents/:id/view` and `/api/documents/:id/download` redirect to signed Cloudinary URLs
- `about.html#documents` renders the Documents section with in-page preview + download buttons
- Free Cloudinary plans block direct PDF CDN links, which is why the backend signs `api.cloudinary.com` URLs instead

## API
| Method | Endpoint | Auth | Body |
|---|---|---|---|
| GET | /api/projects | public | — |
| POST | /api/projects | `x-admin-key` | multipart: title, description, techs, category, featured, githubUrl, liveUrl, imageUrl, image(file) |
| PUT | /api/projects/:id | `x-admin-key` | same as POST |
| PATCH | /api/projects/:id/featured | `x-admin-key` | — toggles ★ |
| DELETE | /api/projects/:id | `x-admin-key` | — |
| GET | /api/stats | `x-admin-key` | — counts + unread |
| GET | /api/documents | public | — list of documents with signed view/download URLs |
| GET | /api/documents/:id/view | public | — redirects to inline PDF |
| GET | /api/documents/:id/download | public | — redirects to PDF download |
| GET | /api/content/internships | public | — editable internship timeline content |
| PUT | /api/content/internships | `x-admin-key` | — replace internship timeline content |
| POST | /api/messages | public | {name,email,subject,message} |
| GET | /api/messages | `x-admin-key` | — inbox |
| PATCH | /api/messages/:id | `x-admin-key` | {read: bool} |
| DELETE | /api/messages/:id | `x-admin-key` | — |

## Deploy (recommended: one Render service does everything)

The backend serves the API **and** the static frontend, so a single Render web
service hosts the whole site. `render.yaml` in the repo root is a Blueprint —
Render reads it and asks you for the secrets.

### 1. MongoDB Atlas (required — hosts wipe local files)
Render's disk is ephemeral: the SQLite fallback file is wiped on every
restart/redeploy, so **set `MONGODB_URI`** or your projects + inbox messages
will vanish. Free M0 cluster:
1. https://cloud.mongodb.com → free M0 cluster → Database Access (user+pass) →
   Network Access → allow `0.0.0.0/0`
2. Connect → Drivers → copy the URI → keep it for step 3

### 2. Cloudinary (required for image uploads)
Admin cover-image uploads go to Cloudinary (`portfolio/images/`, images-only,
5MB max) — local disk uploads would also be wiped by the host.
https://cloudinary.com → Dashboard → copy cloud name + API key + secret.

### 3. Render Blueprint
1. Push this folder to GitHub (`.env` and `*.db` are git-ignored — secrets stay local)
2. https://dashboard.render.com → New → **Blueprint** → select the repo
3. Fill the prompted env vars: `ADMIN_KEY` (change from `admin123`!),
   `MONGODB_URI`, `CLOUDINARY_*`. Leave `FRONTEND_URL` empty.
4. Deploy → open `https://<your-service>.onrender.com/api/health`
   (expect `{"ok":true,"db":"mongodb",...}`)

### 4. Post-deploy checklist
- [ ] `/api/health` shows `"db": "mongodb"` (not sqlite)
- [ ] Work grid loads your 3 real projects (MediShare, Cafe, Portfolio)
- [ ] Contact form sends → visible in Site manager inbox
- [ ] `admin-login.html` unlocks with your `ADMIN_KEY`
- [ ] `Sipun-Das-Resume.pdf` opens from the nav
- [ ] Phone test: menu opens/closes, no sideways scroll, no input zoom

### Split hosting instead? (frontend on Vercel/Netlify, API on Render)
1. Deploy `backend/` to Render as above
2. In Render env set `FRONTEND_URL=https://<your-frontend-domain>`
3. On the frontend host, nothing to configure — the site calls its own origin
   by default; to point it at Render instead, run once in the browser console:
   `localStorage.setItem('api_base','https://<your-service>.onrender.com')`

### Why it all keeps working after deploy
- Frontend API calls default to `location.origin` (same service, no CORS, no
  hardcoded localhost) — override via `localStorage.api_base` if ever needed
- CORS allows same-origin + localhost + `FRONTEND_URL` only
- `node:sqlite` needs Node ≥ 22 — pinned via `backend/package.json` engines
- `.env` is git-ignored; hosts inject the same keys as env vars
