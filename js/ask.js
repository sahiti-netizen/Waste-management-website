// "Item not listed?" contact form. Bridges the gap when our AI scanner
// can't classify something or the guide doesn't cover it. Stores
// queries to localStorage for the demo; a real backend would email /
// ticket the operations team.
(function () {
  const form       = document.getElementById("ask-form");
  const successEl  = document.getElementById("ask-success");
  const successMsg = document.getElementById("ask-success-msg");
  if (!form) return;

  const KEY = "reloop:asks";

  function readAsks() {
    try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
    catch (_) { return []; }
  }
  function writeAsks(list) {
    localStorage.setItem(KEY, JSON.stringify(list));
  }

  // Convert an uploaded photo to a small data URL so it can live in
  // localStorage alongside the rest of the request. Caps the image at
  // 800 px on the long edge so the storage entry stays under quota.
  function shrinkImage(file, max = 800) {
    return new Promise(resolve => {
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const scale = Math.min(1, max / Math.max(img.width, img.height));
          const w = Math.round(img.width  * scale);
          const h = Math.round(img.height * scale);
          const c = document.createElement("canvas");
          c.width = w; c.height = h;
          c.getContext("2d").drawImage(img, 0, 0, w, h);
          resolve(c.toDataURL("image/jpeg", 0.8));
        };
        img.onerror = () => resolve(null);
        img.src = reader.result;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  }

  form.addEventListener("submit", async e => {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }

    const data = new FormData(form);
    const photoFile = data.get("photo");
    const photoDataUrl = (photoFile && photoFile.size > 0)
      ? await shrinkImage(photoFile)
      : null;

    const ask = {
      ts: Date.now(),
      name:    (data.get("name")    || "").toString().trim(),
      contact: (data.get("contact") || "").toString().trim(),
      item:    (data.get("item")    || "").toString().trim(),
      desc:    (data.get("desc")    || "").toString().trim(),
      photo:   photoDataUrl,
    };

    try {
      const list = readAsks();
      list.unshift(ask);
      writeAsks(list);
    } catch (err) {
      // Quota likely — drop the photo and try again
      delete ask.photo;
      try { writeAsks([ask, ...readAsks()]); } catch (_) {}
    }

    successMsg.innerHTML = `
      Thanks <strong>${(ask.name || "")}</strong> — we've logged your query about
      <strong>${(ask.item || "this item")}</strong> and will get back to you on
      <strong>${(ask.contact || "your contact")}</strong> within a day.
    `;
    successEl.hidden = false;
    form.reset();
    successEl.scrollIntoView({ behavior: "smooth", block: "center" });
  });
})();
