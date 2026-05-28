# ⬡ Analytics Tracking Playground

A self-contained demo showing real-time analytics tracking: user interactions on the
frontend are captured, sent to a Node.js backend, persisted in SQLite, and displayed
on a live dashboard — all in one repo.

```
Analytics_Tracking_Playground/
├── Backend/
│   ├── server.js          # Express API  (POST /track, GET /analytics)
│   ├── db.js              # SQLite setup via better-sqlite3
│   └── package.json
└── Frontend/
    ├── index.html         # Playground page + dashboard
    └── analytics.js       # Drop-in tracker library
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
# From the project root, serve Frontend/ with any static server:
npx serve Frontend
# → http://localhost:3000
```

Or just open `Frontend/index.html` directly in your browser.
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

## Deploying a Public Demo

**Recommended stack (free tier):**

| Layer | Service |
|---|---|
| Backend | [Render](https://render.com) · [Railway](https://railway.app) · [Fly.io](https://fly.io) |
| Frontend | [Netlify](https://netlify.com) · [Vercel](https://vercel.com) · [GitHub Pages](https://pages.github.com) |

**Steps:**

1. Deploy the `Backend/` folder to Render/Railway (set `NODE_ENV=production`).
2. Note the public backend URL (e.g. `https://atp-backend.onrender.com`).
3. In `Frontend/index.html`, update the one config line:
   ```js
   window.ANALYTICS_ENDPOINT = "https://atp-backend.onrender.com";
   ```
4. Deploy the `Frontend/` folder to Netlify or GitHub Pages.
5. Share the frontend URL. Done! 🎉

> **SQLite persistence note:** Render/Railway give you a writable filesystem.
> The `events.db` file persists between requests but resets on redeploy.
> For permanent storage, swap `better-sqlite3` for a free [Turso](https://turso.tech)
> remote SQLite or a [Supabase](https://supabase.com) PostgreSQL — the SQL queries
> in `server.js` are standard and require no changes.

---

## Embedding the Tracker on Any Page

```html
<!-- Add to <head> of any page -->
<script
  src="https://your-frontend-url.com/analytics.js"
  data-endpoint="https://your-backend-url.com">
</script>

<!-- Manual event tracking -->
<script>
  Analytics.track("purchase", { productId: 42, revenue: 29.99 });
</script>
```

---

## Tech Stack

- **Frontend** — HTML, Tailwind CSS (CDN), Vanilla JS
- **Tracker** — `analytics.js` (batched, uses `sendBeacon` on unload)
- **Backend** — Node.js, Express, `better-sqlite3`
- **Storage** — SQLite (`events.db` file, zero config)
