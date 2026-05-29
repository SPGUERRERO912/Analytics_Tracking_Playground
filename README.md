# ⬡ Analytics Tracking Playground

A from-scratch event tracking pipeline — browser to database — built to practice and showcase full-stack fundamentals in a real, working context.

🔗 **Live demo:** [analytics-tracking-playground-1.onrender.com](https://analytics-tracking-playground-1.onrender.com/)

```
Analytics_Tracking_Playground/
├── Backend/
│   ├── server.js          # Express API  (POST /track, GET /analytics)
│   ├── db.js              # SQLite setup via sql.js
│   └── package.json
└── Frontend/
    ├── index.html         # Playground page + dashboard
    ├── analytics.js       # Drop-in tracker library
    ├── app.js             # UI logic and dashboard rendering
    ├── config.js          # Backend endpoint config
    └── build.sh           # Render build script (injects BACKEND_URL)
```

---

## Quick Start

### 1 — Start the backend

```bash
cd Backend
npm install
npm start          # → http://localhost:3001
```

> Requires Node.js ≥ 18. `events.db` is created automatically on first run.

### 2 — Open the frontend

```bash
# From the project root:
npx serve Frontend
# → http://localhost:3000
```

Or open `Frontend/index.html` directly in your browser.
*(CORS is open so `file://` access works too.)*

---

## Tracked Events

| Event | Trigger |
|---|---|
| `page_view` | Page load |
| `click` | Any button, link, or `[data-track]` element |
| `form_submit` | Form submission (conversion) |
| `scroll_depth` | 25 / 50 / 75 / 100% scroll milestones |
| `time_on_page` | Every 30 seconds |
| `product_click` | Product card interaction |
| `cta_click` | Hero CTA button |

---

## API Reference

### `POST /track`
Ingest one or an array of events.

```json
{
  "session_id": "sess_abc123",
  "event_type": "click",
  "page": "/",
  "element": "hero-cta",
  "metadata": { "extra": "data" },
  "ts": 1712345678000
}
```

### `GET /analytics`
Returns aggregated metrics for the dashboard.

```json
{
  "totalEvents": 42,
  "totalSessions": 7,
  "conversions": 2,
  "conversionRate": "28.6",
  "byType": [{ "event_type": "click", "count": 18 }, ...],
  "topElements": [...],
  "recentEvents": [...],
  "hourlyBuckets": [...]
}
```

### `DELETE /analytics/reset`
Clears all events and sessions. Useful for demo resets.

---

## Frontend Config

The backend URL lives in `Frontend/config.js`:

```js
window.ANALYTICS_ENDPOINT = "BACKEND_URL";
```

**Locally** — edit the file directly:
```js
window.ANALYTICS_ENDPOINT = "http://localhost:3001";
```

**In production** — the value is injected at build time via the `BACKEND_URL`
environment variable (see Deploying section below). Never hardcode a production
URL in this file before committing.

The script load order in `index.html` matters:

```html
<script src="config.js"></script>    <!-- 1. sets window.ANALYTICS_ENDPOINT -->
<script src="analytics.js"></script> <!-- 2. reads the endpoint -->
<script src="app.js"></script>       <!-- 3. uses the Analytics object -->
```

---

## Deploying to Render (free tier)

The project is split into two Render services: a **Web Service** for the backend
and a **Static Site** for the frontend.

### Backend — Web Service

| Field | Value |
|---|---|
| Root directory | `Backend` |
| Build command | `npm install` |
| Start command | `node server.js` |

No environment variables required. `PORT` is injected automatically by Render.

### Frontend — Static Site

`build.sh` runs before the site is served. It replaces the `BACKEND_URL`
placeholder in `config.js` with the actual backend URL using `sed`:

```bash
#!/bin/bash
sed -i "s|BACKEND_URL|${BACKEND_URL}|g" config.js
```

| Field | Value |
|---|---|
| Build command | `bash Frontend/build.sh` |
| Publish directory | `Frontend` |
| Environment variable | `BACKEND_URL` = `https://your-backend.onrender.com` |

Set `BACKEND_URL` in Render's **Environment Variables** UI — no `.env` file needed.

> **SQLite persistence note:** `events.db` persists between requests but resets
> on redeploy. For permanent storage, swap `sql.js` for a free
> [Turso](https://turso.tech) remote SQLite or a
> [Supabase](https://supabase.com) PostgreSQL — the SQL in `server.js` is
> standard and requires no changes.

---

## Embedding the Tracker on Any Page

```html
<!-- Add to <head> of any page -->
<script
  src="https://analytics-tracking-playground-1.onrender.com/analytics.js"
  data-endpoint="https://your-backend.onrender.com">
</script>

<!-- Manual event tracking -->
<script>
  Analytics.track("purchase", { productId: 42, revenue: 29.99 });
</script>
```

---

## Tech Stack

- **Frontend** — HTML, Tailwind CSS (CDN), Vanilla JS
- **Tracker** — `analytics.js` (batched, flushed via `fetch` with `keepalive`)
- **Backend** — Node.js, Express
- **Storage** — SQLite via `sql.js` (pure JS, zero native dependencies)
