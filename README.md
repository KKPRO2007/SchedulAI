# SchedulAI

**AI-powered academic timetable & resource management system**

🔗 **Live demo:** https://schedul-ai-app.vercel.app
📦 **Repository:** https://github.com/KKPRO2007/SchedulAI

SchedulAI brings institutional data, scheduling rules, rooms, faculty availability and workload into one controlled workspace. It validates the input, generates clash-free candidate timetables, explains their scores, and publishes only what an administrator approves.

## Demo logins

| Role | Email | Password | Can do |
|---|---|---|---|
| Administrator | `admin@schedulai.app` | `admin123` | Approve, reject, publish and roll back versions; master data; audit log |
| Coordinator | `coordinator@schedulai.app` | `coord123` | Import files, generate & compare candidates, submit drafts, plan substitutes |
| Faculty | `faculty@schedulai.app` | `faculty123` | Personal timetable, preferred teaching window, change requests |
| Student | `student@schedulai.app` | `student123` | Read-only published timetable for their section |

The demo uses a synthetic campus (5 departments, 22 sections across 4 shifts, 45 faculty, 34 rooms, 58 subjects). No real personal data is used.

## Features

- **Smart import:** Excel, CSV, ODS, JSON with any file name; columns are mapped automatically, missing values are inferred and flagged, and everything is previewed before saving. Six demo files are included.
- **Constraint-aware generation:** most-constrained-first placement with randomised restarts. Seven hard constraints are always enforced (no teacher, section or room clash; capacity; labs in laboratories; availability and shift boundaries; every weekly hour placed).
- **Explainable scoring:** three candidates (Balanced, Compact, Preference-first) ranked by
  `Score = 0.30 × workload balance + 0.20 × preference + 0.20 × room utilisation + 0.15 × compactness + 0.15 × stability`.
  Weights are adjustable, and each component shows the observation behind it.
- **Version lifecycle:** Draft → Submitted → Approved → Published. Publishing archives the previous version, and any archived version can be restored.
- **Substitution support:** ranked substitutes for an absent teacher by subject competency, department, spare workload and preferred window. The result becomes a new draft for approval.
- **Change requests:** leave, substitution, room and availability requests with approve/reject decisions.
- **Audit log:** imports, generation runs, approvals, publications, requests and exports are recorded with the actor and time.
- **Downloads:** PDF (print), Excel (per section or per teacher), CSV and `.ics` calendar files.
- **Security:** JWT authentication with role checks on every API call. The server rejects unauthorised requests even if the UI hides a button.
- **Works offline:** if the API or database is unreachable, the demo runs entirely in the browser with the same roles and workflow.

## Architecture

| Layer | Technology | Responsibilities |
|---|---|---|
| Presentation | React, TypeScript, Tailwind CSS, three.js | Role workspaces, import wizard, timetable grids, 3D visuals |
| Application / API | Node.js, Express, JWT | Auth & roles, validation, bulk import, versions, requests, audit |
| Intelligence | Constraint engine + scoring (TypeScript) | Hard/soft validation, candidate generation, substitution ranking |
| Data | PostgreSQL (Neon) | Master data, versioned timetables (JSONB), requests, audit log |

```
api/index.js        Vercel serverless entry (wraps the Express app)
backend/src/        Express app, routes, JWT middleware, PostgreSQL pool
backend/sql/        Schema (tables are created automatically on first request)
frontend/src/       React app (pages, components, scheduler, scoring, import)
frontend/public/demo/  Sample files for the import demo
```

## Run locally

```bash
# API (needs PostgreSQL; create backend/.env with DATABASE_URL=..., PORT=5000, AUTH_SECRET=...)
cd backend && npm install && npm run dev

# Web app (http://localhost:5173). Works without the API using browser demo data.
cd frontend && npm install && npm run dev
```

## Deploy (Vercel)

The repository root is one Vercel project: the frontend build is served as static files and `api/index.js` runs the Express API as a serverless function on the same domain.

```bash
npx vercel@48.1.0 link --project schedul-ai
npx vercel@48.1.0 env add AUTH_SECRET production   # any long random string
npx vercel@48.1.0 deploy --prod
```

Attach a Neon Postgres database from the Vercel Marketplace (Storage → Neon) to the project; `DATABASE_URL` is added automatically.

## Team

B.Tech (Computer Science & Engineering) major project, Department of Computer Engineering & Applications, GLA University, Mathura (2026-27).

Mallavarapu Krishna Koushik Reddy · Riya Mangal · Ashutosh Singh · Surbhi Agrawal · Gargi Saraswat

Supervisor: Mr. Piyush Khandelwal
