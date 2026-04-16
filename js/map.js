/* ==========================================================
   ManaChetta — public map
   Renders all sample + live reports on a Leaflet map centered
   on Hyderabad. Colors reflect age/status:
     new     → green
     open    → amber
     ignored → red  (> 14 days unresolved)
     done    → blue
   ========================================================== */

(function () {
  "use strict";

  const el = document.getElementById("leaflet");
  if (!el || typeof L === "undefined") return;

  const HYD_CENTER = [17.4126, 78.4756];
  const map = L.map(el, {
    zoomControl: true,
    scrollWheelZoom: false,
  }).setView(HYD_CENTER, 11);

  L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }
  ).addTo(map);

  // Enable scroll-zoom only after the user clicks the map.
  map.on("click", () => map.scrollWheelZoom.enable());
  map.on("mouseout", () => map.scrollWheelZoom.disable());

  const statusColor = (r) => {
    if (r.status === "done") return "#2a78e8";
    if (r.ageDays > 14 || r.status === "ignored") return "#e54949";
    if (r.ageDays > 3 || r.status === "open") return "#f1a63b";
    return "#22c08a";
  };

  const markerFor = (r) =>
    L.circleMarker([r.lat, r.lng], {
      radius: 8,
      color: "#fff",
      weight: 2,
      fillColor: statusColor(r),
      fillOpacity: 0.95,
    }).bindPopup(
      `<strong>${r.ward}</strong><br/>` +
      `${r.category}<br/>` +
      `<span style="color:#4a5a52">${
        r.ageDays === 0 ? "Just now" : r.ageDays + " day" + (r.ageDays === 1 ? "" : "s") + " ago"
      } · ${r.status}</span>`
    );

  const layer = L.layerGroup().addTo(map);

  const render = () => {
    layer.clearLayers();
    (window.SAMPLE_REPORTS || []).forEach((r) => markerFor(r).addTo(layer));
    (window.LIVE_REPORTS || []).forEach((r) => markerFor(r).addTo(layer));
  };

  render();

  // When a new report is submitted via the form, drop a pin live.
  document.addEventListener("manachetta:new-report", (e) => {
    const r = e.detail;
    if (!r) return;
    const m = markerFor(r).addTo(layer);
    map.flyTo([r.lat, r.lng], 14, { duration: 1 });
    m.openPopup();
  });
})();
