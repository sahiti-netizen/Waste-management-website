// Donation centres — orphanages, NGOs and govt schools that accept
// usable goods (textiles, books, toys, e-waste). Renders a filterable
// grid plus a condition-guidelines panel.
(function () {
  const grid          = document.getElementById("donate-grid");
  const typeChipsEl   = document.getElementById("donate-type-chips");
  const needSelect    = document.getElementById("donate-need-filter");
  const guidelineChipsEl = document.getElementById("guideline-chips");
  const guidelineCardsEl = document.getElementById("guideline-cards");
  if (!grid) return;

  const centres   = window.DONATION_CENTRES   || [];
  const guides    = window.DONATION_GUIDELINES || {};
  const escapeHtml = (window.ReLoop && window.ReLoop.escapeHtml) || (s => s);

  let activeType = "all";
  let activeNeed = "";
  let activeGuide = Object.keys(guides)[0] || "";

  const TYPE_LABELS = {
    all:       { label: "All",         emoji: "❤️" },
    orphanage: { label: "Orphanages",  emoji: "🏠" },
    school:    { label: "Govt. schools", emoji: "🏫" },
    ngo:       { label: "NGOs",        emoji: "🤝" },
  };

  // Build the type chips and the need-filter dropdown
  function renderTypeChips() {
    typeChipsEl.innerHTML = "";
    Object.entries(TYPE_LABELS).forEach(([k, meta]) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip" + (activeType === k ? " is-active" : "");
      b.dataset.type = k;
      b.innerHTML = `<span aria-hidden="true">${meta.emoji}</span>
                     <span>${escapeHtml(meta.label)}</span>`;
      b.addEventListener("click", () => {
        activeType = k;
        renderTypeChips();
        renderGrid();
      });
      typeChipsEl.appendChild(b);
    });
  }

  function renderNeedFilter() {
    const allNeeds = Array.from(new Set(centres.flatMap(c => c.needs))).sort();
    needSelect.innerHTML = '<option value="">All categories</option>' +
      allNeeds.map(n => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join("");
    needSelect.addEventListener("change", e => {
      activeNeed = e.target.value;
      renderGrid();
    });
  }

  function visibleCentres() {
    return centres.filter(c => {
      if (activeType !== "all" && c.type !== activeType) return false;
      if (activeNeed && !c.needs.includes(activeNeed)) return false;
      return true;
    });
  }

  function typeBadge(t) {
    const meta = TYPE_LABELS[t] || { label: t, emoji: "❤️" };
    return `<span class="type-badge">${meta.emoji} ${escapeHtml(meta.label)}</span>`;
  }

  function renderGrid() {
    const list = visibleCentres();
    if (!list.length) {
      grid.innerHTML =
        '<p class="muted small">No centres match — try a different filter.</p>';
      return;
    }
    grid.innerHTML = list.map(c => {
      const tels = (c.phone || "").replace(/\s/g, "");
      const dirUrl = `https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`;
      return `
        <article class="donate-card">
          <div class="donate-head">
            <div>
              <div class="recycler-name">${escapeHtml(c.name)}</div>
              <div class="recycler-type">${escapeHtml(c.capacity)}</div>
            </div>
            ${typeBadge(c.type)}
          </div>
          <div class="recycler-meta">
            <span>📍 ${escapeHtml(c.address)}</span>
            ${c.pickup ? '<span class="pickup-flag">Doorstep pickup</span>'
                       : '<span class="muted small">Drop-off only</span>'}
          </div>
          <div>
            <span class="muted small">Currently needs</span>
            <div class="recycler-tags" style="margin-top:4px">
              ${c.needs.map(n => `<span class="tag">${escapeHtml(n)}</span>`).join("")}
            </div>
          </div>
          <div class="recycler-actions">
            <a href="tel:${escapeHtml(tels)}" class="btn btn-ghost btn-sm">Call</a>
            <a href="${dirUrl}" target="_blank" rel="noopener"
               class="btn btn-ghost btn-sm">Directions →</a>
            <button type="button" class="btn btn-primary btn-sm"
                    data-donate-to="${escapeHtml(c.id)}">Donate to this centre</button>
          </div>
        </article>
      `;
    }).join("");

    grid.querySelectorAll("[data-donate-to]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-donate-to");
        const c = centres.find(x => x.id === id);
        if (c) intentDonate(c);
      });
    });
  }

  function intentDonate(centre) {
    window.ReLoop && window.ReLoop.showModal({
      title: `Donate to ${centre.name}`,
      body: (() => {
        const div = document.createElement("div");
        div.innerHTML = `
          <p class="muted small">Before booking, please make sure:</p>
          <ul style="padding-left:18px;margin:8px 0;color:var(--ink-700);font-size:0.92rem;">
            ${centre.needs.map(n => {
              const g = guides[n];
              if (!g || !g.accept) return "";
              return `<li><strong>${escapeHtml(n)}:</strong> ${escapeHtml(g.accept[0])}</li>`;
            }).join("")}
          </ul>
          <p class="muted small">
            We'll route the pickup to this centre instead of a recycler. Donation
            pickups don't earn cash or points — they earn karma.
          </p>
        `;
        return div;
      })(),
      actions: [
        { label: "Cancel", variant: "btn-ghost" },
        {
          label: "Continue to pickup form",
          variant: "btn-primary",
          onClick: () => {
            window.ReLoop = window.ReLoop || {};
            window.ReLoop.donationIntent = { centreId: centre.id, centre };
            const t = document.getElementById("pickup");
            if (t) t.scrollIntoView({ behavior: "smooth", block: "start" });
          },
        },
      ],
    });
  }

  // Guidelines panel
  function renderGuidelineChips() {
    const cats = Object.keys(guides);
    if (!cats.length) return;
    guidelineChipsEl.innerHTML = "";
    cats.forEach(cat => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip" + (cat === activeGuide ? " is-active" : "");
      b.textContent = cat;
      b.addEventListener("click", () => {
        activeGuide = cat;
        renderGuidelineChips();
        renderGuidelineCard();
      });
      guidelineChipsEl.appendChild(b);
    });
  }

  function renderGuidelineCard() {
    const g = guides[activeGuide];
    if (!g) {
      guidelineCardsEl.innerHTML = "";
      return;
    }
    guidelineCardsEl.innerHTML = `
      <div class="guideline-card">
        <h4 class="guideline-title is-accept">✓ Accepted</h4>
        <ul>${(g.accept || []).map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ul>
      </div>
      <div class="guideline-card">
        <h4 class="guideline-title is-reject">✗ Please don't donate</h4>
        <ul>${(g.reject || []).map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ul>
      </div>
    `;
  }

  renderTypeChips();
  renderNeedFilter();
  renderGrid();
  renderGuidelineChips();
  renderGuidelineCard();
})();
