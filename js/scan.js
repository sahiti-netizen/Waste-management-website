// Snap & Sort — in-browser AI image classifier.
//
// Uses MobileNet (loaded lazily via the CDN scripts in index.html) to
// classify an uploaded photo, then maps the top class label to one of
// our known recyclable items via window.MATERIAL_MAP. Everything runs
// locally — the image bytes never leave the device.
(function () {
  const dropEl       = document.getElementById("scan-drop");
  const inputEl      = document.getElementById("scan-input");
  const previewEl    = document.getElementById("scan-preview");
  const imgEl        = document.getElementById("scan-image");
  const resetBtn     = document.getElementById("scan-reset");
  const loadingEl    = document.getElementById("scan-loading");
  const loadingText  = document.getElementById("scan-loading-text");
  const resultsEl    = document.getElementById("scan-results");
  const verdictBadge = document.getElementById("verdict-badge");
  const verdictTitle = document.getElementById("verdict-title");
  const verdictSub   = document.getElementById("verdict-sub");
  const materialEl   = document.getElementById("scan-material");
  const pointsEl     = document.getElementById("scan-points");
  const tipWrap      = document.getElementById("scan-tip-wrap");
  const tipEl        = document.getElementById("scan-tip");
  const predListEl   = document.getElementById("scan-predictions");
  const addBtn       = document.getElementById("scan-add-pickup");

  if (!dropEl || !inputEl || !imgEl) return;

  const RECYCLABLES = window.RECYCLABLES || [];
  const MAP = window.MATERIAL_MAP || { patterns: [], unknown: {} };
  const escapeHtml = (window.ReLoop && window.ReLoop.escapeHtml) || (s => s);

  // Cached model promise — first scan triggers a download (~5 MB), every
  // subsequent scan reuses the resolved model instance.
  let modelPromise = null;

  function loadModel() {
    if (modelPromise) return modelPromise;
    if (typeof mobilenet === "undefined") {
      // CDN scripts haven't finished — try again shortly.
      return new Promise((resolve, reject) => {
        let tries = 0;
        const wait = setInterval(() => {
          if (typeof mobilenet !== "undefined") {
            clearInterval(wait);
            modelPromise = mobilenet.load({ version: 2, alpha: 1.0 });
            modelPromise.then(resolve, reject);
          } else if (++tries > 60) {
            clearInterval(wait);
            reject(new Error("Couldn't reach the AI model. Are you offline?"));
          }
        }, 250);
      });
    }
    modelPromise = mobilenet.load({ version: 2, alpha: 1.0 });
    return modelPromise;
  }

  // Find the first MATERIAL_MAP pattern that matches any of the predictions.
  function matchPredictions(predictions) {
    for (const p of predictions) {
      const label = String(p.className || "").toLowerCase();
      for (const pat of MAP.patterns) {
        for (const tok of pat.match) {
          if (label.includes(tok.toLowerCase())) {
            return { pattern: pat, prediction: p };
          }
        }
      }
    }
    return null;
  }

  function recyclableById(id) {
    return RECYCLABLES.find(r => r.id === id) || null;
  }

  function setLoading(text) {
    if (text) {
      loadingText.textContent = text;
      loadingEl.hidden = false;
    } else {
      loadingEl.hidden = true;
    }
  }

  function reset() {
    inputEl.value = "";
    imgEl.removeAttribute("src");
    previewEl.hidden = true;
    dropEl.hidden = false;
    resultsEl.hidden = true;
    setLoading(null);
    addBtn.disabled = false;
    addBtn.textContent = "Add to my pickup";
    delete addBtn.dataset.recyclableId;
  }

  function showError(message) {
    setLoading(null);
    resultsEl.hidden = false;
    verdictBadge.className = "verdict-badge is-unknown";
    verdictBadge.textContent = "Error";
    verdictTitle.textContent = message;
    verdictSub.textContent = "Try a different photo or check your connection.";
    materialEl.textContent = "—";
    pointsEl.textContent = "—";
    tipWrap.hidden = true;
    predListEl.innerHTML = "";
    addBtn.disabled = true;
  }

  function renderResults(predictions) {
    setLoading(null);
    resultsEl.hidden = false;

    const top = predictions[0];
    const matched = matchPredictions(predictions);

    if (!matched) {
      verdictBadge.className = "verdict-badge is-unknown";
      verdictBadge.textContent = "Unknown";
      verdictTitle.textContent = top
        ? `Looks like ${cleanLabel(top.className)}`
        : "Couldn't read the photo";
      verdictSub.textContent = MAP.unknown && MAP.unknown.note
        ? MAP.unknown.note
        : "Try the guide below for similar items.";
      materialEl.textContent = (MAP.unknown && MAP.unknown.material) || "Unclear";
      pointsEl.textContent = "—";
      tipWrap.hidden = true;
      addBtn.disabled = true;
      addBtn.textContent = "No match to add";
    } else {
      const item = recyclableById(matched.pattern.recyclableId);
      const verdict = verdictFor(item);
      verdictBadge.className = "verdict-badge " + verdict.cls;
      verdictBadge.textContent = verdict.label;
      verdictTitle.textContent = item ? item.name : cleanLabel(top.className);
      verdictSub.textContent = `Detected: ${cleanLabel(matched.prediction.className)} `
                             + `(${Math.round(matched.prediction.probability * 100)}% confident)`;
      materialEl.textContent = matched.pattern.material || (item ? item.category : "—");
      pointsEl.textContent = item && item.pointsPerKg > 0
        ? `+${item.pointsPerKg} pts / kg`
        : "Not point-eligible";

      if (item && item.tip) {
        tipEl.textContent = item.tip;
        tipWrap.hidden = false;
      } else {
        tipWrap.hidden = true;
      }

      addBtn.disabled = !(item && item.pointsPerKg > 0);
      addBtn.textContent = item && item.pointsPerKg > 0
        ? `Add ${item.name} to my pickup`
        : "Not point-eligible";
      if (item) addBtn.dataset.recyclableId = item.id;
    }

    // Top-N predictions
    predListEl.innerHTML = predictions.slice(0, 3).map(p => `
      <li>
        <span>${escapeHtml(cleanLabel(p.className))}</span>
        <span class="pct">${Math.round(p.probability * 100)}%</span>
      </li>
    `).join("");
  }

  function verdictFor(item) {
    if (!item) return { cls: "is-unknown", label: "Unknown" };
    if (item.recyclable === "yes")       return { cls: "is-yes",       label: "Recyclable" };
    if (item.recyclable === "sometimes") return { cls: "is-sometimes", label: "Special drop-off" };
    return { cls: "is-no", label: "Not recyclable" };
  }

  function cleanLabel(s) {
    // ImageNet labels are comma-separated synset entries — keep just the
    // first synonym for a tidy UI.
    return String(s || "").split(",")[0].trim();
  }

  async function handleFile(file) {
    if (!file || !file.type.startsWith("image/")) return;

    // Show preview immediately, then run the model.
    const url = URL.createObjectURL(file);
    imgEl.src = url;
    imgEl.onload = async () => {
      dropEl.hidden = true;
      previewEl.hidden = false;
      resultsEl.hidden = true;
      setLoading("Loading model… (first run only)");
      try {
        const model = await loadModel();
        setLoading("Analysing photo…");
        const predictions = await model.classify(imgEl, 5);
        renderResults(predictions);
      } catch (err) {
        console.error(err);
        showError(err.message || "Something went wrong.");
      }
    };
  }

  // ---- Wire up events ----
  inputEl.addEventListener("change", e => {
    if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]);
  });

  // Drag-and-drop on the drop zone
  ["dragenter", "dragover"].forEach(evt => {
    dropEl.addEventListener(evt, e => {
      e.preventDefault();
      dropEl.classList.add("is-drag");
    });
  });
  ["dragleave", "drop"].forEach(evt => {
    dropEl.addEventListener(evt, e => {
      e.preventDefault();
      dropEl.classList.remove("is-drag");
    });
  });
  dropEl.addEventListener("drop", e => {
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) handleFile(f);
  });

  resetBtn.addEventListener("click", reset);

  // Add-to-pickup hand-off. The pickup module (Phase 6) listens for this
  // event and seeds its quantity grid. For now it also scrolls the user
  // to the pickup section and stores the request on window.ReLoop so
  // late-loading modules can still consume it.
  addBtn.addEventListener("click", () => {
    const id = addBtn.dataset.recyclableId;
    if (!id) return;
    window.ReLoop = window.ReLoop || {};
    window.ReLoop.pendingScan = { recyclableId: id };
    document.dispatchEvent(new CustomEvent("reloop:add-to-pickup", {
      detail: { recyclableId: id, kg: 1 },
    }));
    const target = document.getElementById("pickup");
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
})();
