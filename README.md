# TIRYAQ

Top-level deployment split:

- [frontend](C:/Users/zix/Desktop/akram/my-app/TIRYAQ/frontend): Vercel deployment
- [backend](C:/Users/zix/Desktop/akram/my-app/TIRYAQ/backend): Render deployment

## Runtime model

- browser loads pages from the frontend deployment
- frontend rewrites every `/api/*` request to the backend deployment
- backend owns AI calls, admin logic, doctor verification requests, reminders and database-facing API routes
- SQL migrations are stored under `backend/database`
