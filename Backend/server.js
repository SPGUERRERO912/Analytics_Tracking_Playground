// server.js — Analytics Tracking Playground API
const express = require("express");
const cors    = require("cors");
const { getDb, query, queryOne, scheduleSave } = require("./db");

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true, credentials: false }));
app.use(express.json());

// ── POST /track — ingest one or many events ───────────────────────────────────
app.post("/track", async (req, res) => {
  const db     = await getDb();
  const events = Array.isArray(req.body) ? req.body : [req.body];
  const now    = Date.now();

  for (const evt of events) {
    const {
      session_id, event_type,
      page = null, element = null,
      metadata = {}, ts = now,
      user_agent = null, referrer = null,
    } = evt;

    if (!session_id || !event_type) continue;

    db.run(
      `INSERT INTO sessions (session_id, started_at, last_seen, user_agent, referrer)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(session_id) DO UPDATE SET last_seen = ?`,
      [session_id, ts, ts, user_agent, referrer, ts]
    );
    db.run(
      `INSERT INTO events (session_id, event_type, page, element, metadata, ts)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [session_id, event_type, page, element, JSON.stringify(metadata), ts]
    );
  }

  scheduleSave();
  res.json({ ok: true, received: events.length });
});

// ── GET /analytics — dashboard metrics ───────────────────────────────────────
app.get("/analytics", async (req, res) => {
  const db    = await getDb();
  const since = parseInt(req.query.since ?? 0, 10);

  const totalEvents   = (queryOne(db, "SELECT COUNT(*) as n FROM events WHERE ts >= ?", [since]) || {}).n || 0;
  const totalSessions = (queryOne(db, "SELECT COUNT(DISTINCT session_id) as n FROM events WHERE ts >= ?", [since]) || {}).n || 0;
  const conversions   = (queryOne(db, "SELECT COUNT(*) as n FROM events WHERE ts >= ? AND event_type = 'form_submit'", [since]) || {}).n || 0;
  const avgDuration   = (queryOne(db, "SELECT AVG(last_seen - started_at) as avg_ms FROM sessions WHERE started_at >= ?", [since]) || {}).avg_ms || 0;

  const byType     = query(db, `SELECT event_type, COUNT(*) as count FROM events WHERE ts >= ? GROUP BY event_type ORDER BY count DESC`, [since]);
  const topPages   = query(db, `SELECT page, COUNT(*) as count FROM events WHERE ts >= ? AND page IS NOT NULL GROUP BY page ORDER BY count DESC LIMIT 10`, [since]);
  const topElements = query(db, `SELECT element, COUNT(*) as count FROM events WHERE ts >= ? AND event_type = 'click' AND element IS NOT NULL GROUP BY element ORDER BY count DESC LIMIT 10`, [since]);
  const hourlyBuckets = query(db, `SELECT (ts / 3600000) * 3600000 AS bucket, COUNT(*) as count FROM events WHERE ts >= ? GROUP BY bucket ORDER BY bucket ASC`, [Date.now() - 86400000]);

  const rawRecent = query(db, `SELECT id, session_id, event_type, page, element, metadata, ts FROM events ORDER BY ts DESC LIMIT 50`);
  const recentEvents = rawRecent.map(e => ({ ...e, metadata: JSON.parse(e.metadata || "{}") }));

  res.json({
    totalEvents, totalSessions, conversions,
    conversionRate: totalSessions > 0 ? ((conversions / totalSessions) * 100).toFixed(1) : "0.0",
    avgSessionDuration: Math.round(avgDuration),
    byType, topPages, topElements, hourlyBuckets, recentEvents,
  });
});

// ── DELETE /analytics/reset ───────────────────────────────────────────────────
app.delete("/analytics/reset", async (_req, res) => {
  const db = await getDb();
  db.run("DELETE FROM events");
  db.run("DELETE FROM sessions");
  scheduleSave();
  res.json({ ok: true, message: "All data cleared." });
});

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => res.json({ status: "ok", ts: Date.now() }));

// ── Boot ──────────────────────────────────────────────────────────────────────
getDb().then(() => {
  app.listen(PORT, () => console.log(`🚀  Analytics API → http://localhost:${PORT}`));
}).catch(err => {
  console.error("Failed to init DB:", err);
  process.exit(1);
});