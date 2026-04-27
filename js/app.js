// Shared app utilities: localStorage state, nav drawer, modal helpers,
// data-binding paint, footer year, hero stat counters.
(function () {
  const KEY = "reloop:user";
  const DEFAULT_STATE = { points: 0, history: [], profile: {} };

  function loadState() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return { ...DEFAULT_STATE };
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_STATE, ...parsed };
    } catch (_) {
      return { ...DEFAULT_STATE };
    }
  }

  function saveState(state) {
    localStorage.setItem(KEY, JSON.stringify(state));
    document.dispatchEvent(new CustomEvent("reloop:state", { detail: state }));
    paintBindings(state);
    return state;
  }

  function updateState(mutator) {
    return saveState(mutator(loadState()));
  }

  function getState() { return loadState(); }

  // Paint any [data-d="<key>"] node with a derived value from state.
  // Each later module that adds a new key just extends this map.
  function paintBindings(state) {
    const history = state.history || [];
    const earns = history.filter(h => h.type === "earn");
    const kgTotal = earns.reduce((s, h) => s + (Number(h.kg) || 0), 0);
    const points = Number(state.points) || 0;
    const co2 = +(kgTotal * 1.6).toFixed(1); // rough kg CO2e averted per kg recycled
    const trees = Math.max(0, Math.round(co2 * 0.5));

    const map = {
      points: points.toLocaleString("en-IN"),
      "cash-equiv": "₹" + Math.floor(points / 10).toLocaleString("en-IN"),
      "kg-total": kgTotal.toFixed(1),
      pickups: earns.length.toString(),
      co2: co2.toString(),
      trees: trees.toString(),
    };

    document.querySelectorAll("[data-d]").forEach(el => {
      const key = el.getAttribute("data-d");
      if (key in map && !el.dataset.dStatic) el.textContent = map[key];
    });
  }

  // Modal
  const modal      = document.getElementById("modal");
  const modalTitle = document.getElementById("modal-title");
  const modalBody  = document.getElementById("modal-body");
  const modalActs  = document.getElementById("modal-actions");
  const modalClose = document.getElementById("modal-close");

  function showModal({ title, body, actions = [] }) {
    if (!modal) return;
    modalTitle.textContent = title || "";
    modalBody.innerHTML = "";
    if (typeof body === "string") {
      const p = document.createElement("p");
      p.textContent = body;
      modalBody.appendChild(p);
    } else if (body instanceof HTMLElement) {
      modalBody.appendChild(body);
    }

    modalActs.innerHTML = "";
    actions.forEach(a => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn " + (a.variant || "btn-ghost");
      btn.textContent = a.label;
      btn.addEventListener("click", () => {
        if (a.onClick) a.onClick();
        if (a.dismiss !== false) hideModal();
      });
      modalActs.appendChild(btn);
    });

    modal.hidden = false;
    document.body.style.overflow = "hidden";
  }
  function hideModal() {
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = "";
  }
  if (modalClose) modalClose.addEventListener("click", hideModal);
  if (modal) modal.addEventListener("click", e => { if (e.target === modal) hideModal(); });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && modal && !modal.hidden) hideModal();
  });

  // Mobile nav drawer
  const navToggle = document.querySelector(".nav-toggle");
  const navLinks  = document.querySelector(".nav-links");
  if (navToggle && navLinks) {
    navToggle.addEventListener("click", () => {
      const open = navLinks.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(open));
    });
    navLinks.addEventListener("click", e => {
      if (e.target.closest("a")) {
        navLinks.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  // User chip → rewards section
  const userChip = document.getElementById("user-chip");
  if (userChip) {
    userChip.addEventListener("click", () => {
      const t = document.getElementById("rewards");
      if (t) t.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  // Footer year
  const yr = document.getElementById("year");
  if (yr) yr.textContent = new Date().getFullYear();

  // Hero stat counters
  const counters = document.querySelectorAll("[data-counter]");
  if (counters.length && "IntersectionObserver" in window) {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    counters.forEach(el => obs.observe(el));
  }
  function animateCounter(el) {
    const target = parseInt(el.dataset.counter, 10) || 0;
    const dur = 900;
    const start = performance.now();
    function step(now) {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.floor(eased * target).toLocaleString("en-IN");
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  window.ReLoop = {
    getState, updateState, saveState,
    showModal, hideModal, paintBindings,
    escapeHtml,
  };

  paintBindings(loadState());
})();
