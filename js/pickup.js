// Schedule a pickup. Builds the per-material kg grid from RECYCLABLES,
// runs a live points estimator, persists confirmed pickups to the user
// state and listens for "add to pickup" hand-offs from the scanner.
(function () {
  const form        = document.getElementById("pickup-form");
  const grid        = document.getElementById("qty-grid");
  const ptsEl       = document.querySelector('[data-d="estimate-points"]');
  const cashEl      = document.querySelector('[data-d="estimate-cash"]');
  const successEl   = document.getElementById("pickup-success");
  const successMsg  = document.getElementById("pickup-success-msg");
  const dateInput   = document.getElementById("p-date");
  if (!form || !grid) return;

  const items = window.RECYCLABLES || [];
  const cats  = window.CATEGORIES  || [];
  const escapeHtml = (window.ReLoop && window.ReLoop.escapeHtml) || (s => s);

  // 1 kg of mixed material ~ a few rupees in points; 10 pts == ~₹1 cash-out.
  const POINTS_TO_RUPEES = 0.1;

  // Surface the items most people actually generate at home; full list
  // remains discoverable through the Guide. Keeps the form scannable.
  const FEATURED_IDS = [
    "newspaper", "cardboard", "office-paper",
    "pet-bottle", "hdpe-bottle", "carry-bag",
    "aluminium-can", "steel-can", "scrap-metal",
    "glass-bottle",
    "phone", "laptop", "battery", "cables",
    "clothes",
  ];

  const featured = FEATURED_IDS
    .map(id => items.find(i => i.id === id))
    .filter(Boolean);

  // Track quantities by recyclable id (kg). Map<string, number>.
  const qty = new Map();

  function emojiFor(catId) {
    const c = cats.find(x => x.id === catId);
    return c ? c.icon : "♻️";
  }

  function renderGrid() {
    grid.innerHTML = "";
    featured.forEach(item => {
      const id = item.id;
      const row = document.createElement("label");
      row.className = "qty-row";
      row.dataset.id = id;
      row.innerHTML = `
        <span class="qty-label">
          <span aria-hidden="true">${emojiFor(item.category)}</span>
          <span>
            ${escapeHtml(item.name)}
            <span class="pts">${item.pointsPerKg} pts/kg</span>
          </span>
        </span>
        <input type="number" min="0" step="0.5" value="0" inputmode="decimal"
               class="qty-input" aria-label="Kilograms of ${escapeHtml(item.name)}" />
      `;
      const input = row.querySelector("input");
      input.addEventListener("input", () => {
        const kg = Math.max(0, parseFloat(input.value) || 0);
        qty.set(id, kg);
        row.classList.toggle("is-active", kg > 0);
        updateEstimate();
      });
      input.addEventListener("focus", () => {
        if (input.value === "0") input.value = "";
      });
      input.addEventListener("blur", () => {
        if (input.value === "" || isNaN(parseFloat(input.value))) input.value = "0";
      });
      grid.appendChild(row);
    });
  }

  function totalPoints() {
    let pts = 0;
    qty.forEach((kg, id) => {
      const item = items.find(x => x.id === id);
      if (item) pts += kg * (item.pointsPerKg || 0);
    });
    return Math.round(pts);
  }

  function totalKg() {
    let kg = 0;
    qty.forEach(v => { kg += v; });
    return +kg.toFixed(2);
  }

  function updateEstimate() {
    const pts = totalPoints();
    if (ptsEl)  ptsEl.textContent = pts.toLocaleString("en-IN");
    if (cashEl) cashEl.textContent = "₹" + Math.floor(pts * POINTS_TO_RUPEES).toLocaleString("en-IN");
  }

  function setMinDate() {
    if (!dateInput) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 86400000);
    const iso = d => d.toISOString().slice(0, 10);
    dateInput.min = iso(today);
    if (!dateInput.value) dateInput.value = iso(tomorrow);
  }

  function activeItems() {
    const out = [];
    qty.forEach((kg, id) => {
      if (kg > 0) {
        const item = items.find(x => x.id === id);
        if (item) out.push({ id, kg, item });
      }
    });
    return out;
  }

  // Handle scanner -> "Add to my pickup". Bumps the relevant row by 1 kg
  // (or initialises it) and flashes the row.
  document.addEventListener("reloop:add-to-pickup", e => {
    const id = e.detail && e.detail.recyclableId;
    const addKg = (e.detail && e.detail.kg) || 1;
    if (!id) return;

    // If the item isn't featured, surface it on the fly.
    if (!featured.find(i => i.id === id)) {
      const extra = items.find(i => i.id === id);
      if (extra) {
        featured.push(extra);
        renderGrid();
      }
    }

    const row = grid.querySelector(`.qty-row[data-id="${CSS.escape(id)}"]`);
    if (!row) return;
    const input = row.querySelector("input");
    const current = parseFloat(input.value) || 0;
    input.value = (current + addKg).toString();
    qty.set(id, current + addKg);
    row.classList.add("is-active");
    updateEstimate();

    // Quick visual ping
    row.animate([
      { boxShadow: "0 0 0 0 rgba(30,165,102,0.6)" },
      { boxShadow: "0 0 0 8px rgba(30,165,102,0)" },
    ], { duration: 700 });
  });

  form.addEventListener("submit", e => {
    e.preventDefault();
    const items = activeItems();
    if (items.length === 0) {
      window.ReLoop && window.ReLoop.showModal({
        title: "Nothing to pick up yet",
        body: "Add at least one material above before booking — that's how we know what to weigh.",
        actions: [{ label: "OK", variant: "btn-primary" }],
      });
      return;
    }

    const data = new FormData(form);
    const profile = {
      name:    (data.get("name")    || "").toString().trim(),
      phone:   (data.get("phone")   || "").toString().trim(),
      pin:     (data.get("pin")     || "").toString().trim(),
      address: (data.get("address") || "").toString().trim(),
    };
    const date = (data.get("date") || "").toString();
    const slot = (data.get("slot") || "").toString();
    const points = totalPoints();
    const kg = totalKg();
    const materials = Array.from(new Set(items.map(x => x.item.category)));

    // Persist to user state — credit points and append a history entry.
    if (window.ReLoop) {
      window.ReLoop.updateState(state => {
        const next = { ...state };
        next.points  = (Number(state.points) || 0) + points;
        next.profile = { ...(state.profile || {}), ...profile };
        next.history = [
          {
            type: "earn",
            ts: Date.now(),
            kg,
            points,
            materials,
            slot,
            date,
            items: items.map(x => ({ id: x.id, kg: x.kg, name: x.item.name })),
          },
          ...(state.history || []),
        ];
        return next;
      });
    }

    // Success message
    successMsg.innerHTML = `
      <strong>${escapeHtml(profile.name || "You")}</strong>, your pickup is set for
      <strong>${escapeHtml(date)} · ${escapeHtml(slot)}</strong>.
      We'll credit roughly <strong>${points.toLocaleString("en-IN")} Green Points</strong>
      (≈ ₹${Math.floor(points * POINTS_TO_RUPEES).toLocaleString("en-IN")}) after weighing.
    `;
    successEl.hidden = false;
    successEl.scrollIntoView({ behavior: "smooth", block: "center" });

    // Reset the kg inputs but keep contact details on the form.
    qty.clear();
    grid.querySelectorAll(".qty-row").forEach(r => {
      r.classList.remove("is-active");
      const inp = r.querySelector("input");
      if (inp) inp.value = "0";
    });
    updateEstimate();
  });

  // Initial render
  renderGrid();
  setMinDate();
  updateEstimate();

  // If the user previously gave a name / phone / address, pre-fill it.
  const saved = (window.ReLoop && window.ReLoop.getState && window.ReLoop.getState().profile) || {};
  if (saved.name)    form.querySelector("#p-name").value    = saved.name;
  if (saved.phone)   form.querySelector("#p-phone").value   = saved.phone;
  if (saved.pin)     form.querySelector("#p-pin").value     = saved.pin;
  if (saved.address) form.querySelector("#p-address").value = saved.address;
})();
