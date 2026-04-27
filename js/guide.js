// "What can I recycle?" guide — search + chip filters over RECYCLABLES.
(function () {
  const grid     = document.getElementById("learn-grid");
  const empty    = document.getElementById("learn-empty");
  const chipsEl  = document.getElementById("learn-chips");
  const searchEl = document.getElementById("learn-search");
  if (!grid || !chipsEl || !searchEl) return;

  const items = window.RECYCLABLES || [];
  const cats  = window.CATEGORIES  || [];
  const escapeHtml = (window.ReLoop && window.ReLoop.escapeHtml) || (s => s);

  let activeCat = "all";
  let q = "";

  function emojiFor(catId) {
    const c = cats.find(x => x.id === catId);
    return c ? c.icon : "♻️";
  }

  function verdict(item) {
    if (item.recyclable === "yes")       return { tag: "tag-yes",       text: "Recyclable" };
    if (item.recyclable === "sometimes") return { tag: "tag-sometimes", text: "Special drop-off" };
    return { tag: "tag-no", text: "Not recyclable" };
  }

  function chip(value, label, emoji) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip" + (value === activeCat ? " is-active" : "");
    b.dataset.cat = value;
    b.setAttribute("role", "tab");
    b.setAttribute("aria-selected", value === activeCat ? "true" : "false");
    b.innerHTML =
      `<span aria-hidden="true">${emoji}</span><span>${escapeHtml(label)}</span>`;
    b.addEventListener("click", () => {
      activeCat = value;
      renderChips();
      renderItems();
    });
    return b;
  }

  function renderChips() {
    chipsEl.innerHTML = "";
    chipsEl.appendChild(chip("all", "All", "♻️"));
    cats.forEach(c => chipsEl.appendChild(chip(c.id, c.id, c.icon)));
  }

  function renderItems() {
    const ql = q.trim().toLowerCase();
    const filtered = items.filter(it => {
      if (activeCat !== "all" && it.category !== activeCat) return false;
      if (!ql) return true;
      const hay = `${it.name} ${it.category} ${it.tip}`.toLowerCase();
      return hay.includes(ql);
    });

    grid.innerHTML = "";
    filtered.forEach(it => grid.appendChild(card(it)));
    empty.hidden = filtered.length > 0;
  }

  function card(it) {
    const v = verdict(it);
    const el = document.createElement("article");
    el.className = "item-card";
    el.innerHTML = `
      <div class="item-head">
        <span class="item-emoji" aria-hidden="true">${emojiFor(it.category)}</span>
        <div>
          <div class="item-name">${escapeHtml(it.name)}</div>
          <div class="item-cat">${escapeHtml(it.category)}</div>
        </div>
      </div>
      <div class="item-tags">
        <span class="tag ${v.tag}">${v.text}</span>
        ${it.pointsPerKg > 0 ? `<span class="tag tag-points">+${it.pointsPerKg} pts/kg</span>` : ""}
      </div>
      <p class="item-tip">${escapeHtml(it.tip)}</p>
    `;
    return el;
  }

  searchEl.addEventListener("input", e => {
    q = e.target.value;
    renderItems();
  });

  renderChips();
  renderItems();
})();
