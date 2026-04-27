// Rewards dashboard — renders the user's history list. The big stats
// cards (points balance, kg total, CO2 averted) are already wired up
// via the [data-d="..."] paint in app.js; this module just owns the
// timeline.
(function () {
  const listEl  = document.getElementById("history-list");
  const emptyEl = document.getElementById("history-empty");
  if (!listEl) return;

  const escapeHtml = (window.ReLoop && window.ReLoop.escapeHtml) || (s => s);

  function fmtDate(ts) {
    try {
      return new Date(ts).toLocaleDateString("en-IN", {
        day: "numeric", month: "short", year: "numeric",
      });
    } catch (_) { return ""; }
  }

  function productName(id) {
    const list = window.PRODUCTS || [];
    const p = list.find(x => x.id === id);
    return p ? p.name : id;
  }

  function row(entry) {
    if (entry.type === "earn") {
      const mats = (entry.materials || []).join(" · ") || "Recycling pickup";
      return `
        <div class="history-row">
          <div class="left">
            <div class="history-icon">♻️</div>
            <div>
              <div class="history-title">Pickup · ${escapeHtml(mats)}</div>
              <div class="history-sub">
                ${fmtDate(entry.ts)}${entry.kg ? ` · ${entry.kg.toFixed(1)} kg` : ""}
              </div>
            </div>
          </div>
          <div class="history-pts gain">+${(entry.points || 0).toLocaleString("en-IN")} pts</div>
        </div>
      `;
    }
    if (entry.type === "redeem") {
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
    return "";
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
    listEl.innerHTML = history.map(row).join("");
  }

  document.addEventListener("reloop:state", render);
  render();
})();
