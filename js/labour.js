/* ==========================================================
   ShramSetu — labour compliance register logic
   - Employee master CRUD (persisted in localStorage)
   - Statutory calc: PF (12% of Basic, capped 15000),
     ESI (0.75% employee / 3.25% employer when gross <= 21000),
     Professional Tax (Telangana slabs)
   - Register render + Excel/CSV, portal JSON and ECR exports
   - CSV -> JSON import (mirrors the "Excel file into JSON" step)

   NOTE: statutory rates are indicative and must be verified
   against current government notifications before filing.
   ========================================================== */

(function () {
  "use strict";

  // ---- constants (indicative statutory parameters) ----
  const PF_WAGE_CEILING = 15000;   // PF computed on min(basic, ceiling)
  const PF_RATE = 0.12;            // employee & employer share
  const ESI_WAGE_CEILING = 21000;  // ESI applies when gross <= ceiling
  const ESI_EMPLOYEE_RATE = 0.0075;
  const ESI_EMPLOYER_RATE = 0.0325;
  const STORAGE_KEY = "shramsetu.employees.v1";

  const EMPLOYER = {
    name: "Demo Waste Management Pvt Ltd",
    pfEstablishmentId: "TSHYD0000000000",
    esiCode: "00000000000000000",
  };

  const rupee = (n) =>
    "₹" + Math.round(n || 0).toLocaleString("en-IN");

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // ---------- storage ----------
  let employees = load();

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn("Could not read stored employees:", e);
      return [];
    }
  }
  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(employees));
    } catch (e) {
      console.warn("Could not persist employees:", e);
    }
  }

  // ---------- statutory calculations ----------
  function professionalTax(gross) {
    // Telangana monthly PT slabs (indicative)
    if (gross <= 15000) return 0;
    if (gross <= 20000) return 150;
    return 200;
  }

  function computeStatutory(emp) {
    const basic = Number(emp.basic) || 0;
    const gross = Number(emp.gross) || 0;
    const pfWage = Math.min(basic, PF_WAGE_CEILING);
    const pfEmployee = Math.round(pfWage * PF_RATE);
    const pfEmployer = Math.round(pfWage * PF_RATE);
    const esiApplies = gross > 0 && gross <= ESI_WAGE_CEILING;
    const esiEmployee = esiApplies ? Math.round(gross * ESI_EMPLOYEE_RATE) : 0;
    const esiEmployer = esiApplies ? Math.round(gross * ESI_EMPLOYER_RATE) : 0;
    const pt = professionalTax(gross);
    const net = gross - pfEmployee - esiEmployee - pt;
    return { pfWage, pfEmployee, pfEmployer, esiApplies, esiEmployee, esiEmployer, pt, net };
  }

  function age(dob) {
    if (!dob) return "";
    const b = new Date(dob);
    if (isNaN(b)) return "";
    const now = new Date();
    let a = now.getFullYear() - b.getFullYear();
    const m = now.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < b.getDate())) a--;
    return a >= 0 && a < 130 ? a : "";
  }

  function maskAadhaar(value) {
    const digits = String(value || "").replace(/\D/g, "");
    if (!digits) return "";
    const last4 = digits.slice(-4);
    return "XXXX XXXX " + last4;
  }

  // ---------- form ----------
  const form = $("#emp-form");
  const calcBox = $("#calc");

  function readForm() {
    return {
      id: $("#emp-id").value || null,
      name: $("#name").value.trim(),
      guardian: $("#guardian").value.trim(),
      gender: $("#gender").value,
      dob: $("#dob").value,
      pan: $("#pan").value.trim().toUpperCase(),
      aadhaar: maskAadhaar($("#aadhaar").value), // only masked value is kept
      role: $("#role").value.trim(),
      department: $("#department").value.trim(),
      doj: $("#doj").value,
      uan: $("#uan").value.trim(),
      esiIp: $("#esi").value.trim(),
      basic: Number($("#basic").value) || 0,
      gross: Number($("#gross").value) || 0,
      bank: $("#bank").value.trim(),
      ifsc: $("#ifsc").value.trim().toUpperCase(),
    };
  }

  function liveCalc() {
    const basic = Number($("#basic").value) || 0;
    const gross = Number($("#gross").value) || 0;
    if (!basic && !gross) { calcBox.hidden = true; return; }
    const s = computeStatutory({ basic, gross });
    calcBox.hidden = false;
    calcBox.querySelector('[data-c="pf"]').textContent = rupee(s.pfEmployee);
    calcBox.querySelector('[data-c="esi"]').textContent = s.esiApplies ? rupee(s.esiEmployee) : "N/A";
    calcBox.querySelector('[data-c="pt"]').textContent = rupee(s.pt);
    calcBox.querySelector('[data-c="net"]').textContent = rupee(s.net);
  }

  $("#basic").addEventListener("input", liveCalc);
  $("#gross").addEventListener("input", liveCalc);
  $("#dob").addEventListener("change", () => {
    const a = age($("#dob").value);
    $("#age-hint").textContent = a === "" ? "" : `Age: ${a} years`;
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = readForm();
    if (!data.name) { alert("Please enter the employee's name."); $("#name").focus(); return; }
    if (!data.role) { alert("Please enter the role."); $("#role").focus(); return; }
    if (!data.basic && !data.gross) { alert("Please enter Basic and Gross wages."); $("#basic").focus(); return; }
    if (!$("#consent").checked) { alert("Please confirm the employee has consented."); return; }

    if (data.id) {
      const idx = employees.findIndex((x) => x.id === data.id);
      if (idx >= 0) employees[idx] = data;
    } else {
      data.id = "emp-" + Date.now();
      employees.push(data);
    }
    persist();
    render();
    resetForm();
  });

  function resetForm() {
    form.reset();
    $("#emp-id").value = "";
    $("#age-hint").textContent = "";
    calcBox.hidden = true;
    $("#save-btn").textContent = "Save employee";
  }
  $("#reset-btn").addEventListener("click", resetForm);

  function editEmployee(id) {
    const emp = employees.find((x) => x.id === id);
    if (!emp) return;
    $("#emp-id").value = emp.id;
    $("#name").value = emp.name || "";
    $("#guardian").value = emp.guardian || "";
    $("#gender").value = emp.gender || "";
    $("#dob").value = emp.dob || "";
    $("#pan").value = emp.pan || "";
    $("#aadhaar").value = ""; // never re-populate raw Aadhaar; already masked in store
    $("#role").value = emp.role || "";
    $("#department").value = emp.department || "";
    $("#doj").value = emp.doj || "";
    $("#uan").value = emp.uan || "";
    $("#esi").value = emp.esiIp || "";
    $("#basic").value = emp.basic || "";
    $("#gross").value = emp.gross || "";
    $("#bank").value = emp.bank || "";
    $("#ifsc").value = emp.ifsc || "";
    $("#consent").checked = true;
    liveCalc();
    $("#save-btn").textContent = "Update employee";
    document.getElementById("add").scrollIntoView({ behavior: "smooth" });
  }

  function deleteEmployee(id) {
    const emp = employees.find((x) => x.id === id);
    if (!emp) return;
    if (!confirm(`Remove ${emp.name} from the register?`)) return;
    employees = employees.filter((x) => x.id !== id);
    persist();
    render();
  }

  // ---------- render register ----------
  const body = $("#register-body");
  const foot = $("#register-foot");
  const emptyState = $("#empty-state");
  const searchInput = $("#search");

  function filtered() {
    const q = searchInput.value.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) =>
      [e.name, e.role, e.pan, e.department, e.uan]
        .some((v) => String(v || "").toLowerCase().includes(q))
    );
  }

  function render() {
    const list = filtered();
    body.innerHTML = "";
    emptyState.hidden = employees.length !== 0;

    const totals = { basic: 0, gross: 0, pf: 0, esi: 0, pt: 0, net: 0 };

    list.forEach((emp, i) => {
      const s = computeStatutory(emp);
      totals.basic += emp.basic; totals.gross += emp.gross;
      totals.pf += s.pfEmployee; totals.esi += s.esiEmployee;
      totals.pt += s.pt; totals.net += s.net;

      const tr = document.createElement("tr");
      tr.innerHTML =
        `<td>${i + 1}</td>` +
        `<td>${esc(emp.name)}</td>` +
        `<td>${esc(emp.role)}</td>` +
        `<td>${esc(emp.pan) || "—"}</td>` +
        `<td>${esc(emp.aadhaar) || "—"}</td>` +
        `<td>${esc(emp.uan) || "—"}</td>` +
        `<td class="num">${rupee(emp.basic)}</td>` +
        `<td class="num">${rupee(emp.gross)}</td>` +
        `<td class="num">${rupee(s.pfEmployee)}</td>` +
        `<td class="num">${s.esiApplies ? rupee(s.esiEmployee) : "—"}</td>` +
        `<td class="num">${rupee(s.pt)}</td>` +
        `<td class="num">${rupee(s.net)}</td>` +
        `<td><button class="row-edit" data-edit="${emp.id}">Edit</button>` +
        `<button class="row-del" data-del="${emp.id}">Delete</button></td>`;
      body.appendChild(tr);
    });

    foot.innerHTML = list.length
      ? `<tr><td colspan="6">Total · ${list.length} employee(s)</td>` +
        `<td class="num">${rupee(totals.basic)}</td>` +
        `<td class="num">${rupee(totals.gross)}</td>` +
        `<td class="num">${rupee(totals.pf)}</td>` +
        `<td class="num">${rupee(totals.esi)}</td>` +
        `<td class="num">${rupee(totals.pt)}</td>` +
        `<td class="num">${rupee(totals.net)}</td><td></td></tr>`
      : "";

    // hero stats
    const gross = employees.reduce((a, e) => a + (Number(e.gross) || 0), 0);
    const deduct = employees.reduce((a, e) => {
      const s = computeStatutory(e); return a + s.pfEmployee + s.esiEmployee;
    }, 0);
    $('[data-stat="count"]').textContent = employees.length;
    $('[data-stat="gross"]').textContent = rupee(gross);
    $('[data-stat="deduct"]').textContent = rupee(deduct);
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  body.addEventListener("click", (e) => {
    const del = e.target.closest("[data-del]");
    const edit = e.target.closest("[data-edit]");
    if (del) deleteEmployee(del.dataset.del);
    if (edit) editEmployee(edit.dataset.edit);
  });
  searchInput.addEventListener("input", render);

  // ---------- period label ----------
  function periodLabel() {
    const type = $("#period-type").value;
    const value = $("#period-value").value; // yyyy-mm
    if (!value) return { type, label: "(period not set)" };
    const [y, m] = value.split("-").map(Number);
    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    if (type === "month") return { type, label: `${monthNames[m - 1]} ${y}`, year: y, month: m };
    if (type === "quarter") {
      const q = Math.floor((m - 1) / 3) + 1;
      return { type, label: `Q${q} ${y}`, year: y, quarter: q };
    }
    const half = m <= 6 ? "H1 (Jan–Jun)" : "H2 (Jul–Dec)";
    return { type, label: `${half} ${y}`, year: y, half: m <= 6 ? 1 : 2 };
  }

  // ---------- exports ----------
  function download(filename, text, mime) {
    const blob = new Blob([text], { type: mime || "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function csvCell(v) {
    const s = String(v == null ? "" : v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function buildRows() {
    return employees.map((emp, i) => {
      const s = computeStatutory(emp);
      return {
        sl: i + 1,
        name: emp.name, guardian: emp.guardian, gender: emp.gender,
        age: age(emp.dob), pan: emp.pan, aadhaar: emp.aadhaar,
        role: emp.role, department: emp.department, doj: emp.doj,
        uan: emp.uan, esiIp: emp.esiIp,
        basic: emp.basic, gross: emp.gross,
        pfEmployee: s.pfEmployee, pfEmployer: s.pfEmployer,
        esiEmployee: s.esiEmployee, esiEmployer: s.esiEmployer,
        professionalTax: s.pt, netPay: s.net,
        bank: emp.bank, ifsc: emp.ifsc,
      };
    });
  }

  $("#export-csv").addEventListener("click", () => {
    if (!employees.length) { alert("Add at least one employee first."); return; }
    const rows = buildRows();
    const headers = [
      "Sl No","Name","Father/Guardian","Gender","Age","PAN","Aadhaar (masked)",
      "Role","Department","Date of Joining","UAN","ESI IP",
      "Basic+DA","Gross","PF (Employee)","PF (Employer)","ESI (Employee)","ESI (Employer)",
      "Professional Tax","Net Pay","Bank A/c","IFSC",
    ];
    const lines = [headers.map(csvCell).join(",")];
    rows.forEach((r) => {
      lines.push([
        r.sl, r.name, r.guardian, r.gender, r.age, r.pan, r.aadhaar,
        r.role, r.department, r.doj, r.uan, r.esiIp,
        r.basic, r.gross, r.pfEmployee, r.pfEmployer, r.esiEmployee, r.esiEmployer,
        r.professionalTax, r.netPay, r.bank, r.ifsc,
      ].map(csvCell).join(","));
    });
    const p = periodLabel();
    // BOM so Excel reads UTF-8 (₹, names) correctly
    download(`employee-register-${slug(p.label)}.csv`, "﻿" + lines.join("\r\n"), "text/csv;charset=utf-8");
  });

  $("#export-json").addEventListener("click", () => {
    if (!employees.length) { alert("Add at least one employee first."); return; }
    const rows = buildRows();
    const totals = rows.reduce((a, r) => ({
      basic: a.basic + r.basic, gross: a.gross + r.gross,
      pfEmployee: a.pfEmployee + r.pfEmployee, pfEmployer: a.pfEmployer + r.pfEmployer,
      esiEmployee: a.esiEmployee + r.esiEmployee, esiEmployer: a.esiEmployer + r.esiEmployer,
      professionalTax: a.professionalTax + r.professionalTax, netPay: a.netPay + r.netPay,
    }), { basic: 0, gross: 0, pfEmployee: 0, pfEmployer: 0, esiEmployee: 0, esiEmployer: 0, professionalTax: 0, netPay: 0 });

    const p = periodLabel();
    const payload = {
      schema: "shramsetu.register.v1",
      employer: EMPLOYER,
      period: p,
      employeeCount: rows.length,
      totals,
      employees: rows,
      disclaimer: "Statutory rates are indicative. Verify against current EPFO/ESIC/State notifications before filing.",
    };
    download(`employee-register-${slug(p.label)}.json`, JSON.stringify(payload, null, 2), "application/json");
  });

  $("#export-ecr").addEventListener("click", () => {
    if (!employees.length) { alert("Add at least one employee first."); return; }
    // EPFO ECR-style, tilde (~) separated. Indicative column order only.
    // UAN~Member Name~Gross Wages~EPF Wages~EPS Wages~EDLI Wages~EE PF~EPS~ER PF~NCP Days~Refund
    const lines = employees.map((emp) => {
      const s = computeStatutory(emp);
      const eps = Math.round(s.pfWage * 0.0833);
      const erPf = s.pfEmployer - eps;
      return [
        emp.uan || "000000000000", emp.name, emp.gross, s.pfWage, s.pfWage, s.pfWage,
        s.pfEmployee, eps, erPf < 0 ? 0 : erPf, 0, 0,
      ].join("~");
    });
    showPreview("#preview", lines.join("\n"));
  });

  function showPreview(sel, text) {
    const el = $(sel);
    el.hidden = false;
    el.textContent = text;
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function slug(s) {
    return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "period";
  }

  // ---------- import: CSV -> JSON ----------
  $("#import-file").addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = parseCSV(String(reader.result));
        showPreview("#import-preview", JSON.stringify(parsed, null, 2));
      } catch (err) {
        showPreview("#import-preview", "Could not parse this file: " + err.message);
      }
    };
    reader.readAsText(file);
  });

  // Minimal CSV parser (handles quoted fields, commas, escaped quotes)
  function parseCSV(text) {
    const rows = [];
    let field = "", row = [], inQuotes = false;
    text = text.replace(/^﻿/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i++; }
          else inQuotes = false;
        } else field += c;
      } else if (c === '"') inQuotes = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n") { row.push(field); rows.push(row); field = ""; row = []; }
      else field += c;
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }

    const nonEmpty = rows.filter((r) => r.some((c) => c.trim() !== ""));
    if (!nonEmpty.length) return { schema: "shramsetu.register.v1", employees: [] };
    const headers = nonEmpty[0].map((h) => h.trim());
    const records = nonEmpty.slice(1).map((r) => {
      const obj = {};
      headers.forEach((h, idx) => { obj[normaliseKey(h)] = (r[idx] || "").trim(); });
      // mask any raw Aadhaar that came in via the spreadsheet
      if (obj.aadhaar) obj.aadhaar = maskAadhaar(obj.aadhaar);
      return obj;
    });
    return {
      schema: "shramsetu.register.v1",
      source: "csv-import",
      employer: EMPLOYER,
      employeeCount: records.length,
      employees: records,
    };
  }

  function normaliseKey(h) {
    return h.toLowerCase()
      .replace(/\(.*?\)/g, "")
      .replace(/[^a-z0-9]+/g, " ").trim()
      .replace(/\s+(.)/g, (_, ch) => ch.toUpperCase());
  }

  // ---------- sample data ----------
  $("#seed-btn").addEventListener("click", () => {
    if (employees.length && !confirm("Add sample employees to the current list?")) return;
    const samples = [
      { name: "Ravi Kumar", guardian: "Suresh Kumar", gender: "Male", dob: "1990-06-12", pan: "ABCDE1234F", aadhaar: maskAadhaar("123412341234"), role: "Loader", department: "Operations", doj: "2022-04-01", uan: "100200300400", esiIp: "3100000001", basic: 12000, gross: 18000, bank: "50100123456789", ifsc: "SBIN0001234" },
      { name: "Lakshmi Devi", guardian: "Narsimha", gender: "Female", dob: "1988-02-20", pan: "PQRSX6789L", aadhaar: maskAadhaar("987698769876"), role: "Supervisor", department: "Operations", doj: "2021-07-15", uan: "100200300401", esiIp: "3100000002", basic: 16000, gross: 24000, bank: "50100987654321", ifsc: "HDFC0000456" },
      { name: "Imran Shaikh", guardian: "Abdul Shaikh", gender: "Male", dob: "1995-11-05", pan: "LMNOP1122Q", aadhaar: maskAadhaar("555566667777"), role: "Driver", department: "Transport", doj: "2023-01-10", uan: "100200300402", esiIp: "3100000003", basic: 13500, gross: 20000, bank: "50100111222333", ifsc: "ICIC0000789" },
    ];
    samples.forEach((s) => { s.id = "emp-" + Date.now() + "-" + Math.round(Number(String(s.basic))); employees.push(s); });
    // ensure unique ids even if added in same ms
    const seen = new Set();
    employees.forEach((e, i) => { if (seen.has(e.id)) e.id = e.id + "-" + i; seen.add(e.id); });
    persist();
    render();
    document.getElementById("register").scrollIntoView({ behavior: "smooth" });
  });

  // ---------- init ----------
  // default period = current month
  (function setDefaultPeriod() {
    const el = $("#period-value");
    const now = new Date();
    el.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  })();

  render();
})();
