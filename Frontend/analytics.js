/**
 * analytics.js — lightweight client-side tracker
 * Drop this script on any page and call window.Analytics.track(...)
 *
 * Usage:
 *   <script src="analytics.js" data-endpoint="http://localhost:3001"></script>
 *   Analytics.track("click", { element: "hero-cta" });
 */
(function (global) {
  // Config 
  const scriptTag = document.currentScript;
  const ENDPOINT =
    (scriptTag && scriptTag.dataset.endpoint) ||
    global.ANALYTICS_ENDPOINT ||
    "http://localhost:3001";

  const BATCH_INTERVAL_MS = 2000; // flush every 2 s
  const SCROLL_THROTTLE_MS = 500;

  // Session ID (persisted in sessionStorage) 
  let sessionId = sessionStorage.getItem("atp_session");
  if (!sessionId) {
    sessionId =
      "sess_" +
      Date.now().toString(36) +
      "_" +
      Math.random().toString(36).slice(2, 8);
    sessionStorage.setItem("atp_session", sessionId);
  }

  // Event queue 
  let queue = [];

  function flush() {
    if (queue.length === 0) return;
    const batch = queue.splice(0);
    const body = JSON.stringify(batch);
    // Use sendBeacon when available (works on page unload)
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon(ENDPOINT + "/track", blob);
    } else {
      fetch(ENDPOINT + "/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  }

  setInterval(flush, BATCH_INTERVAL_MS);
  window.addEventListener("beforeunload", flush);

  // Core track function 
  function track(eventType, metadata = {}) {
    queue.push({
      session_id: sessionId,
      event_type: eventType,
      page: location.pathname + location.search,
      element: metadata.element || null,
      metadata,
      ts: Date.now(),
      user_agent: navigator.userAgent.slice(0, 200),
      referrer: document.referrer || null,
    });
  }

  // Auto-tracking

  // 1. Page view
  track("page_view", { title: document.title });

  // 2. Clicks — attach to document (event delegation)
  document.addEventListener("click", (e) => {
    const target = e.target.closest(
      "[data-track], button, a, [role='button']"
    );
    if (!target) return;
    track("click", {
      element:
        target.dataset.track ||
        target.id ||
        target.dataset.label ||
        target.textContent.trim().slice(0, 50),
      tag: target.tagName.toLowerCase(),
      href: target.href || null,
    });
  });

  // 3. Form submissions
  document.addEventListener("submit", (e) => {
    const form = e.target;
    track("form_submit", {
      element: form.id || form.dataset.track || "form",
      action: form.action || null,
    });
  });

  // 4. Scroll depth milestones
  const scrollMilestones = new Set();
  let scrollTimer = null;
  window.addEventListener("scroll", () => {
    if (scrollTimer) return;
    scrollTimer = setTimeout(() => {
      scrollTimer = null;
      const pct = Math.round(
        ((window.scrollY + window.innerHeight) /
          document.documentElement.scrollHeight) *
          100
      );
      const milestone = Math.floor(pct / 25) * 25; // 0, 25, 50, 75, 100
      if (milestone > 0 && !scrollMilestones.has(milestone)) {
        scrollMilestones.add(milestone);
        track("scroll_depth", { depth_pct: milestone });
      }
    }, SCROLL_THROTTLE_MS);
  });

  // 5. Time on page (every 30 s)
  let timeOnPage = 0;
  setInterval(() => {
    timeOnPage += 30;
    track("time_on_page", { seconds: timeOnPage });
  }, 30_000);

  // Public API 
  global.Analytics = { track, flush, sessionId };
})(window);