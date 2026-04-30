// "What can I recycle?" guide — image-first flip cards.
// Front shows a unique illustration and the item name; clicking flips
// to reveal cash / UPI / points per kg plus the prep tip.
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
    cats.forEach(c => {
      // Skip categories that no longer have any items after the cleanup
      if (items.some(i => i.category === c.id)) {
        chipsEl.appendChild(chip(c.id, c.id, c.icon));
      }
    });
  }

  function renderItems() {
    const ql = q.trim().toLowerCase();
    const filtered = items.filter(it => {
      if (activeCat !== "all" && it.category !== activeCat) return false;
      if (!ql) return true;
      return `${it.name} ${it.category} ${it.tip}`.toLowerCase().includes(ql);
    });

    grid.innerHTML = "";
    filtered.forEach(it => grid.appendChild(card(it)));
    empty.hidden = filtered.length > 0;
  }

  function card(it) {
    const v = verdict(it);
    const el = document.createElement("article");
    el.className = "flip-card";
    el.tabIndex = 0;
    el.setAttribute("role", "button");
    el.setAttribute("aria-pressed", "false");
    el.setAttribute("aria-label",
      `${it.name}. Click to see payout rates.`);

    el.innerHTML = `
      <div class="flip-inner">
        <div class="flip-front">
          <div class="flip-img-wrap">
            <img src="${escapeHtml(it.image)}"
                 alt="${escapeHtml(it.name)}"
                 loading="lazy"
                 onerror="this.style.opacity='0.2'" />
          </div>
          <div class="flip-name">${escapeHtml(it.name)}</div>
          <span class="tag ${v.tag}">${v.text}</span>
          <span class="flip-hint" aria-hidden="true">Tap for rates →</span>
        </div>
        <div class="flip-back" aria-hidden="true">
          <div class="flip-back-head">
            <strong>${escapeHtml(it.name)}</strong>
            <span class="muted small">${escapeHtml(it.category)}</span>
          </div>
          <ul class="payout-list">
            <li>
              <span class="payout-label">💰 Cash on pickup</span>
              <span class="payout-val">₹${it.cashPerKg.toLocaleString("en-IN")}/kg</span>
            </li>
            <li>
              <span class="payout-label">📲 UPI cashback</span>
              <span class="payout-val">₹${it.upiPerKg.toLocaleString("en-IN")}/kg</span>
            </li>
            <li>
              <span class="payout-label">🪙 Green Points</span>
              <span class="payout-val">${it.pointsPerKg.toLocaleString("en-IN")} pts/kg</span>
            </li>
          </ul>
          <p class="flip-tip">${escapeHtml(it.tip)}</p>
          <span class="flip-hint" aria-hidden="true">← Tap to flip back</span>
        </div>
      </div>
    `;

    const flip = () => {
      const flipped = el.classList.toggle("is-flipped");
      el.setAttribute("aria-pressed", String(flipped));
    };
    el.addEventListener("click", flip);
    el.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        flip();
      }
    });
    return el;
  }

  searchEl.addEventListener("input", e => {
    q = e.target.value;
    renderItems();
  });

  renderChips();
  renderItems();
})();
