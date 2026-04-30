// Schedule a pickup. Builds the kg quantity grid from RECYCLABLES,
// runs three live payout estimates (cash / UPI / points), validates
// every required field, persists confirmed pickups to user state with
// a chosen payout method and listens for "add to pickup" hand-offs
// from the scanner.
(function () {
  const form        = document.getElementById("pickup-form");
  const grid        = document.getElementById("qty-grid");
  const cashEl      = document.querySelector('[data-d="estimate-cash"]');
  const upiEl       = document.querySelector('[data-d="estimate-upi"]');
  const ptsEl       = document.querySelector('[data-d="estimate-points"]');
  const successEl   = document.getElementById("pickup-success");
  const successMsg  = document.getElementById("pickup-success-msg");
  const dateInput   = document.getElementById("p-date");
  const upiRow      = document.getElementById("upi-row");
  const upiInput    = document.getElementById("p-upi");
  const payoutPills = document.querySelectorAll(".payout-pill");
  const qtyHelp     = document.querySelector(".qty-help");
  if (!form || !grid) return;

  const items = window.RECYCLABLES || [];
  const cats  = window.CATEGORIES  || [];
  const escapeHtml = (window.ReLoop && window.ReLoop.escapeHtml) || (s => s);

  // Surface household items most people actually generate; everything
  // else stays discoverable via the Guide.
  const FEATURED_IDS = [
    "newspaper", "cardboard", "office-paper",
    "pet-bottle", "hdpe-bottle", "carry-bag",
    "aluminium-can", "steel-can", "scrap-metal",
    "glass-bottle",
    "phone", "laptop", "battery", "cables",
    "clothes",
  ];
  const featured = FEATURED_IDS.map(id => items.find(i => i.id === id)).filter(Boolean);

  // qty[id] = kg
  const qty = new Map();
  let payout = "points";  // default highlight matches the .is-active pill

  function emojiFor(catId) {
    const c = cats.find(x => x.id === catId);
    return c ? c.icon : "♻️";
  }

  function renderGrid() {
    grid.innerHTML = "";
    featured.forEach(item => {
      const row = document.createElement("label");
      row.className = "qty-row";
      row.dataset.id = item.id;
      row.innerHTML = `
        <span class="qty-label">
          <span aria-hidden="true">${emojiFor(item.category)}</span>
          <span>
            ${escapeHtml(item.name)}
            <span class="pts">${item.pointsPerKg.toLocaleString("en-IN")} pts/kg · ₹${item.cashPerKg}/kg</span>
          </span>
        </span>
        <input type="number" min="0" step="0.5" value="0" inputmode="decimal"
               class="qty-input" aria-label="Kilograms of ${escapeHtml(item.name)}" />
      `;
      const input = row.querySelector("input");
      input.addEventListener("input", () => {
        const kg = Math.max(0, parseFloat(input.value) || 0);
        qty.set(item.id, kg);
        row.classList.toggle("is-active", kg > 0);
        updateEstimate();
      });
      input.addEventListener("focus", () => { if (input.value === "0") input.value = ""; });
      input.addEventListener("blur",  () => { if (!input.value) input.value = "0"; });
      grid.appendChild(row);
    });
  }

  function totals() {
    let cash = 0, upi = 0, points = 0, kg = 0;
    qty.forEach((q, id) => {
      const it = items.find(x => x.id === id);
      if (!it || !q) return;
      cash   += q * (it.cashPerKg   || 0);
      upi    += q * (it.upiPerKg    || 0);
      points += q * (it.pointsPerKg || 0);
      kg     += q;
    });
    return {
      cash:   Math.round(cash),
      upi:    Math.round(upi),
      points: Math.round(points),
      kg:     +kg.toFixed(2),
    };
  }

  function updateEstimate() {
    const t = totals();
    if (cashEl) cashEl.textContent = "₹" + t.cash.toLocaleString("en-IN");
    if (upiEl)  upiEl.textContent  = "₹" + t.upi.toLocaleString("en-IN");
    if (ptsEl)  ptsEl.textContent  = t.points.toLocaleString("en-IN");
    qtyHelp.hidden = t.kg > 0;
  }

  function setPayout(next) {
    payout = next;
    payoutPills.forEach(p => {
      p.classList.toggle("is-active", p.dataset.payout === next);
      p.setAttribute("aria-pressed", p.dataset.payout === next ? "true" : "false");
    });
    if (upiRow) {
      upiRow.hidden = next !== "upi";
      // Toggle the required attribute so HTML5 validation matches the chosen payout.
      if (next === "upi") upiInput.setAttribute("required", "");
      else                upiInput.removeAttribute("required");
    }
  }

  payoutPills.forEach(p => p.addEventListener("click", () => setPayout(p.dataset.payout)));

  function setMinDate() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 86400000);
    const iso = d => d.toISOString().slice(0, 10);
    dateInput.min = iso(today);
    if (!dateInput.value) dateInput.value = iso(tomorrow);
  }

  // Listen for scanner hand-off
  document.addEventListener("reloop:add-to-pickup", e => {
    const id = e.detail && e.detail.recyclableId;
    const addKg = (e.detail && e.detail.kg) || 1;
    if (!id) return;
    if (!featured.find(i => i.id === id)) {
      const extra = items.find(i => i.id === id);
      if (extra) { featured.push(extra); renderGrid(); }
    }
    const row = grid.querySelector(`.qty-row[data-id="${CSS.escape(id)}"]`);
    if (!row) return;
    const input = row.querySelector("input");
    const current = parseFloat(input.value) || 0;
    input.value = (current + addKg).toString();
    qty.set(id, current + addKg);
    row.classList.add("is-active");
    updateEstimate();
    row.animate([
      { boxShadow: "0 0 0 0 rgba(30,165,102,0.6)" },
      { boxShadow: "0 0 0 8px rgba(30,165,102,0)" },
    ], { duration: 700 });
  });

  function activeItems() {
    const out = [];
    qty.forEach((q, id) => {
      if (q > 0) {
        const it = items.find(x => x.id === id);
        if (it) out.push({ id, kg: q, item: it });
      }
    });
    return out;
  }

  form.addEventListener("submit", e => {
    e.preventDefault();

    // HTML5 validation first — surfaces native bubbles for missing fields.
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

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
      upi:     (data.get("upi")     || "").toString().trim(),
    };
    const date = (data.get("date") || "").toString();
    const slot = (data.get("slot") || "").toString();
    const t = totals();
    const materials = Array.from(new Set(items.map(x => x.item.category)));

    const id = "pk-" + Date.now().toString(36);
    const earnedPoints = payout === "points" ? t.points : 0;
    const earnedCash   = payout === "cash"   ? t.cash   : 0;
    const earnedUpi    = payout === "upi"    ? t.upi    : 0;

    if (window.ReLoop) {
      window.ReLoop.updateState(state => {
        const next = { ...state };
        next.points  = (Number(state.points) || 0) + earnedPoints;
        next.profile = { ...(state.profile || {}), ...profile };
        next.history = [
          {
            id,
            type: "earn",
            ts: Date.now(),
            status: "pending",
            kg: t.kg,
            payout,
            cash:   earnedCash,
            upi:    earnedUpi,
            points: earnedPoints,
            // Per-pickup CO2 estimate (~1.6 kg CO2e averted per kg recycled)
            co2: +(t.kg * 1.6).toFixed(1),
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

    const payoutLabel =
      payout === "cash"   ? `<strong>₹${t.cash.toLocaleString("en-IN")} in cash</strong> at the door`
    : payout === "upi"    ? `<strong>₹${t.upi.toLocaleString("en-IN")} via UPI</strong> within 48 hours`
    : /* points */         `<strong>${t.points.toLocaleString("en-IN")} Green Points</strong> credited instantly`;

    successMsg.innerHTML = `
      <strong>${escapeHtml(profile.name)}</strong>, your pickup is set for
      <strong>${escapeHtml(date)} · ${escapeHtml(slot)}</strong>.
      You'll receive ${payoutLabel} after we weigh your bag.
    `;
    successEl.hidden = false;
    successEl.scrollIntoView({ behavior: "smooth", block: "center" });

    // Reset kg inputs but keep contact details for the next pickup
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
  setPayout(payout);

  // Pre-fill profile from previously saved state
  const saved = (window.ReLoop && window.ReLoop.getState && window.ReLoop.getState().profile) || {};
  if (saved.name)    form.querySelector("#p-name").value    = saved.name;
  if (saved.phone)   form.querySelector("#p-phone").value   = saved.phone;
  if (saved.pin)     form.querySelector("#p-pin").value     = saved.pin;
  if (saved.address) form.querySelector("#p-address").value = saved.address;
  if (saved.upi)     form.querySelector("#p-upi").value     = saved.upi;
})();
