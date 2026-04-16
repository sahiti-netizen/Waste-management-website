/* ==========================================================
   ManaChetta — main app logic
   - Nav toggle
   - Animated stat counters
   - Report form: photo preview, geolocation, ward auto-detect,
     submit handler that opens GHMC helpline on WhatsApp
   ========================================================== */

(function () {
  "use strict";

  // GHMC Citizen helpline (publicly listed for general complaints)
  // This opens WhatsApp / tel: — it does not auto-send.
  const GHMC_WHATSAPP = "919000113667"; // GHMC complaint helpline (MyGHMC)

  // ---------- Footer year ----------
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ---------- Mobile nav toggle ----------
  const nav = document.querySelector(".nav");
  const toggle = document.querySelector(".nav-toggle");
  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    // Close menu after clicking a link (mobile)
    nav.querySelectorAll(".nav-links a").forEach((a) =>
      a.addEventListener("click", () => {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      })
    );
  }

  // ---------- Animated counters ----------
  const counters = document.querySelectorAll("[data-counter]");
  if (counters.length) {
    const animate = (el) => {
      const target = parseInt(el.dataset.counter, 10) || 0;
      const duration = 1400;
      const start = performance.now();
      const step = (now) => {
        const p = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased).toLocaleString("en-IN");
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            animate(e.target);
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.3 }
    );
    counters.forEach((c) => io.observe(c));
  }

  // ---------- Report form ----------
  const form = document.getElementById("report-form");
  const photoInput = document.getElementById("photo");
  const photoPreview = document.getElementById("photo-preview");
  const detectBtn = document.getElementById("detect-location");
  const detected = document.getElementById("detected");
  const successEl = document.getElementById("form-success");

  const detectedState = {
    ward: null, // ward object
    lat: null,
    lng: null,
  };

  // Photo preview
  if (photoInput && photoPreview) {
    photoInput.addEventListener("change", () => {
      photoPreview.innerHTML = "";
      const file = photoInput.files && photoInput.files[0];
      if (!file) return;
      const img = new Image();
      img.alt = "Selected report photo";
      img.src = URL.createObjectURL(file);
      img.onload = () => URL.revokeObjectURL(img.src);
      photoPreview.appendChild(img);
    });
  }

  // Geolocation → ward auto-detect
  const setDetected = (lat, lng) => {
    detectedState.lat = lat;
    detectedState.lng = lng;
    const ward = window.findNearestWard(lat, lng);
    detectedState.ward = ward;

    if (!ward) return;
    detected.hidden = false;
    detected.querySelector('[data-d="ward"]').textContent = `${ward.name} (Ward ${ward.id})`;
    detected.querySelector('[data-d="mla"]').textContent = `${ward.mla} · ${ward.ac}`;
    detected.querySelector('[data-d="mp"]').textContent  = ward.mp;
    detected.querySelector('[data-d="coords"]').textContent =
      `Coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)} · Ward matched by nearest center.`;
  };

  if (detectBtn) {
    detectBtn.addEventListener("click", () => {
      if (!("geolocation" in navigator)) {
        alert("Your browser doesn't support geolocation. Please try on a phone.");
        return;
      }
      detectBtn.disabled = true;
      detectBtn.textContent = "Locating…";
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setDetected(pos.coords.latitude, pos.coords.longitude);
          detectBtn.disabled = false;
          detectBtn.innerHTML =
            '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg> Re-detect location';
        },
        (err) => {
          detectBtn.disabled = false;
          detectBtn.textContent = "Couldn't locate — try again";
          console.warn("Geolocation error:", err);
          // Fallback: pick a representative Hyderabad center so the demo still works
          setDetected(17.4156, 78.4347);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    });
  }

  // Form submit — compose WhatsApp message to GHMC helpline
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const file = photoInput.files && photoInput.files[0];
      const category = form.category.value;
      const landmark = form.landmark.value.trim();

      if (!file) {
        alert("Please add a photo of the issue.");
        photoInput.focus();
        return;
      }
      if (!category) {
        alert("Please choose the type of issue.");
        form.category.focus();
        return;
      }
      if (!detectedState.ward || detectedState.lat == null) {
        alert("Please tap 'Detect my location' so we can attach your ward.");
        if (detectBtn) detectBtn.focus();
        return;
      }

      const w = detectedState.ward;
      const mapsUrl =
        `https://www.google.com/maps/search/?api=1&query=${detectedState.lat},${detectedState.lng}`;

      const msg =
        `ManaChetta citizen report\n` +
        `Issue: ${category}\n` +
        `Ward: ${w.name} (Ward ${w.id})\n` +
        `MLA: ${w.mla} · ${w.ac}\n` +
        `MP: ${w.mp}\n` +
        (landmark ? `Landmark: ${landmark}\n` : "") +
        `Location: ${mapsUrl}\n\n` +
        `Please arrange clearing. Photo attached via ManaChetta.`;

      const waUrl = `https://wa.me/${GHMC_WHATSAPP}?text=${encodeURIComponent(msg)}`;

      // Add to live reports so it shows up on the map + leaderboard
      const newReport = {
        id: "r-live-" + Date.now(),
        lat: detectedState.lat,
        lng: detectedState.lng,
        ward: w.name,
        category,
        ageDays: 0,
        status: "new",
      };
      window.LIVE_REPORTS.push(newReport);
      document.dispatchEvent(
        new CustomEvent("manachetta:new-report", { detail: newReport })
      );

      // Open WhatsApp with pre-filled text
      window.open(waUrl, "_blank", "noopener");

      // Show success panel
      if (successEl) successEl.hidden = false;
      successEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }
})();
