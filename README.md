# TIRYAQ

TIRYAQ is a digital health platform that connects patients and doctors inside one product experience.
The project combines:

- a multilingual patient experience
- a doctor dashboard for appointments, community content, and medical records
- an AI medical assistant for guidance and file/image analysis
- a backend layer for AI orchestration, moderation, admin features, and database-facing APIs

## Repository structure

This workspace contains three repositories:

- `frontend/`: Next.js frontend deployed separately
- `backend/`: Next.js backend/API deployed separately
- root repository: coordination layer, shared documentation, and high-level project structure

Additional documentation is available in `docs/`.

## Architecture

The application is split into two deployable services:

1. `frontend`
   Renders pages, dashboards, the AI interface, community views, and user-facing flows.
2. `backend`
   Exposes API routes, handles AI requests, runs admin logic, manages reminders, and talks to Supabase/services.

Runtime flow:

1. The browser loads the frontend application.
2. Frontend requests to `/api/*` are proxied or routed to the backend service.
3. The backend executes protected business logic and returns normalized responses.
4. SQL setup and migrations live under `backend/database`.

## Main functional areas

- Authentication and onboarding
- Patient and doctor dashboards
- Doctor publications and community feed
- Medical record and prescription flows
- AI chat and AI vision analysis
- Admin and moderation tooling

## Local development

Start both applications in separate terminals.

Frontend:

```powershell
cd frontend
npm install
npm run dev
```

Backend:

```powershell
cd backend
npm install
npm run dev
```

Default local URLs:

- frontend: `http://127.0.0.1:3000`
- backend: `http://127.0.0.1:4000`

## Environment setup

Each sub-repository provides its own `.env.example`:

- `frontend/.env.example`
- `backend/.env.example`

Configure frontend and backend separately before starting the stack.

## Deployment model

- frontend: designed for Vercel deployment
- backend: designed for Render deployment

Production deployment depends on matching:

- frontend origin variables
- backend CORS/base URL variables
- shared Supabase credentials
- AI provider keys on the backend

## Useful paths

- `frontend/src/`: frontend application source
- `backend/src/`: backend/API source
- `backend/database/`: SQL setup and migrations
- `docs/`: project documentation and manuals

## Notes

- The frontend and backend are versioned as separate Git repositories.
- Keep API contracts aligned when changing request/response payloads.
- Prefer updating translation dictionaries and language-aware UI bindings together when working on multilingual features.
