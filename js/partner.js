// Partner registration — gated societies, schools, businesses sign up
// for monthly collection drives. Persisted to localStorage so the
// "registered partners" tally on the same section reflects every
// submission. A real backend would replace this in production.
(function () {
  const form        = document.getElementById("partner-form");
  const successEl   = document.getElementById("partner-success");
  const successMsg  = document.getElementById("partner-success-msg");
  const tally       = document.getElementById("partner-tally");
  const countEl     = document.querySelector('[data-d="partner-count"]');
  const peopleEl    = document.querySelector('[data-d="partner-people"]');
  if (!form) return;

  const KEY = "reloop:partners";

  function readPartners() {
    try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
    catch (_) { return []; }
  }
  function writePartners(list) {
    localStorage.setItem(KEY, JSON.stringify(list));
    paintTally();
  }

  function paintTally() {
    const list = readPartners();
    if (!list.length) { tally.hidden = true; return; }
    const totalPeople = list.reduce((s, p) => s + (Number(p.people) || 0), 0);
    if (countEl)  countEl.textContent  = list.length.toLocaleString("en-IN");
    if (peopleEl) peopleEl.textContent = totalPeople.toLocaleString("en-IN");
    tally.hidden = false;
  }

  form.addEventListener("submit", e => {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }

    const data = new FormData(form);
    const partner = {
      ts: Date.now(),
      org:     (data.get("org")    || "").toString().trim(),
      type:    (data.get("type")   || "").toString(),
      contact: (data.get("contact")|| "").toString().trim(),
      phone:   (data.get("phone")  || "").toString().trim(),
      email:   (data.get("email")  || "").toString().trim(),
      people:  Number(data.get("people")) || 0,
      address: (data.get("address")|| "").toString().trim(),
      pref:    (data.get("pref")   || "").toString(),
    };

    const list = readPartners();
    list.unshift(partner);
    writePartners(list);

    successMsg.innerHTML = `
      <strong>${(partner.org || "Your organisation")}</strong> is registered. We'll call
      <strong>${(partner.contact || "you")}</strong> on
      <strong>${(partner.phone || "your number")}</strong>
      within 2 business days to confirm your first drive.
    `;
    successEl.hidden = false;
    form.reset();
    successEl.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  paintTally();
})();
