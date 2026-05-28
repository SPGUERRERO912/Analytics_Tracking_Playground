// Products data
const products = [
  {
    id: 1,
    name: "Starter Kit",
    price: "$0",
    emoji: "🌱",
    desc: "Perfect for small projects and learning."
  },
  {
    id: 2,
    name: "Pro Suite",
    price: "$12/mo",
    emoji: "⚡",
    desc: "Advanced features for growing teams."
  },
  {
    id: 3,
    name: "Enterprise",
    price: "Custom",
    emoji: "🏢",
    desc: "Dedicated support and custom integrations."
  },
];

// Render product cards
const grid = document.getElementById("product-grid");

products.forEach(p => {
  const el = document.createElement("div");

  el.className =
    "card-lift bg-panel border border-border rounded-xl p-5 cursor-pointer hover:border-brand transition";

  el.dataset.track = `product-${p.id}`;

  el.innerHTML = `
    <div class="text-3xl mb-3">${p.emoji}</div>
    <h3 class="font-semibold mb-1">${p.name}</h3>
    <p class="text-slate-400 text-sm mb-4">${p.desc}</p>

    <div class="flex items-center justify-between">
      <span class="font-mono text-brand-light font-semibold">
        ${p.price}
      </span>

      <button
        class="text-xs bg-brand/20 text-brand-light hover:bg-brand/40 border border-brand/30 px-3 py-1 rounded-lg transition"
        onclick="handleProductClick(${p.id}, '${p.name}', event)"
        data-track="product-buy-${p.id}">
        Select →
      </button>
    </div>
  `;

  grid.appendChild(el);
});

// Handlers
function handleProductClick(id, name, e) {
  e.stopPropagation();

  Analytics.track("product_click", {
    productId: id,
    productName: name
  });

  toast(`🛍 Product clicked: <strong>${name}</strong>`, "brand");

  bumpSessionCount();
}

function handleCTA(btn) {
  Analytics.track("cta_click", {
    element: btn.dataset.track
  });

  toast("🎯 CTA tracked!", "brand");

  bumpSessionCount();

  document
    .getElementById("products")
    .scrollIntoView({ behavior: "smooth" });
}

function trackAndFeedback(btn, label) {
  Analytics.track("interaction", {
    element: label.toLowerCase(),
    label
  });

  btn.classList.add("border-brand");

  setTimeout(() => {
    btn.classList.remove("border-brand");
  }, 800);

  toast(`✅ Tracked: <strong>${label}</strong>`);

  bumpSessionCount();
}

function handleSignup(e) {
  e.preventDefault();

  const form = e.target;
  const plan = form.plan.value;

  Analytics.track("form_submit", {
    element: "signup-form",
    plan
  });

  Analytics.flush();

  toast("🎉 Conversion tracked! Check the dashboard.", "green");

  form.reset();

  bumpSessionCount();

  setTimeout(() => {
    document
      .getElementById("dashboard")
      .scrollIntoView({ behavior: "smooth" });
  }, 600);
}

async function resetData() {
  if (!confirm("Reset all tracking data?")) return;

  await fetch(window.ANALYTICS_ENDPOINT + "/analytics/reset", {
    method: "DELETE"
  });

  toast("🗑 Data cleared", "red");

  sessionCount = 0;

  document.getElementById("live-event-count").textContent = "0";

  refreshDashboard();
}

// Live session counter
let sessionCount = 1;

function bumpSessionCount() {
  sessionCount++;

  document.getElementById("live-event-count").textContent =
    sessionCount;
}

// Toast helper
function toast(msg, color = "slate") {
  const colorMap = {
    brand: "bg-brand/90",
    green: "bg-emerald-600/90",
    red: "bg-red-700/90",
    slate: "bg-slate-700/90",
  };

  const el = document.createElement("div");

  el.className =
    `pointer-events-auto ${
      colorMap[color] || colorMap.slate
    } text-white text-sm px-4 py-2.5 rounded-xl shadow-lg`;

  el.innerHTML = msg;

  const container = document.getElementById("toast-container");

  container.appendChild(el);

  setTimeout(() => el.remove(), 3200);
}

// Scroll progress bar
window.addEventListener("scroll", () => {
  const pct = Math.min(
    100,
    Math.round(
      ((window.scrollY + window.innerHeight)
      / document.documentElement.scrollHeight) * 100
    )
  );

  document.getElementById("scroll-bar").style.width = pct + "%";

  document.getElementById("scroll-pct").textContent = pct + "%";

  document.querySelectorAll("[data-milestone]").forEach(el => {
    const m = parseInt(el.dataset.milestone);

    if (pct >= m) {
      el.classList.remove("border-border", "text-muted");

      el.classList.add(
        "border-brand",
        "text-brand-light",
        "bg-brand/10"
      );
    }
  });
});

// Active nav link
const sections = ["home", "products", "signup", "dashboard"];

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      document
        .querySelectorAll(".nav-link")
        .forEach(l => l.classList.remove("active"));

      const link = document.querySelector(
        `.nav-link[href="#${entry.target.id}"]`
      );

      if (link) {
        link.classList.add("active");
      }
    }
  });
}, { threshold: 0.3 });

sections.forEach(id => {
  const el = document.getElementById(id);

  if (el) observer.observe(el);
});

// Dashboard polling
const TYPE_COLORS = {
  page_view: "bg-blue-500",
  click: "bg-brand",
  form_submit: "bg-emerald-500",
  scroll_depth: "bg-amber-500",
  time_on_page: "bg-slate-500",
  product_click: "bg-purple-500",
  cta_click: "bg-pink-500",
  interaction: "bg-cyan-500",
};

function bar(count, max, colorClass) {
  const pct = max > 0
    ? Math.round((count / max) * 100)
    : 0;

  return `
    <div class="flex-1 h-2 bg-border rounded-full overflow-hidden">
      <div
        class="${colorClass} h-full rounded-full transition-all duration-500"
        style="width:${pct}%">
      </div>
    </div>
  `;
}

async function refreshDashboard() {
  try {
    const res = await fetch(
      window.ANALYTICS_ENDPOINT + "/analytics"
    );

    if (!res.ok) {
      throw new Error("API unreachable");
    }

    const d = await res.json();

    document.getElementById("kpi-events").textContent =
      d.totalEvents.toLocaleString();

    document.getElementById("kpi-sessions").textContent =
      d.totalSessions.toLocaleString();

    document.getElementById("kpi-conversions").textContent =
      d.conversions.toLocaleString();

    document.getElementById("kpi-rate").textContent =
      d.conversionRate + "%";

    const maxType = Math.max(
      ...(d.byType.map(x => x.count)),
      1
    );

    document.getElementById("chart-by-type").innerHTML =
      d.byType.length
        ? d.byType.map(row => `
          <div class="flex items-center gap-2">
            <span class="w-28 truncate text-muted">
              ${row.event_type}
            </span>

            ${bar(
              row.count,
              maxType,
              TYPE_COLORS[row.event_type] || "bg-brand"
            )}

            <span class="w-8 text-right font-mono text-slate-300">
              ${row.count}
            </span>
          </div>
        `).join("")
        : `
          <p class="text-muted text-center py-4">
            No events yet. Start interacting!
          </p>
        `;

    const maxEl = Math.max(
      ...(d.topElements.map(x => x.count)),
      1
    );

    document.getElementById("chart-elements").innerHTML =
      d.topElements.length
        ? d.topElements.map(row => `
          <div class="flex items-center gap-2">
            <span class="w-28 truncate text-muted">
              ${row.element}
            </span>

            ${bar(row.count, maxEl, "bg-brand")}

            <span class="w-8 text-right font-mono text-slate-300">
              ${row.count}
            </span>
          </div>
        `).join("")
        : `
          <p class="text-muted text-center py-4">
            Click something to see data here.
          </p>
        `;

    const tbody = document.getElementById("event-log");

    tbody.innerHTML = d.recentEvents.length
      ? d.recentEvents.map(evt => {
          const t = new Date(evt.ts);

          const time = t.toLocaleTimeString();

          const meta = Object.keys(evt.metadata).length
            ? JSON.stringify(evt.metadata).slice(0, 60)
            : "—";

          const badge = `
            <span class="inline-block px-1.5 rounded ${
              TYPE_COLORS[evt.event_type] || "bg-slate-700"
            } text-white">
              ${evt.event_type}
            </span>
          `;

          return `
            <tr class="hover:bg-white/5">
              <td class="py-1.5 pr-4 text-muted whitespace-nowrap">
                ${time}
              </td>

              <td class="py-1.5 pr-4 whitespace-nowrap">
                ${badge}
              </td>

              <td class="py-1.5 pr-4 text-slate-400 max-w-[120px] truncate">
                ${evt.page || "—"}
              </td>

              <td class="py-1.5 text-slate-400 max-w-[200px] truncate">
                ${evt.element || meta}
              </td>
            </tr>
          `;
        }).join("")
      : `
        <tr>
          <td colspan="4"
              class="py-6 text-center text-muted">
            No events yet.
          </td>
        </tr>
      `;

  } catch (err) {
    document.getElementById("kpi-events").textContent = "—";

    console.warn("Dashboard fetch failed:", err.message);
  }
}

refreshDashboard();

setInterval(refreshDashboard, 5000);

// Mobile menu
function openMobileMenu() {
  toast("Navigation menu (demo only)");
}