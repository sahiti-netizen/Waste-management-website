// Reward shop — renders the product grid, handles tab filtering and
// runs the redemption flow (confirm, debit points, log history).
(function () {
  const grid  = document.getElementById("shop-grid");
  const tabs  = document.querySelectorAll("[data-shop-tab]");
  if (!grid) return;

  const products = window.PRODUCTS || [];
  const escapeHtml = (window.ReLoop && window.ReLoop.escapeHtml) || (s => s);

  let activeTab = "all";

  function balance() {
    const s = (window.ReLoop && window.ReLoop.getState && window.ReLoop.getState()) || {};
    return Number(s.points) || 0;
  }

  function visible() {
    if (activeTab === "all") return products;
    return products.filter(p => p.type === activeTab);
  }

  function render() {
    const bal = balance();
    grid.innerHTML = visible().map(p => {
      const locked = bal < p.price;
      const cashEquiv = " ≈ ₹" + Math.floor(p.price * 0.1).toLocaleString("en-IN");
      const btn = locked
        ? `<button type="button" class="btn btn-ghost btn-sm" disabled>Need ${(p.price - bal).toLocaleString("en-IN")} more</button>`
        : `<button type="button" class="btn btn-primary btn-sm" data-redeem="${escapeHtml(p.id)}">Redeem</button>`;

      return `
        <article class="product-card${locked ? " is-locked" : ""}">
          <div class="product-emoji" aria-hidden="true">${p.emoji || "🎁"}</div>
          <div class="product-name">${escapeHtml(p.name)}</div>
          <p class="product-desc">${escapeHtml(p.desc)}</p>
          <div class="product-foot">
            <span class="product-price">
              ${p.price.toLocaleString("en-IN")} pts
              <span class="muted">${cashEquiv}</span>
            </span>
            ${btn}
          </div>
        </article>
      `;
    }).join("");

    // Wire each redeem button
    grid.querySelectorAll("[data-redeem]").forEach(btn => {
      btn.addEventListener("click", () => redeem(btn.getAttribute("data-redeem")));
    });
  }

  function redeem(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const bal = balance();
    if (bal < product.price) return;

    const body = document.createElement("div");
    body.innerHTML = `
      <p>You're about to redeem <strong>${escapeHtml(product.name)}</strong>
      for <strong>${product.price.toLocaleString("en-IN")} Green Points</strong>.</p>
      <p class="muted small">${escapeHtml(product.desc)}</p>
      <p class="muted small">After this you'll have
      <strong>${(bal - product.price).toLocaleString("en-IN")} pts</strong> remaining.</p>
    `;

    window.ReLoop.showModal({
      title: "Confirm redemption",
      body,
      actions: [
        { label: "Cancel", variant: "btn-ghost" },
        {
          label: "Confirm",
          variant: "btn-primary",
          onClick: () => {
            window.ReLoop.updateState(state => {
              const next = { ...state };
              next.points = (Number(state.points) || 0) - product.price;
              next.history = [
                {
                  type: "redeem",
                  ts: Date.now(),
                  productId: product.id,
                  productName: product.name,
                  points: -product.price,
                },
                ...(state.history || []),
              ];
              return next;
            });
            celebrate(product);
            render();
          },
        },
      ],
    });
  }

  function celebrate(product) {
    const ok = document.createElement("div");
    ok.innerHTML = `
      <p>🎉 <strong>${escapeHtml(product.name)}</strong> is on its way.</p>
      <p class="muted small">
        ${product.kind === "cash"     ? "We'll initiate a UPI transfer within 48 hours." :
          product.kind === "voucher"  ? "A digital code will land in your email shortly." :
          product.kind === "ship"     ? "We'll dispatch this to your saved address within 5–7 days." :
          /* donate */                  "Thank you — we'll share photo proof from our partner soon."}
      </p>
    `;
    setTimeout(() => {
      window.ReLoop.showModal({
        title: "Done — thank you!",
        body: ok,
        actions: [{ label: "Close", variant: "btn-primary" }],
      });
    }, 50);
  }

  // Tabs
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("is-active"));
      tab.classList.add("is-active");
      activeTab = tab.getAttribute("data-shop-tab") || "all";
      render();
    });
  });

  // Re-render when balance changes (pickup booked, redeem confirmed, etc.)
  document.addEventListener("reloop:state", render);
  render();
})();
