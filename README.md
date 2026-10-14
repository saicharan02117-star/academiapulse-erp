# AcademiaPulse ERP — Integrated College Management System

A Node.js Full-Stack Lab project with responsive **HTML, CSS and vanilla JavaScript** plus a **Node.js HTTP REST API**, role-based login, approvals and seeded demonstration records. No external Node dependencies; built-in Node.js `crypto` provides password hashing and signed JWTs.

## Modules

- Four distinct login portals: **Admin, Head of Department, Faculty, Student**.
- Student and faculty registration requiring admin approval, separate RBAC-filtered records.
- Student directory, faculty directory, departmental management, subjects, timetable.
- Faculty student attendance; admin/HOD staff attendance; 75% attendance alerts.
- Internal (40) + end-semester (60) marks, letter grades and credit-weighted SGPA.
- Staff leave application / HOD approval, official campus notices.
- Fee ledger, **offline payment recording only** and receipt history — no real payment gateway.
- Academic and faculty reports, downloadable student report CSV, printable pages.

## Run with VS Code

Requires Node.js 18+.

```bash
npm start
```

Open **http://localhost:3000**. `npm run dev` enables automatic Node server restarts. `npm test` runs the API security/role test suite.

### Demonstration login (synthetic records only)

| Login portal | Email | Password |
|---|---|---|
| Admin | admin@academiapulse.demo | Pulse@123 |
| Head of Department | hod@academiapulse.demo | Pulse@123 |
| Faculty | faculty@academiapulse.demo | Pulse@123 |
| Student | student@academiapulse.demo | Pulse@123 |

Only synthetic data is provided. Never reuse these demo credentials or paste real student information into a public demo.

## Local persistence

On initial startup, `data/database.json` is created with seeded fictional users and college data, then saved after data changes. It is ignored by Git. To reset local demo data, stop the server and delete `data/database.json`, then restart.

## Vercel / online demo limitations

`vercel.json` routes `/api/*` to the Node.js serverless handler. Vercel functions do **not** provide reliable persistent writable disk storage, so the deployment runs as a **non-persistent demo** based on synthetic records. Changes made in the online demo can disappear on a cold start, redeployment or instance change. For real multi-user production deployment, replace the JSON store with PostgreSQL or another managed transactional database before enrolling real users. App displays a banner about the limitation.

**Environment variable required in Vercel:** `AUTH_SECRET` — a private, random value of at least 24 characters. Never commit secrets or `.env` files. Use HTTPS (provided by Vercel); register an administrator and rotate/remove seeded accounts before any real use.

**Security note:** HTTPS + server-side RBAC + hashed passwords + signed tokens are implemented, but this remains a **student lab project**, not an audited institutional information system. More work is required for GDPR/DPDP compliance, permission review, data backup/recovery, password resets, scalable transactional database, payment-provider integration and rate-limiting distributed across serverless instances.

## Folder organization

```
public/index.html      HTML entry
public/styles.css      Responsive UI
public/app.js          Browser-side pages, forms & reporting
server.js              Local Node.js server
api/index.js           Vercel serverless adapter
src/api.js             REST APIs and backend authorization
src/security.js        JWT and password verification
src/seed.js            Synthetic demonstration dataset
src/store.js           JSON persistence (local only)
vercel.json            Cloud routing
```
