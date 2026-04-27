// Local recyclers — Leaflet map + filterable list with optional
// "use my location" sort by distance.
(function () {
  const mapEl     = document.getElementById("leaflet");
  const listEl    = document.getElementById("recyclers-list");
  const locateBtn = document.getElementById("locate-me");
  const matSelect = document.getElementById("material-filter");
  const pickupOnly = document.getElementById("pickup-only");
  if (!mapEl || !listEl) return;

  const recyclers = (window.RECYCLERS || []).slice();
  const cats      = window.CATEGORIES  || [];
  const escapeHtml = (window.ReLoop && window.ReLoop.escapeHtml) || (s => s);

  // Populate material filter from the categories the recyclers actually
  // accept (avoids dead options for "Hazardous" / "Organic" if missing).
  const accepted = Array.from(new Set(recyclers.flatMap(r => r.accepts))).sort();
  matSelect.innerHTML = '<option value="">All materials</option>' +
    accepted.map(id => {
      const c = cats.find(x => x.id === id);
      const label = c ? `${c.icon} ${id}` : id;
      return `<option value="${escapeHtml(id)}">${escapeHtml(label)}</option>`;
    }).join("");

  // ---- Leaflet ----
  // Default to centred-on-Hyderabad until the user shares a location.
  const map = L.map(mapEl, { scrollWheelZoom: false }).setView([17.4350, 78.4350], 11);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  }).addTo(map);

  const markersLayer = L.layerGroup().addTo(map);
  let userMarker = null;
  let userLat = null, userLng = null;
  let activeMaterial = "";
  let pickupFilter = false;

  function recyclerIcon() {
    return L.divIcon({
      className: "",
      html: `<div style="
        width:34px;height:34px;border-radius:50%;
        background:#0f7b4a;color:#fff;display:grid;place-items:center;
        font-size:16px;box-shadow:0 6px 14px rgba(14,27,20,0.28);
        border:2px solid #fff;">♻️</div>`,
      iconSize: [34, 34],
      iconAnchor: [17, 28],
      popupAnchor: [0, -28],
    });
  }
  function userIcon() {
    return L.divIcon({
      className: "",
      html: `<div style="
        width:18px;height:18px;border-radius:50%;
        background:#1a82c4;border:3px solid #fff;
        box-shadow:0 0 0 4px rgba(26,130,196,0.25);"></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
  }

  // Haversine — close enough for a "nearest first" sort.
  function distanceKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const s1 = Math.sin(dLat / 2) ** 2;
    const s2 = Math.sin(dLng / 2) ** 2;
    const a = s1 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * s2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function filtered() {
    return recyclers.filter(r => {
      if (activeMaterial && !r.accepts.includes(activeMaterial)) return false;
      if (pickupFilter && !r.pickup) return false;
      return true;
    });
  }

  function render() {
    const list = filtered().map(r => ({
      ...r,
      distance: userLat != null ? distanceKm(userLat, userLng, r.lat, r.lng) : null,
    })).sort((a, b) => {
      if (a.distance != null && b.distance != null) return a.distance - b.distance;
      return a.name.localeCompare(b.name);
    });

    // Markers
    markersLayer.clearLayers();
    list.forEach(r => {
      const marker = L.marker([r.lat, r.lng], { icon: recyclerIcon() });
      const distLine = r.distance != null
        ? `<br/><strong style="color:#0f7b4a">${r.distance.toFixed(1)} km away</strong>`
        : "";
      marker.bindPopup(`
        <strong>${escapeHtml(r.name)}</strong><br/>
        <span style="color:#5b6a61">${escapeHtml(r.type)}</span><br/>
        ${escapeHtml(r.address)}${distLine}
      `);
      marker.addTo(markersLayer);
    });

    // Auto-fit bounds when there are results and no user pin
    if (list.length && userLat == null) {
      const bounds = L.latLngBounds(list.map(r => [r.lat, r.lng]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
    }

    // Cards
    if (list.length === 0) {
      listEl.innerHTML =
        '<p class="muted small">No recyclers match — try a different filter.</p>';
      return;
    }
    listEl.innerHTML = list.map(r => {
      const tels = (r.phone || "").replace(/\s/g, "");
      const dirUrl = `https://www.google.com/maps/dir/?api=1&destination=${r.lat},${r.lng}`;
      return `
        <article class="recycler-card">
          <div class="recycler-head">
            <div>
              <div class="recycler-name">${escapeHtml(r.name)}</div>
              <div class="recycler-type">${escapeHtml(r.type)}</div>
            </div>
            ${r.distance != null
              ? `<span class="recycler-dist">${r.distance.toFixed(1)} km</span>`
              : ""}
          </div>
          <div class="recycler-meta">
            <span>📍 ${escapeHtml(r.address)}</span>
            <span>🕒 ${escapeHtml(r.hours)}</span>
            <span class="recycler-rating">★ ${escapeHtml(String(r.rating))}</span>
          </div>
          <div class="recycler-tags">
            ${r.accepts.map(a => `<span class="tag">${escapeHtml(a)}</span>`).join("")}
            ${r.pickup ? '<span class="pickup-flag">Doorstep pickup</span>' : ""}
          </div>
          <div class="recycler-actions">
            <a href="tel:${escapeHtml(tels)}" class="btn btn-ghost btn-sm">Call</a>
            <a href="${dirUrl}" target="_blank" rel="noopener"
               class="btn btn-primary btn-sm">Directions →</a>
          </div>
        </article>
      `;
    }).join("");
  }

  // ---- Wire up controls ----
  matSelect.addEventListener("change", e => {
    activeMaterial = e.target.value;
    render();
  });
  pickupOnly.addEventListener("change", e => {
    pickupFilter = e.target.checked;
    render();
  });

  locateBtn.addEventListener("click", () => {
    if (!navigator.geolocation) {
      window.ReLoop && window.ReLoop.showModal({
        title: "Location not available",
        body: "Your browser doesn't support geolocation. You can still browse the list above.",
        actions: [{ label: "OK", variant: "btn-primary" }],
      });
      return;
    }
    const original = locateBtn.innerHTML;
    locateBtn.disabled = true;
    locateBtn.textContent = "Locating…";
    navigator.geolocation.getCurrentPosition(pos => {
      userLat = pos.coords.latitude;
      userLng = pos.coords.longitude;
      if (userMarker) userMarker.remove();
      userMarker = L.marker([userLat, userLng], { icon: userIcon() }).addTo(map);
      userMarker.bindPopup("You are here").openPopup();
      map.setView([userLat, userLng], 12);
      locateBtn.disabled = false;
      locateBtn.textContent = "📍 Re-locate";
      render();
    }, err => {
      locateBtn.disabled = false;
      locateBtn.innerHTML = original;
      window.ReLoop && window.ReLoop.showModal({
        title: "Couldn't get your location",
        body: err.message ||
              "Permission denied. You can still browse the list — distances will hide.",
        actions: [{ label: "OK", variant: "btn-primary" }],
      });
    }, { timeout: 10000, enableHighAccuracy: false });
  });

  render();

  // Leaflet sometimes mis-sizes inside long pages until a resize event.
  setTimeout(() => map.invalidateSize(), 200);
  window.addEventListener("load", () => map.invalidateSize());
})();
