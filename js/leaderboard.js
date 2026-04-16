/* ==========================================================
   ManaChetta — leaderboard
   Ranks wards / MLAs / MPs by number of *unresolved* reports
   (status != "done"). Highest counts at the top.
   ========================================================== */

(function () {
  "use strict";

  const list = document.getElementById("leaderboard-list");
  const tabs = document.querySelectorAll(".tab");
  if (!list) return;

  const wardLookup = new Map((window.WARDS || []).map((w) => [w.name, w]));

  const allReports = () =>
    [].concat(window.SAMPLE_REPORTS || [], window.LIVE_REPORTS || []);

  const aggregate = (mode) => {
    const unresolved = allReports().filter((r) => r.status !== "done");
    const map = new Map();

    unresolved.forEach((r) => {
      const ward = wardLookup.get(r.ward);
      let key, title, sub;
      if (mode === "wards") {
        key = r.ward;
        title = r.ward;
        sub = ward ? `${ward.ac} · MLA ${ward.mla}` : "Hyderabad";
      } else if (mode === "mlas") {
        if (!ward) return;
        key = ward.mla;
        title = ward.mla;
        sub = `${ward.ac} · MP ${ward.mp}`;
      } else {
        if (!ward) return;
        key = ward.mp;
        title = ward.mp;
        sub = `Lok Sabha · Hyderabad region`;
      }
      const prev = map.get(key) || { title, sub, count: 0 };
      prev.count += 1;
      map.set(key, prev);
    });

    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 10);
  };

  const render = (mode) => {
    const rows = aggregate(mode);
    if (!rows.length) {
      list.innerHTML = `<p style="text-align:center;color:var(--ink-500)">No reports yet. Be the first to file one above ⬆️</p>`;
      return;
    }
    const max = rows[0].count;
    list.innerHTML = rows
      .map((r, i) => {
        const rank = i + 1;
        const pct = Math.round((r.count / max) * 100);
        const rankClass = rank <= 3 ? `top-${rank}` : "";
        return `
          <div class="lb-row ${rankClass}">
            <div class="lb-rank">${rank}</div>
            <div>
              <div class="lb-title">${r.title}</div>
              <div class="lb-sub">${r.sub}</div>
            </div>
            <div class="lb-count">${r.count}</div>
            <div class="lb-sub">unresolved</div>
            <div class="lb-bar"><i style="width:${pct}%"></i></div>
          </div>
        `;
      })
      .join("");
  };

  tabs.forEach((t) =>
    t.addEventListener("click", () => {
      tabs.forEach((x) => x.classList.remove("is-active"));
      t.classList.add("is-active");
      render(t.dataset.tab);
    })
  );

  render("wards");

  // Re-render when a new report is filed
  document.addEventListener("manachetta:new-report", () => {
    const active = document.querySelector(".tab.is-active");
    render(active ? active.dataset.tab : "wards");
  });
})();
