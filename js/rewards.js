// Rewards dashboard timeline.
// Each pickup carries a status that progresses on a timer (Pending →
// Approved → In transit → Completed) so the demo shows a full lifecycle
// without needing a backend. Real fulfilment will replace the timer.
(function () {
  const listEl  = document.getElementById("history-list");
  const emptyEl = document.getElementById("history-empty");
  if (!listEl) return;

  const escapeHtml = (window.ReLoop && window.ReLoop.escapeHtml) || (s => s);

  // Demo lifecycle (ms after booking):
  //   < 30s        : Pending
  //   30s – 2 min  : Approved
  //   2 – 5 min    : In transit
  //   > 5 min      : Completed
  const STATUS_THRESHOLDS = [
    { at: 0,       status: "pending"   },
    { at: 30_000,  status: "approved"  },
    { at: 120_000, status: "transit"   },
    { at: 300_000, status: "completed" },
  ];

  function effectiveStatus(entry) {
    // If the entry was already manually flagged "completed", trust it.
    if (entry.status === "completed") return "completed";
    const elapsed = Date.now() - (entry.ts || Date.now());
    let s = "pending";
    for (const t of STATUS_THRESHOLDS) {
      if (elapsed >= t.at) s = t.status;
    }
    return s;
  }

  function statusBadge(status) {
    const map = {
      pending:   { cls: "is-pending",   label: "Pending"   },
      approved:  { cls: "is-approved",  label: "Approved"  },
      transit:   { cls: "is-transit",   label: "In transit"},
      completed: { cls: "is-completed", label: "Completed" },
      cancelled: { cls: "is-cancelled", label: "Cancelled" },
    };
    return map[status] || map.pending;
  }

  function fmtDate(ts) {
    try {
      return new Date(ts).toLocaleDateString("en-IN", {
        day: "numeric", month: "short", year: "numeric",
      });
    } catch (_) { return ""; }
  }

  function payoutLine(entry) {
    if (entry.payout === "cash") {
      return `₹${(entry.cash || 0).toLocaleString("en-IN")} cash`;
    }
    if (entry.payout === "upi") {
      return `₹${(entry.upi || 0).toLocaleString("en-IN")} UPI`;
    }
    return `+${(entry.points || 0).toLocaleString("en-IN")} pts`;
  }

  function payoutClass(entry) {
    return entry.payout === "cash" || entry.payout === "upi"
      ? "history-pts cash"
      : "history-pts gain";
  }

  function productName(id) {
    const list = window.PRODUCTS || [];
    const p = list.find(x => x.id === id);
    return p ? p.name : id;
  }

  function earnRow(entry) {
    const status = effectiveStatus(entry);
    const sb = statusBadge(status);
    const mats = (entry.materials || []).join(" · ") || "Recycling pickup";

    return `
      <div class="history-row" data-id="${escapeHtml(entry.id || "")}">
        <div class="left">
          <div class="history-icon">♻️</div>
          <div>
            <div class="history-title">Pickup · ${escapeHtml(mats)}</div>
            <div class="history-sub">
              ${fmtDate(entry.ts)}${entry.kg ? ` · ${entry.kg.toFixed(1)} kg` : ""}
              ${entry.co2 ? ` · 🌱 ${entry.co2} kg CO₂ averted` : ""}
            </div>
            <div class="history-meta">
              <span class="status-badge ${sb.cls}">${sb.label}</span>
              ${entry.slot ? `<span class="muted small">${escapeHtml(entry.slot)}</span>` : ""}
            </div>
          </div>
        </div>
        <div class="${payoutClass(entry)}">${payoutLine(entry)}</div>
      </div>
    `;
  }

  function redeemRow(entry) {
    return `
      <div class="history-row">
        <div class="left">
          <div class="history-icon is-redeem">🎁</div>
          <div>
            <div class="history-title">Redeemed · ${escapeHtml(productName(entry.productId))}</div>
            <div class="history-sub">${fmtDate(entry.ts)}</div>
          </div>
        </div>
        <div class="history-pts spend">${(entry.points || 0).toLocaleString("en-IN")} pts</div>
      </div>
    `;
  }

  function render() {
    const state = (window.ReLoop && window.ReLoop.getState && window.ReLoop.getState()) || {};
    const history = state.history || [];

    if (!history.length) {
      listEl.innerHTML = "";
      if (emptyEl) emptyEl.hidden = false;
      return;
    }
    if (emptyEl) emptyEl.hidden = true;
    listEl.innerHTML = history.map(h => h.type === "earn" ? earnRow(h) : redeemRow(h)).join("");
  }

  // Re-render on every state change and on a 30s tick (so statuses
  // animate forward during a live demo).
  document.addEventListener("reloop:state", render);
  setInterval(render, 30_000);
  render();
})();
