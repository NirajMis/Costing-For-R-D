(() => {
  "use strict";

  /* ---------------------------------------------------------------
   * Theme
   * ------------------------------------------------------------- */
  const root = document.documentElement;
  const themeBtn = document.getElementById("themeBtn");
  function applyStoredTheme() {
    try {
      const saved = localStorage.getItem("costing-portal-theme");
      if (saved) root.setAttribute("data-theme", saved);
    } catch (e) {}
  }
  applyStoredTheme();
  themeBtn.addEventListener("click", () => {
    const current = root.getAttribute("data-theme") ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = current === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("costing-portal-theme", next); } catch (e) {}
  });

  /* ---------------------------------------------------------------
   * Nav / view switching
   * ------------------------------------------------------------- */
  const titles = {
    dashboard: ["Dashboard", "BOM cost roll-up & pricing overview"],
    newrun: ["New Costing Run", "Upload inputs, fill the Input Sheet, run the engine"],
    history: ["Run History", "Audit trail of every costing run"],
    exceptions: ["Exceptions & Audit", "Flagged lines requiring manual review"],
    ratemaster: ["Rate Master", "Single source of truth for resolved item rates"],
  };
  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".nav-item").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const view = btn.dataset.view;
      document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
      document.getElementById("view-" + view).classList.add("active");
      document.getElementById("topTitle").textContent = titles[view][0];
      document.getElementById("topSub").textContent = titles[view][1];
      document.getElementById("sidebar").classList.remove("open");
    });
  });

  const menuBtn = document.getElementById("menuBtn");
  function syncMenuBtn() {
    menuBtn.style.display = window.innerWidth <= 720 ? "flex" : "none";
  }
  syncMenuBtn();
  window.addEventListener("resize", syncMenuBtn);
  menuBtn.addEventListener("click", () => document.getElementById("sidebar").classList.toggle("open"));

  document.querySelector(".banner-close").addEventListener("click", (e) => {
    e.target.closest(".banner").style.display = "none";
  });

  /* ---------------------------------------------------------------
   * Mock domain data (illustrative — BY080 / BY220P / BRP27)
   * ------------------------------------------------------------- */
  const CATS = [
    { key: "hardware", label: "Hardware", color: "var(--cat-hardware)", pct: 18 },
    { key: "packing", label: "Packing", color: "var(--cat-packing)", pct: 6 },
    { key: "housing", label: "Housing", color: "var(--cat-housing)", pct: 32 },
    { key: "electronics", label: "Electronics", color: "var(--cat-electronics)", pct: 24 },
    { key: "consumables", label: "Consumables", color: "var(--cat-consumables)", pct: 4 },
    { key: "wires", label: "Wires", color: "var(--cat-wires)", pct: 9 },
    { key: "labour", label: "Labour", color: "var(--cat-labour)", pct: 7 },
  ];

  const FG_GP = [
    { fg: "BY080", gp: 33.5 },
    { fg: "BY220P", gp: 29.8 },
    { fg: "BRP27", gp: 38.4 },
  ];

  const MAKE_BUY = [
    { fg: "BY080", make: 62, buy: 38 },
    { fg: "BY220P", make: 55, buy: 45 },
    { fg: "BRP27", make: 70, buy: 30 },
  ];

  const RATE_SOURCES = [
    { label: "PriceListRate", pct: 61, color: "var(--accent)" },
    { label: "GRPORate", pct: 27, color: "var(--accent-2)" },
    { label: "Prior rate (carried)", pct: 6, color: "var(--warn)" },
    { label: "Manual override", pct: 6, color: "var(--cat-electronics)" },
  ];

  const EXCEPTIONS = [
    { code: "UNK-4471", desc: "M4 x 10 SS washer (unmapped prefix)", fg: "BY080", issue: "Uncategorised", date: "2026-09-08", status: "open" },
    { code: "205-9910", desc: "AI driver — MI_DRVR link", fg: "BRP27", issue: "Structure mismatch (AI tab vs embedded)", date: "2026-09-08", status: "open" },
    { code: "10106-221", desc: "LED chip — no GRPO in 365d", fg: "BY220P", issue: "No qualifying rate — prior rate carried", date: "2026-09-08", status: "open" },
    { code: "206-3305", desc: "Driver housing gasket", fg: "BY080", issue: "Outlier discarded (>2x next-highest)", date: "2026-09-07", status: "resolved" },
    { code: "HSG-CAST-11", desc: "Diffuser cover — drill/tap placement", fg: "BRP27", issue: "Casting formula flag ambiguous", date: "2026-09-07", status: "open" },
    { code: "PKG-0098", desc: "Inner carton — marked discontinued", fg: "BY220P", issue: "Inactive line dropped", date: "2026-09-06", status: "resolved" },
    { code: "204-1187", desc: "LED board — LBRD sub-assembly", fg: "BY080", issue: "Recursive link depth check", date: "2026-09-06", status: "open" },
  ];

  const RATE_MASTER = [
    { code: "206-3301", desc: "MI Driver — potted, 36W", rate: "₹412.50", source: "PriceListRate", date: "2026-08-30", vendor: "Vendor A" },
    { code: "204-1187", desc: "LED Board — LBRD, 40 LEDs", rate: "₹268.00", source: "PriceListRate", date: "2026-08-28", vendor: "Vendor C" },
    { code: "10106-221", desc: "LED chip, 1W, 3000K", rate: "₹9.40", source: "Prior rate (carried)", date: "2025-11-02", vendor: "Vendor D" },
    { code: "MI-SPD-02", desc: "SPD module — MI_SPD", rate: "₹96.75", source: "GRPORate", date: "2026-07-19", vendor: "Vendor B" },
    { code: "HSG-CAST-11", desc: "Diffuser cover — ADC12 cast", rate: "₹138.20", source: "Formula (casting)", date: "—", vendor: "In-house" },
    { code: "WIR-0044", desc: "2-core wire, 0.75 sq.mm, per m", rate: "₹6.10", source: "GRPORate", date: "2026-08-02", vendor: "Vendor E" },
    { code: "PKG-0071", desc: "Master carton, 5-ply", rate: "₹22.90", source: "Manual override", date: "2026-09-01", vendor: "Vendor F" },
  ];

  /* ---------------------------------------------------------------
   * Donut chart (BOM cost by category)
   * ------------------------------------------------------------- */
  function renderDonut() {
    const svg = document.getElementById("donutChart");
    const legend = document.getElementById("donutLegend");
    const r = 15.9155;
    let offset = 0;
    let ringHtml = `<circle cx="21" cy="21" r="${r}" fill="none" stroke="var(--surface-2)" stroke-width="6"></circle>`;
    CATS.forEach((c) => {
      const dash = c.pct;
      const gap = 100 - dash;
      ringHtml += `<circle cx="21" cy="21" r="${r}" fill="none" stroke="${c.color}" stroke-width="6"
        stroke-dasharray="${dash} ${gap}" stroke-dashoffset="${25 - offset}" stroke-linecap="butt"></circle>`;
      offset += dash;
    });
    svg.innerHTML = ringHtml;

    legend.innerHTML = CATS.map(
      (c) => `<div class="legend-row">
        <span class="legend-dot" style="background:${c.color}"></span>
        <span class="legend-label">${c.label}</span>
        <span class="legend-val">${c.pct}%</span>
      </div>`
    ).join("");
  }

  /* ---------------------------------------------------------------
   * GP% bar chart with target reference
   * ------------------------------------------------------------- */
  function renderGpBars() {
    const wrap = document.getElementById("gpBars");
    const max = 45;
    wrap.innerHTML = FG_GP.map((row) => {
      const w = Math.min(100, (row.gp / max) * 100);
      const color = row.gp >= 30 ? "var(--success)" : "var(--warn)";
      return `<div class="bar-row">
        <span class="name">${row.fg}</span>
        <div class="bar-track">
          <div class="bar-fill" style="width:${w}%;background:${color}"></div>
          <div style="position:absolute;left:${(30 / max) * 100}%;top:-3px;bottom:-3px;width:2px;background:var(--text-muted);opacity:.5;"></div>
        </div>
        <span class="val">${row.gp}%</span>
      </div>`;
    }).join("");
  }

  function renderMakeBuy() {
    const wrap = document.getElementById("makeBuyBars");
    wrap.innerHTML = MAKE_BUY.map(
      (row) => `<div class="bar-row stacked">
        <span class="name">${row.fg}</span>
        <div class="stacked-track">
          <div class="stacked-seg" style="width:${row.make}%;background:var(--accent)"></div>
          <div class="stacked-seg" style="width:${row.buy}%;background:var(--accent-2)"></div>
        </div>
        <span class="val">${row.make}/${row.buy}</span>
      </div>`
    ).join("");
  }

  function renderSourceBars() {
    const wrap = document.getElementById("sourceBars");
    const max = Math.max(...RATE_SOURCES.map((s) => s.pct));
    wrap.innerHTML = RATE_SOURCES.map((s) => {
      const w = (s.pct / max) * 100;
      return `<div class="bar-row">
        <span class="name">${s.label}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${w}%;background:${s.color}"></div></div>
        <span class="val">${s.pct}%</span>
      </div>`;
    }).join("");
  }

  function statusBadge(status) {
    if (status === "ok") return `<span class="badge ok"><span class="badge-dot"></span>Completed</span>`;
    if (status === "warn") return `<span class="badge warn"><span class="badge-dot"></span>Exceptions</span>`;
    if (status === "resolved") return `<span class="badge ok"><span class="badge-dot"></span>Resolved</span>`;
    if (status === "open") return `<span class="badge danger"><span class="badge-dot"></span>Open</span>`;
    return `<span class="badge danger"><span class="badge-dot"></span>Failed</span>`;
  }

  const HISTORY_KEY = "costing-portal-run-history";
  function loadRunHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); } catch (e) { return []; }
  }
  function saveRunHistory(entries) {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, 300))); } catch (e) {}
  }
  // Called once per completed run — one row per FG so Old vs New costing is
  // directly comparable, and the run date is preserved for validation.
  function recordRunHistory(runData) {
    const entries = loadRunHistory();
    const runAt = new Date().toISOString();
    runData.resultRows.forEach((r) => {
      entries.unshift({
        runAt,
        fg: r.fgCode,
        watt: r.watt,
        oldCosting: r.oldCosting || null,
        oldCostingDate: runData.oldCostingDateDisplay,
        newCosting: Number(r.costingOn.toFixed(2)),
        changeVsOldPct: r.changeVsOldPct,
        diffVsPoPct: r.diffVsPoPct,
        exceptions: runData.runExceptions.filter((e) => e.item === r.fgCode).length,
      });
    });
    saveRunHistory(entries);
    renderHistory();
  }
  document.getElementById("clearHistoryBtn").addEventListener("click", () => {
    saveRunHistory([]);
    renderHistory();
  });
  function renderHistory() {
    const entries = loadRunHistory();
    if (!entries.length) {
      document.getElementById("historyBody").innerHTML =
        `<tr><td colspan="9" style="color:var(--text-muted)">No runs yet — go to New Costing Run and click "Run Costing Engine". Every FG you cost is logged here with its date, so you can validate old vs new costing later.</td></tr>`;
      return;
    }
    document.getElementById("historyBody").innerHTML = entries.map((r) => {
      const runDate = new Date(r.runAt);
      const dateStr = runDate.toLocaleDateString() + " " + runDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const changeBadge = r.changeVsOldPct == null
        ? "—"
        : `<span class="badge ${Math.abs(r.changeVsOldPct) <= 5 ? "ok" : "warn"}">${r.changeVsOldPct.toFixed(1)}%</span>`;
      const diffBadge = r.diffVsPoPct == null ? "—" : `${r.diffVsPoPct.toFixed(1)}%`;
      return `<tr>
        <td>${dateStr}</td>
        <td><strong>${r.fg}</strong></td>
        <td>${r.watt} W</td>
        <td>${r.oldCosting ? "₹" + r.oldCosting.toFixed(2) : "—"}</td>
        <td>${r.oldCostingDate || "—"}</td>
        <td>₹${r.newCosting.toFixed(2)}</td>
        <td>${changeBadge}</td>
        <td>${diffBadge}</td>
        <td>${r.exceptions ? `<span class="badge warn">${r.exceptions}</span>` : `<span class="badge ok">0</span>`}</td>
      </tr>`;
    }).join("");
  }

  function renderExceptions() {
    document.getElementById("exceptionsBody").innerHTML = EXCEPTIONS.map(
      (r) => `<tr>
        <td><strong>${r.code}</strong></td>
        <td>${r.desc}</td>
        <td>${r.fg}</td>
        <td>${r.issue}</td>
        <td>${r.date}</td>
        <td>${statusBadge(r.status)}</td>
      </tr>`
    ).join("");
    document.getElementById("excCount").textContent = EXCEPTIONS.filter((e) => e.status === "open").length;
  }

  function renderRateMaster() {
    document.getElementById("rateMasterBody").innerHTML = RATE_MASTER.map(
      (r) => `<tr>
        <td><strong>${r.code}</strong></td>
        <td>${r.desc}</td>
        <td>${r.rate}</td>
        <td><span class="badge muted">${r.source}</span></td>
        <td>${r.date}</td>
        <td>${r.vendor}</td>
        <td><button class="btn sm ghost" title="Manually pin a different rate (logged)">Override</button></td>
      </tr>`
    ).join("");
  }

  renderDonut();
  renderGpBars();
  renderMakeBuy();
  renderSourceBars();
  renderHistory();
  renderExceptions();
  renderRateMaster();

  /* ---------------------------------------------------------------
   * New Run wizard — Step 1: file dropzones
   * ------------------------------------------------------------- */
  const FILES = [
    { key: "bom", title: "SAP BOM Dump", sub: "One tab per FG + sub-assembly" },
    { key: "price", title: "Price List", sub: "GRPORate / PriceListRate" },
    { key: "bpcat", title: "BP Catalogue", sub: "12NC mapping" },
    { key: "fgprice", title: "FG Price List", sub: "Current system FG price" },
    { key: "input", title: "Input Sheet", sub: "Commodity rates & rules" },
  ];
  const uploaded = {};
  const dzIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`;

  const dzGrid = document.getElementById("dropzoneGrid");
  dzGrid.innerHTML = FILES.map(
    (f) => `<label class="dropzone" id="dz-${f.key}">
      <input type="file" accept=".xlsx,.xls" data-key="${f.key}">
      <div class="dz-icon">${dzIcon}</div>
      <div class="dz-title">${f.title}</div>
      <div class="dz-sub">${f.sub}</div>
      <div class="dz-file" id="dzfile-${f.key}"></div>
    </label>`
  ).join("");

  // Item Master: code -> {subSubGroup, subGroup}. Built in directly (not an
  // upload) — whoever runs the portal doesn't always have this file on hand,
  // so it ships with the tool as item-master-data.js (loaded before this
  // file), a compact [code, subSubGroup, subGroup] array — ~35k real rows.
  // Regenerate that file if the item master changes.
  const itemMasterRows = (typeof ITEM_MASTER_DATA !== "undefined" ? ITEM_MASTER_DATA : []).map(
    ([code, subSubGroup, subGroup]) => ({ code, subSubGroup, subGroup })
  );

  dzGrid.querySelectorAll('input[type="file"]').forEach((input) => {
    input.addEventListener("change", (e) => {
      const key = e.target.dataset.key;
      const file = e.target.files[0];
      if (!file) return;
      const dzFileEl = document.getElementById("dzfile-" + key);
      dzFileEl.textContent = "Reading…";
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = new Uint8Array(ev.target.result);
          const wb = XLSX.read(data, { type: "array", cellDates: false });
          uploaded[key] = { file, wb };
          document.getElementById("dz-" + key).classList.add("filled");
          const kb = (file.size / 1024).toFixed(0);
          dzFileEl.textContent = `✓ ${file.name} (${kb} KB, ${wb.SheetNames.length} tab${wb.SheetNames.length === 1 ? "" : "s"})`;
        } catch (err) {
          dzFileEl.textContent = `✗ Could not parse ${file.name} — is it a valid .xlsx?`;
          document.getElementById("dz-" + key).classList.remove("filled");
        }
      };
      reader.readAsArrayBuffer(file);
    });
  });

  /* ---------------------------------------------------------------
   * Optional: fetch the 4 SAP-sourced files from the backend instead of
   * uploading manually. Populates the SAME `uploaded` map, via the SAME
   * XLSX.read() call, as a manual upload — nothing downstream (the §3
   * engine, workbook generation) knows or cares which path filled it.
   * ------------------------------------------------------------- */
  const SAP_B1_URL_KEY = "costing-portal-sap-b1-backend-url";
  const sapB1UrlInput = document.getElementById("sapB1BackendUrl");
  const sapB1ModeBadge = document.getElementById("sapB1ModeBadge");
  const sapB1Status = document.getElementById("sapB1Status");
  const sapB1FetchBtn = document.getElementById("sapB1FetchBtn");
  try {
    sapB1UrlInput.value = localStorage.getItem(SAP_B1_URL_KEY) || "http://localhost:4000";
  } catch (e) {
    sapB1UrlInput.value = "http://localhost:4000";
  }
  sapB1UrlInput.addEventListener("change", () => {
    try { localStorage.setItem(SAP_B1_URL_KEY, sapB1UrlInput.value.trim()); } catch (e) {}
    checkSapB1Health();
  });

  async function checkSapB1Health() {
    const base = sapB1UrlInput.value.trim().replace(/\/$/, "");
    if (!base) { sapB1ModeBadge.textContent = "no backend URL set"; return; }
    try {
      const res = await fetch(`${base}/api/health`);
      const data = await res.json();
      sapB1ModeBadge.textContent = data.mockMode ? "backend reachable — mock data" : "backend reachable — live SAP B1";
    } catch (e) {
      sapB1ModeBadge.textContent = "backend not reachable";
    }
  }
  checkSapB1Health();

  const SAP_B1_ENDPOINTS = {
    bom: "bom-dump.xlsx",
    price: "price-list.xlsx",
    bpcat: "bp-catalogue.xlsx",
    fgprice: "fg-price-list.xlsx",
  };

  sapB1FetchBtn.addEventListener("click", async () => {
    const base = sapB1UrlInput.value.trim().replace(/\/$/, "");
    if (!base) { sapB1Status.textContent = "Enter the backend URL above first."; return; }
    try { localStorage.setItem(SAP_B1_URL_KEY, base); } catch (e) {}
    sapB1FetchBtn.disabled = true;
    const results = [];
    for (const [key, endpoint] of Object.entries(SAP_B1_ENDPOINTS)) {
      const dzFileEl = document.getElementById("dzfile-" + key);
      dzFileEl.textContent = "Fetching from SAP B1…";
      try {
        const res = await fetch(`${base}/api/${endpoint}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = await res.arrayBuffer();
        const wb = XLSX.read(new Uint8Array(buf), { type: "array", cellDates: false });
        uploaded[key] = { file: { name: endpoint, size: buf.byteLength }, wb };
        document.getElementById("dz-" + key).classList.add("filled");
        dzFileEl.textContent = `✓ Fetched from SAP B1 (${(buf.byteLength / 1024).toFixed(0)} KB, ${wb.SheetNames.length} tab${wb.SheetNames.length === 1 ? "" : "s"})`;
        results.push(true);
      } catch (err) {
        dzFileEl.textContent = `✗ Fetch failed: ${err.message}`;
        document.getElementById("dz-" + key).classList.remove("filled");
        results.push(false);
      }
    }
    sapB1FetchBtn.disabled = false;
    sapB1Status.textContent = results.every(Boolean)
      ? "All 4 files fetched from SAP B1 — Input Sheet (Step 2) still needs your manual entry."
      : "Some fetches failed — check the backend is running and reachable, then retry.";
  });

  /* ---------------------------------------------------------------
   * Wizard step nav
   * ------------------------------------------------------------- */
  function goStep(n) {
    document.querySelectorAll(".wstep").forEach((s) => {
      const sn = Number(s.dataset.step);
      s.classList.toggle("active", sn === n);
      s.classList.toggle("done", sn < n);
    });
    document.querySelectorAll(".wpanel").forEach((p) => p.classList.remove("active"));
    document.getElementById("wpanel-" + n).classList.add("active");
    if (n === 3) buildReview();
  }
  document.getElementById("toStep2").addEventListener("click", () => goStep(2));
  document.getElementById("toStep1").addEventListener("click", () => goStep(1));
  document.getElementById("toStep3").addEventListener("click", () => goStep(3));
  document.getElementById("toStep2b").addEventListener("click", () => goStep(2));
  document.querySelectorAll(".wstep").forEach((s) =>
    s.addEventListener("click", () => goStep(Number(s.dataset.step)))
  );

  /* ---------------------------------------------------------------
   * Step 2: Input Sheet accordion form (sections A–G)
   * ------------------------------------------------------------- */
  const accordionRoot = document.getElementById("accordionRoot");

  function field(label, id, opts = {}) {
    const suffix = opts.suffix ? `<span class="suffix">${opts.suffix}</span>` : "";
    return `<div class="field">
      <label>${label}</label>
      <div class="field-input">
        <input type="${opts.type || "number"}" id="${id}" placeholder="${opts.placeholder || "0"}" value="${opts.value ?? ""}">
        ${suffix}
      </div>
    </div>`;
  }

  accordionRoot.innerHTML = `
    <div class="accordion-item open" data-acc="A">
      <div class="accordion-head">
        <div><h4>A. Commodity Rates</h4><div class="ah-sub">₹/kg — plus melting loss, drilling, tapping &amp; powder coating charges</div></div>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
      <div class="accordion-body">
        <div class="form-grid">
          ${field("ADC12", "adc12", { suffix: "₹/kg", value: 360 })}
          ${field("Extrusion", "extrusion", { suffix: "₹/kg", value: 260 })}
          ${field("PC (Polycarbonate)", "pc", { suffix: "₹/kg", value: 190 })}
          ${field("Kovestro — virgin", "kovVirgin", { suffix: "₹/kg", value: 310 })}
          ${field("Kovestro — opaque", "kovOpaque", { suffix: "₹/kg", value: 285 })}
          ${field("Other commodity 1", "other1", { suffix: "₹/kg" })}
          ${field("Other commodity 2", "other2", { suffix: "₹/kg" })}
          ${field("Other commodity 3", "other3", { suffix: "₹/kg" })}
          ${field("Melting loss", "meltLoss", { suffix: "%", value: 6 })}
          ${field("Drilling charge / hole", "drillCharge", { suffix: "₹", value: 0.35 })}
          ${field("Tapping charge / hole", "tapCharge", { suffix: "₹", value: 0.35 })}
          ${field("Powder coating", "powderCoat", { suffix: "₹/sq in", value: 0.11 })}
        </div>
      </div>
    </div>

    <div class="accordion-item" data-acc="A2">
      <div class="accordion-head">
        <div><h4>A2. Cast / Moulded Parts</h4><div class="ah-sub">One row per part — weight, shot charge, fettling, powder-coat area</div></div>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
      <div class="accordion-body">
        <div class="table-wrap">
          <table class="dyn-table" id="castTable">
            <thead><tr><th>Part Name</th><th>Item Code</th><th>Weight (kg)</th><th>Shot Charge</th><th>Fettling/Grinding</th><th>Sq Inch (powder coat)</th><th>Drill Holes</th><th>Tap Holes</th><th></th></tr></thead>
            <tbody></tbody>
          </table>
        </div>
        <button class="btn sm add-row-btn" id="addCastRow">+ Add Part</button>
      </div>
    </div>

    <div class="accordion-item" data-acc="B">
      <div class="accordion-head">
        <div><h4>B. Wattage</h4><div class="ah-sub">One row per FG code being costed this run — Costing On maps to this FG's wattage row in Section C ("Final" assembly/freight)</div></div>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
      <div class="accordion-body">
        <div class="form-grid" style="margin-bottom:10px;">
          ${field("Old Costing baseline date", "oldCostingDate", { type: "date" })}
        </div>
        <div class="empty-note" style="margin:0 0 10px;">Old Costing below is a fixed snapshot from a previous run — enter it manually per FG. It will never auto-update; only the baseline date above changes the column header.</div>
        <div class="table-wrap">
          <table class="dyn-table" id="wattTable">
            <thead><tr><th>FG Code</th><th>Wattage (W)</th><th>Old Costing (₹)</th><th></th></tr></thead>
            <tbody></tbody>
          </table>
        </div>
        <button class="btn sm add-row-btn" id="addWattRow">+ Add FG</button>
      </div>
    </div>

    <div class="accordion-item" data-acc="C">
      <div class="accordion-head">
        <div><h4>C. Assembly, Testing &amp; Freight Cost</h4><div class="ah-sub">One row per distinct wattage (not per FG) — Freight = transport charge, Destination is optional (shown on the sheet only)</div></div>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
      <div class="accordion-body">
        <div class="table-wrap">
          <table class="dyn-table" id="assyTable">
            <thead><tr><th>Wattage (W)</th><th>Assembly Cost (₹)</th><th>Testing Cost (₹)</th><th>Freight / Transport Cost (₹)</th><th>Destination (optional)</th><th></th></tr></thead>
            <tbody></tbody>
          </table>
        </div>
        <button class="btn sm add-row-btn" id="addAssyRow">+ Add Wattage</button>
      </div>
    </div>

    <div class="accordion-item" data-acc="D">
      <div class="accordion-head">
        <div><h4>D. Profit %</h4><div class="ah-sub">Global percentage, entered as whole number</div></div>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
      <div class="accordion-body">
        <div class="form-grid">${field("Profit %", "profitPct", { suffix: "%", value: 10 })}</div>
      </div>
    </div>

    <div class="accordion-item" data-acc="E">
      <div class="accordion-head">
        <div><h4>E. Driver Assembly Rule</h4><div class="ah-sub">Potted % of AI+MI combined total — engine currently applies this flat, matching real sheets. Non-potted % is captured but not yet wired (open question #3/#4).</div></div>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
      <div class="accordion-body">
        <div class="form-grid">
          ${field("Potted %", "pottedPct", { suffix: "%", value: 15 })}
          ${field("Non-potted %", "nonPottedPct", { suffix: "%", value: 10 })}
        </div>
      </div>
    </div>

    <div class="accordion-item" data-acc="F">
      <div class="accordion-head">
        <div><h4>F. SPD Assembly Rule</h4><div class="ah-sub">% of SPD's own BOM cost</div></div>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
      <div class="accordion-body">
        <div class="form-grid">${field("SPD assembly %", "spdPct", { suffix: "%", value: 15 })}</div>
      </div>
    </div>

    <div class="accordion-item" data-acc="G">
      <div class="accordion-head">
        <div><h4>G. LED Board</h4><div class="ah-sub">SMD mounting cost per LED, testing cost per board</div></div>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
      <div class="accordion-body">
        <div class="form-grid">
          ${field("SMD mounting cost / LED", "smdCost", { suffix: "₹", value: 0.11 })}
          ${field("Testing cost / board", "testCost", { suffix: "₹", value: 1 })}
        </div>
      </div>
    </div>
  `;

  accordionRoot.querySelectorAll(".accordion-head").forEach((head) => {
    head.addEventListener("click", () => head.closest(".accordion-item").classList.toggle("open"));
  });

  /* ---- dynamic rows ---- */
  function dynRow(cells, table) {
    const tr = document.createElement("tr");
    tr.innerHTML = cells.map((c) => `<td><input type="${c.type || 'text'}" placeholder="${c.ph || ''}" value="${c.value ?? ''}" data-col="${c.col}"></td>`).join("") +
      `<td><button class="row-del" title="Remove"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></td>`;
    tr.querySelector(".row-del").addEventListener("click", () => tr.remove());
    table.appendChild(tr);
    return tr;
  }

  const castBody = document.querySelector("#castTable tbody");
  // seed example rows — real BRP277 150W casting data, validated against
  // the sample output (weight/shot/fettle/sqin/drill/tap reproduce ₹691.41
  // and ₹148.226 exactly against Item Codes 20203438 / 20203439)
  function addCastRow(name, code, weight, shot, fettle, sqin, drill, tap) {
    const tr = dynRow(
      [
        { col: "name", ph: "e.g. Housing", value: name || "" },
        { col: "code", ph: "Item code", value: code || "" },
        { col: "weight", type: "number", ph: "kg", value: weight || "" },
        { col: "shot", type: "number", ph: "₹", value: shot || "" },
        { col: "fettle", type: "number", ph: "₹", value: fettle || "" },
        { col: "sqin", type: "number", ph: "sq in", value: sqin || "" },
        { col: "drill", type: "number", ph: "#", value: drill || "" },
        { col: "tap", type: "number", ph: "#", value: tap || "" },
      ],
      castBody
    );
    return tr;
  }
  document.getElementById("addCastRow").addEventListener("click", () => addCastRow());
  addCastRow("CS-45W HOUSING", "20203438", 1.41, 65, 3, 540.5, 37, 37);
  addCastRow("CS-45W LENS PLATE", "20203439", 0.26, 22, 2, 151, 12, 12);

  const wattBody = document.querySelector("#wattTable tbody");
  function addWattRow(fg, w, oldCost) {
    dynRow(
      [
        { col: "fg", ph: "FG code", value: fg || "" },
        { col: "watt", type: "number", ph: "W", value: w || "" },
        { col: "oldcost", type: "number", ph: "₹", value: oldCost || "" },
      ],
      wattBody
    );
  }
  document.getElementById("addWattRow").addEventListener("click", () => addWattRow());
  addWattRow("BY080", 80, 1108.37);
  addWattRow("BY220P", 220, 2271.13);
  addWattRow("30302118", 150, 0);

  const assyBody = document.querySelector("#assyTable tbody");
  function addAssyRow(w, a, t, f, dest) {
    dynRow(
      [
        { col: "watt", type: "number", ph: "W", value: w || "" },
        { col: "assy", type: "number", ph: "₹", value: a || "" },
        { col: "testing", type: "number", ph: "₹", value: t || "" },
        { col: "freight", type: "number", ph: "₹", value: f || "" },
        { col: "dest", type: "text", ph: "e.g. Bhiwandi", value: dest || "" },
      ],
      assyBody
    );
  }
  document.getElementById("addAssyRow").addEventListener("click", () => addAssyRow());
  addAssyRow(80, 45, 4, 18, "Bhiwandi");
  addAssyRow(220, 95, 6, 32, "Bhiwandi");
  addAssyRow(150, 90, 5, 20, "Bhiwandi");

  /* ---------------------------------------------------------------
   * Step 3: review + illustrative run
   * ------------------------------------------------------------- */
  function readRows(table, cols) {
    return Array.from(table.querySelectorAll("tbody tr")).map((tr) => {
      const o = {};
      cols.forEach((c) => (o[c] = tr.querySelector(`[data-col="${c}"]`).value));
      return o;
    });
  }
  function val(id) {
    const el = document.getElementById(id);
    return el ? Number(el.value) || 0 : 0;
  }

  function buildReview() {
    const filesOk = FILES.filter((f) => uploaded[f.key]).length;
    const watts = readRows(wattBody, ["fg", "watt"]).filter((r) => r.fg);
    const profitPct = val("profitPct");
    const rows = [
      ["Files uploaded", `${filesOk} / ${FILES.length}`],
      ["FGs to cost", watts.map((w) => w.fg).join(", ") || "—"],
      ["Profit %", profitPct + "%"],
      ["Driver potted / non-potted", `${val("pottedPct")}% / ${val("nonPottedPct")}%`],
      ["SPD assembly %", val("spdPct") + "%"],
      ["Melting loss", val("meltLoss") + "%"],
    ];
    document.getElementById("reviewBody").innerHTML = rows
      .map((r) => `<tr><td style="color:var(--text-muted)">${r[0]}</td><td><strong>${r[1]}</strong></td></tr>`)
      .join("");
  }

  /* ---------------------------------------------------------------
   * Real .xlsx parsing helpers (SheetJS) — used to read the files
   * the user actually uploaded in Step 1
   * ------------------------------------------------------------- */
  function normHeader(s) {
    return String(s == null ? "" : s).trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  }
  // Robust numeric read from an uploaded cell — real exports sometimes carry
  // a currency prefix or thousands separators (e.g. "INR 148.226", "1,200.50")
  // instead of a plain number; strip everything but digits/./- before parsing.
  function toNum(v) {
    if (typeof v === "number") return v;
    if (v == null || v === "") return 0;
    const cleaned = String(v).replace(/[^0-9.\-]/g, "");
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
  }
  function sheetToMatrix(sheet) {
    return XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: "" });
  }
  function sheetRows(sheet) {
    return XLSX.utils.sheet_to_json(sheet, { raw: true, defval: "" });
  }
  function findKeyIn(obj, normsArr) {
    for (const k of Object.keys(obj)) {
      if (normsArr.includes(normHeader(k))) return obj[k];
    }
    return undefined;
  }
  function colIndexByNorms(headerRow, normsArr) {
    for (let c = 0; c < headerRow.length; c++) {
      if (normsArr.includes(normHeader(headerRow[c]))) return c;
    }
    return -1;
  }
  // Excel serial date OR date string -> JS Date (or null)
  function parseDateCell(v) {
    if (v == null || v === "") return null;
    if (typeof v === "number") {
      const d = new Date(Math.round((v - 25569) * 86400 * 1000));
      return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }

  // RATE MASTER (§3): for every item code in the uploaded Price List, gather
  // every PriceListRate / GRPORate candidate dated within the last 365 days,
  // discard any candidate more than 2x the next-highest survivor as an
  // outlier, and keep the highest rate left standing.
  // OPEN QUESTION carried over from the brief: "PriceListRate preferred over
  // GRPORate" and "highest rate wins" can conflict when GRPORate > PriceListRate.
  // This implementation follows the literal final rule — highest survivor
  // wins regardless of source — flag this for business sign-off if that's wrong.
  function buildRateMaster(priceWb) {
    const now = new Date();
    const byCode = new Map();
    priceWb.SheetNames.forEach((sn) => {
      sheetRows(priceWb.Sheets[sn]).forEach((row) => {
        const code = findKeyIn(row, ["itemcode", "itemno", "no"]);
        if (code == null || code === "") return;
        const key = String(code).trim().toLowerCase();
        const list = byCode.get(key) || [];
        const plRate = findKeyIn(row, ["pricelistrate"]);
        const plDate = parseDateCell(findKeyIn(row, ["priceupdatedate", "pricelistdate"]));
        if (plRate !== undefined && plRate !== "" && plDate) list.push({ rate: toNum(plRate), date: plDate, source: "PriceListRate" });
        const grpoRate = findKeyIn(row, ["grporate"]);
        const grpoDate = parseDateCell(findKeyIn(row, ["latestgrpodate", "grpodate"]));
        if (grpoRate !== undefined && grpoRate !== "" && grpoDate) list.push({ rate: toNum(grpoRate), date: grpoDate, source: "GRPORate" });
        byCode.set(key, list);
      });
    });
    const resolved = new Map();
    byCode.forEach((candidates, key) => {
      let pool = candidates.filter((c) => {
        const ageDays = (now - c.date) / 86400000;
        return ageDays >= 0 && ageDays <= 365 && !isNaN(c.rate) && c.rate > 0;
      });
      pool.sort((a, b) => b.rate - a.rate);
      while (pool.length > 1 && pool[0].rate > 2 * pool[1].rate) pool.shift();
      resolved.set(key, pool.length ? { rate: pool[0].rate, source: pool[0].source, date: pool[0].date } : { rate: null, source: null, date: null });
    });
    return resolved;
  }

  /* ---------------------------------------------------------------
   * §3 rules engine — categorisation, casting formula, and recursive
   * sub-assembly resolution (Driver / SPD / LED board / generic links).
   * A BOM tab can hold more than one "identity + table" block (e.g. a
   * Driver tab combines an MI block and an AI block) — parseBlocks()
   * finds every block generically from the header row's own columns,
   * whichever letters they land on in that particular tab.
   * ------------------------------------------------------------- */
  function findAllHeaderRows(matrix) {
    const rows = [];
    for (let r = 0; r < matrix.length; r++) {
      const row = matrix[r] || [];
      for (let c = 0; c < row.length; c++) {
        if (normHeader(row[c]) === "no") { rows.push(r); break; }
      }
    }
    return rows;
  }
  // sheetName is optional — used only as a fallback identity when a tab has
  // no identity row above its header (some real dumps put the header at
  // row 0 with no code/description row above it at all).
  function parseBlocks(matrix, sheetName) {
    const headerRows = findAllHeaderRows(matrix);
    const blocks = [];
    headerRows.forEach((hr, i) => {
      const headerRow = matrix[hr] || [];
      const noCol = colIndexByNorms(headerRow, ["no"]);
      const descCol = colIndexByNorms(headerRow, ["description"]);
      const qtyCol = colIndexByNorms(headerRow, ["quantity", "qty"]);
      const priceCol = colIndexByNorms(headerRow, ["unitprice", "price"]);
      const uomCol = colIndexByNorms(headerRow, ["uomname", "uom"]);
      const positionCol = colIndexByNorms(headerRow, ["position"]);
      const categoryCol = colIndexByNorms(headerRow, ["category", "type"]);
      if (noCol === -1 || qtyCol === -1 || priceCol === -1) return;
      const identityRow = hr > 0 ? matrix[hr - 1] || [] : [];
      let identityCode = identityRow[noCol];
      let identityDesc = identityRow[descCol];
      const dataStart = hr + 1;
      const dataEnd = i + 1 < headerRows.length ? headerRows[i + 1] - 2 : matrix.length - 1;
      const lines = [];
      for (let r = dataStart; r <= dataEnd; r++) {
        const row = matrix[r];
        if (!row) continue;
        const code = row[noCol];
        if (code === "" || code == null) continue;
        lines.push({
          code, desc: descCol !== -1 ? row[descCol] : "",
          qty: toNum(row[qtyCol]), ownPrice: toNum(row[priceCol]),
          uom: uomCol !== -1 ? row[uomCol] : "", position: positionCol !== -1 ? row[positionCol] : "",
          existingCategory: categoryCol !== -1 ? row[categoryCol] : "",
        });
      }
      // Fallback for a tab with no identity row (single-block tabs only —
      // with more than one header, which block owns the sheet name is
      // ambiguous): use the sheet's own name as the identity code, and
      // borrow a type hint from any line whose own description matches a
      // known sub-assembly naming convention.
      if ((identityCode == null || identityCode === "") && sheetName && headerRows.length === 1) {
        identityCode = sheetName;
        if (!identityDesc) {
          const hint = lines.find((ln) => /^(MI|AI)[-_](DRVR|SPD)/i.test(String(ln.desc || "").trim()) || /^LBRD/i.test(String(ln.desc || "").trim()));
          identityDesc = hint ? hint.desc : "";
        }
      }
      blocks.push({ identityCode, identityDesc: identityDesc || "", headerRow: hr, lines });
    });
    return blocks;
  }
  // Every "identity code" -> {tabName, blocks} across every tab of the BOM
  // Dump, so a BOM line in one tab (e.g. an FG sheet) can be recursively
  // resolved against another tab (Driver / LED board / SPD / any nested link).
  function buildSubAssemblyIndex(bomWb) {
    const index = new Map();
    bomWb.SheetNames.forEach((sn) => {
      const blocks = parseBlocks(sheetToMatrix(bomWb.Sheets[sn]), sn);
      // Every identity found in this tab maps to ALL of that tab's blocks
      // (not just the one it labels) — a Driver tab's MI and AI blocks have
      // different identity codes but are one combined sub-assembly, and
      // must resolve to the same combined total however they're referenced.
      blocks.forEach((b) => {
        if (b.identityCode == null || b.identityCode === "") return;
        const key = String(b.identityCode).trim().toLowerCase();
        index.set(key, { tabName: sn, blocks });
      });
    });
    return index;
  }
  function buildCastPartsIndex() {
    const rows = readRows(castBody, ["name", "code", "weight", "shot", "fettle", "sqin", "drill", "tap"]);
    const map = new Map();
    rows.forEach((r) => {
      if (!r.code) return;
      map.set(String(r.code).trim().toLowerCase(), {
        name: r.name, weight: Number(r.weight) || 0, shot: Number(r.shot) || 0, fettle: Number(r.fettle) || 0,
        sqin: Number(r.sqin) || 0, drill: Number(r.drill) || 0, tap: Number(r.tap) || 0,
      });
    });
    return map;
  }
  // Casting & Moulding formula (§3): weight×material rate (+ melting loss) +
  // shot charge + fettling/grinding, plus drill/tap machining and powder coat.
  function castingCost(part, cfg) {
    const chargeableWeight = part.weight * (1 + cfg.meltLoss / 100);
    const bareCost = chargeableWeight * cfg.adc12;
    const pdcCost = bareCost + part.shot + part.fettle;
    const machiningCost = part.drill * cfg.drillCharge + part.tap * cfg.tapCharge;
    const powderCost = part.sqin * cfg.powderCoat;
    return { total: pdcCost + machiningCost + powderCost, chargeableWeight, bareCost, pdcCost, machiningCost, powderCost };
  }
  // Category heuristic — affects only the sheet's visual grouping, never the
  // final cost number. Trusts an existing Category/Type column on the source
  // row when present, else falls back to keyword matching. Canonical taxonomy
  // is open question #1 (README §3) pending business sign-off.
  const CATEGORY_KEYWORD_RULES = [
    { cat: "Electronics", kws: ["res-chip", "cap.", "cap-", "di-", "ic-", "fet-", "mov-", "gdt-", "fuse", "ind-", "trx-", "sidactor", "pcb", "led-", "lbrd", "drvr", "spd"] },
    { cat: "Consumables", kws: ["solder", "flux", "paste", "coating", "encapsulant", "ipa", "sealant", "glue"] },
    { cat: "Wires", kws: ["wire-", "cable-", "sqmm", "sq.mm"] },
    { cat: "Packing", kws: ["sticker", "carton", "polybag", "poly-paper", "poly paper", "tape", "padding", "label", "stkr"] },
    { cat: "Hardware", kws: ["screw", "bolt", "nut", "washer", "gland", "grommet", "rivet", "ss-"] },
    { cat: "Housing", kws: ["housing", "hsg", "cover", "lens", "gasket", "bracket", "diffuser", "pdc"] },
  ];
  // Aliases a source file's own Category text (e.g. real sheets use
  // "HOUSING"/"ELEC."/"HARDWARE"/"PACKING") onto the same canonical labels
  // the keyword rules produce, so lines from both paths group together
  // instead of splitting into look-alike duplicate buckets.
  const CATEGORY_ALIASES = {
    housing: "Housing", hsg: "Housing",
    elec: "Electronics", electronics: "Electronics", electrical: "Electronics",
    hardware: "Hardware", hw: "Hardware",
    wires: "Wires", wiring: "Wires", wire: "Wires",
    consumables: "Consumables", consumable: "Consumables",
    packing: "Packing", packaging: "Packing",
    labour: "Labour", labor: "Labour",
  };
  function categorize(desc, existingCategory) {
    if (existingCategory && String(existingCategory).trim()) {
      const raw = String(existingCategory).trim();
      const norm = raw.toLowerCase().replace(/\.+$/, "");
      return CATEGORY_ALIASES[norm] || raw;
    }
    const d = String(desc || "").toLowerCase();
    for (const rule of CATEGORY_KEYWORD_RULES) {
      if (rule.kws.some((kw) => d.includes(kw))) return rule.cat;
    }
    return "Uncategorised";
  }
  // Recursively resolve one BOM line's unit price:
  // cast-part formula > linked sub-assembly (itself resolved recursively,
  // Driver/SPD combine every block in the tab, LED board picks the one
  // block whose identity matches) > RATE MASTER > null (caller falls back
  // to the line's own Unit Price from the dump).
  function resolvePrice(code, desc, ctx, visited, depth) {
    const key = String(code).trim().toLowerCase();
    if (ctx.cache.has(key)) return ctx.cache.get(key);
    if (ctx.castIndex.has(key)) {
      const part = ctx.castIndex.get(key);
      const c = castingCost(part, ctx.cfg);
      const result = { price: c.total, source: "CASTING formula", category: "Housing" };
      ctx.cache.set(key, result);
      return result;
    }
    if (depth < 6 && ctx.subIndex.has(key) && !visited.has(key)) {
      visited.add(key);
      const entry = ctx.subIndex.get(key);
      const allBlocks = entry.blocks;
      const normDesc = (s) => String(s || "").toUpperCase().replace(/[\s]/g, "").replace(/_/g, "-");
      const matchedBlock = allBlocks.find((b) => String(b.identityCode).trim().toLowerCase() === key) || allBlocks[0];
      let isDriverFamily = allBlocks.some((b) => /^(MI|AI)-DRVR/.test(normDesc(b.identityDesc)));
      let isSpdFamily = allBlocks.some((b) => /^(MI|AI)-SPD/.test(normDesc(b.identityDesc)));
      let isLedBoard = /^LBRD/.test(normDesc(matchedBlock.identityDesc));
      // Fallback per the README's documented code-prefix convention, for
      // tabs with no identity description to pattern-match at all (e.g. no
      // identity row above the header — see parseBlocks): LED board codes
      // start 204, Driver codes start 206. Only applied when nothing
      // matched by description, so an already-detected SPD tab is untouched.
      if (!isDriverFamily && !isSpdFamily && !isLedBoard) {
        if (/^204/.test(String(matchedBlock.identityCode))) isLedBoard = true;
        else if (/^206/.test(String(matchedBlock.identityCode))) isDriverFamily = true;
      }

      const sumBlock = (block) => {
        // A line referencing a SIBLING block's own identity (e.g. the
        // MI block's placeholder line pointing at the AI block) is a
        // cross-reference, not a real component — that sibling is summed
        // in its own right by the combine step above, so skip it here to
        // avoid double-counting / re-applying the assembly % twice.
        const siblingCodes = new Set(
          allBlocks.filter((b) => b !== block).map((b) => String(b.identityCode).trim().toLowerCase())
        );
        let sum = 0;
        const detail = [];
        block.lines.forEach((ln) => {
          const lnKey = String(ln.code).trim().toLowerCase();
          if (siblingCodes.has(lnKey)) {
            detail.push({ code: ln.code, desc: ln.desc, qty: ln.qty, price: 0, source: "Cross-reference to sibling block (combined separately)" });
            return;
          }
          const resolved = resolvePrice(ln.code, ln.desc, ctx, visited, depth + 1);
          const price = resolved ? resolved.price : ln.ownPrice;
          sum += ln.qty * price;
          detail.push({ code: ln.code, desc: ln.desc, qty: ln.qty, price, source: resolved ? resolved.source : "SAP dump Unit Price" });
        });
        return { sum, detail };
      };

      let price, type, breakdown;
      if (isDriverFamily) {
        const parts = allBlocks.map((b) => ({ block: b, ...sumBlock(b) }));
        const combined = parts.reduce((s, p) => s + p.sum, 0);
        price = combined * (1 + ctx.cfg.driverAssyPct / 100);
        type = "driver";
        breakdown = { blocks: parts, combined, assyPct: ctx.cfg.driverAssyPct, grandTotal: price };
      } else if (isSpdFamily) {
        const own = sumBlock(matchedBlock);
        price = own.sum * (1 + ctx.cfg.spdAssyPct / 100);
        type = "spd";
        breakdown = { blocks: [{ block: matchedBlock, ...own }], combined: own.sum, assyPct: ctx.cfg.spdAssyPct, grandTotal: price };
      } else if (isLedBoard) {
        const own = sumBlock(matchedBlock);
        const ledQty = matchedBlock.lines.length ? matchedBlock.lines[0].qty : 0;
        price = own.sum + ledQty * ctx.cfg.smdCost + ctx.cfg.testCost;
        type = "ledboard";
        breakdown = { blocks: [{ block: matchedBlock, ...own }], combined: own.sum, ledQty, smdCost: ctx.cfg.smdCost, testCost: ctx.cfg.testCost, grandTotal: price };
      } else {
        const matchesAny = allBlocks.some((b) => String(b.identityCode).trim().toLowerCase() === key);
        const parts = (matchesAny ? [matchedBlock] : allBlocks).map((b) => ({ block: b, ...sumBlock(b) }));
        price = parts.reduce((s, p) => s + p.sum, 0);
        type = "generic";
        breakdown = { blocks: parts, combined: price, grandTotal: price };
      }
      visited.delete(key);
      if (!ctx.subAssemblySheets.has(entry.tabName)) {
        ctx.subAssemblySheets.set(entry.tabName, { tabName: entry.tabName, type, breakdown });
      }
      const result = { price, source: `Sub-assembly: ${entry.tabName}`, category: null };
      ctx.cache.set(key, result);
      return result;
    }
    if (ctx.rateMaster) {
      const rm = ctx.rateMaster.get(key);
      if (rm && rm.rate != null) {
        const result = { price: rm.rate, source: rm.source, category: null, date: rm.date };
        ctx.cache.set(key, result);
        return result;
      }
    }
    return null;
  }
  // Process one FG tab into category-grouped, recursively-priced line rows.
  function processFgTab(sheet, ctx, sheetName) {
    const blocks = parseBlocks(sheetToMatrix(sheet), sheetName);
    if (!blocks.length) return null;
    const lineRows = [];
    let bomCost = 0, resolvedCount = 0, fallbackCount = 0;
    blocks.forEach((block) => {
      block.lines.forEach((ln) => {
        const resolved = resolvePrice(ln.code, ln.desc, ctx, new Set(), 0);
        const unitPrice = resolved ? resolved.price : ln.ownPrice;
        const source = resolved ? resolved.source : "SAP dump Unit Price";
        if (source === "SAP dump Unit Price") fallbackCount++; else resolvedCount++;
        const lineTotal = ln.qty * unitPrice;
        bomCost += lineTotal;
        const cat = (resolved && resolved.category) || categorize(ln.desc, ln.existingCategory);
        lineRows.push({
          category: cat, code: ln.code, desc: ln.desc, qty: ln.qty, uom: ln.uom || "NOS", position: ln.position || "",
          unitPrice, total: lineTotal, source,
        });
      });
    });
    return { bomCost, lineRows, lines: lineRows.length, resolvedCount, fallbackCount };
  }
  function findFgSheet(wb, fgCode) {
    if (!wb) return null;
    const target = String(fgCode).trim().toLowerCase();
    let name = wb.SheetNames.find((n) => n.trim().toLowerCase() === target);
    if (!name) name = wb.SheetNames.find((n) => n.trim().toLowerCase().includes(target));
    return name ? wb.Sheets[name] : null;
  }
  function lookupByItemNo(wb, fgCode) {
    if (!wb) return [];
    const target = String(fgCode).trim().toLowerCase();
    const out = [];
    wb.SheetNames.forEach((sn) => {
      sheetRows(wb.Sheets[sn]).forEach((row) => {
        const itemNo = findKeyIn(row, ["itemno", "no", "itemcode"]);
        if (itemNo != null && String(itemNo).trim().toLowerCase() === target) out.push(row);
      });
    });
    return out;
  }
  function todayStamp() {
    const d = new Date();
    return String(d.getDate()).padStart(2, "0") + String(d.getMonth() + 1).padStart(2, "0") + d.getFullYear();
  }
  // "2026-05-30" -> "30.05.26" (matches the team's real header convention)
  function formatDMY(dateStr) {
    if (!dateStr) return null;
    const [y, m, d] = dateStr.split("-");
    if (!y || !m || !d) return null;
    return `${d}.${m}.${y.slice(2)}`;
  }

  /* ---------------------------------------------------------------
   * Run the engine against whatever files + Input Sheet values are
   * currently loaded, and assemble the output workbook
   * ------------------------------------------------------------- */
  const runBtn = document.getElementById("runBtn");
  const progressTrack = document.getElementById("progressTrack");
  const progressFill = document.getElementById("progressFill");
  const runLog = document.getElementById("runLog");
  const resultBlock = document.getElementById("resultBlock");
  let lastWorkbook = null;

  const LOG_STEPS = [
    "Parsing SAP BOM dump — scanning every tab for identity + table blocks…",
    "Resolving RATE MASTER from Price List (PriceListRate/GRPORate, 365-day window, outlier discard)…",
    "Resolving casting formula for Input Sheet §A2 cast parts…",
    "Recursively resolving Driver / SPD / LED board / generic sub-assembly links…",
    "Categorising BOM lines (Housing/Electronics/Hardware/Wires/Consumables/Packing)…",
    "Matching 12NC / description against BP Catalogue…",
    "Matching PO Price against FG Price List…",
    "Applying assembly, testing, freight & profit % (Input Sheet §B–D)…",
    "Building per-FG and per-sub-assembly detail sheets…",
    "Assembling Final Summary, RATE MASTER, Input Sheet & exceptions…",
    "Writing workbook…",
  ];

  function runEngine() {
    // NOTE per business feedback: BP Catalogue's "Item No." column IS the FG
    // code — lookupByItemNo() below matches BP Catalogue / FG Price List rows
    // by exact Item No. == FG code entered in Section B.
    const wattRows = readRows(wattBody, ["fg", "watt", "oldcost"]).filter((r) => r.fg);
    const assyRows = readRows(assyBody, ["watt", "assy", "testing", "freight", "dest"]);
    const profitPct = val("profitPct");
    const stamp = todayStamp();
    const oldCostingDateRaw = document.getElementById("oldCostingDate").value;
    const oldCostingDateDisplay = formatDMY(oldCostingDateRaw) || "date not set";

    const bomWb = uploaded.bom && uploaded.bom.wb;
    const bpWb = uploaded.bpcat && uploaded.bpcat.wb;
    const fgPriceWb = uploaded.fgprice && uploaded.fgprice.wb;
    const priceWb = uploaded.price && uploaded.price.wb;
    const rateMaster = priceWb ? buildRateMaster(priceWb) : null;

    const runExceptions = [];
    const resultRows = [];
    const rateMasterUsage = new Map(); // code -> {code, desc, rate, source, date, usedIn: Set}
    if (!priceWb) {
      runExceptions.push({ item: "(all FGs)", issue: "Price List not uploaded — every BOM line falls back to the SAP dump's own Unit Price (no RATE MASTER resolution)" });
    }

    // §3 engine context: categorisation, casting formula, recursive
    // sub-assembly resolution (Driver/SPD/LED board/generic links).
    const cfg = {
      adc12: val("adc12"), meltLoss: val("meltLoss"), drillCharge: val("drillCharge"),
      tapCharge: val("tapCharge"), powderCoat: val("powderCoat"),
      driverAssyPct: val("pottedPct"), spdAssyPct: val("spdPct"),
      smdCost: val("smdCost"), testCost: val("testCost"),
    };
    const castIndex = buildCastPartsIndex();
    const subIndex = bomWb ? buildSubAssemblyIndex(bomWb) : new Map();
    const ctx = { cfg, castIndex, subIndex, rateMaster, cache: new Map(), subAssemblySheets: new Map() };
    const fgSheetsBuilt = new Map(); // fgCode -> processFgTab() result, for the per-FG detail sheets

    wattRows.forEach((w, idx) => {
      const fgCode = w.fg.trim();
      const wattNum = Number(w.watt) || 0;
      const oldCosting = Number(w.oldcost) || 0;
      const assyMatch = assyRows.find((a) => Number(a.watt) === wattNum);
      const assyCost = assyMatch ? Number(assyMatch.assy) || 0 : 0;
      const testingCost = assyMatch ? Number(assyMatch.testing) || 0 : 0;
      const freight = assyMatch ? Number(assyMatch.freight) || 0 : 0; // Freight = transport charge
      const destination = assyMatch ? (assyMatch.dest || "") : "";
      if (!assyMatch) runExceptions.push({ item: fgCode, issue: `No Section C assembly/testing/freight row for ${wattNum}W` });

      let bomCost = null, bomSourceNote = "", bomTabName = "—", bomLineCount = 0;
      if (bomWb) {
        const sheet = findFgSheet(bomWb, fgCode);
        if (sheet) {
          bomTabName = bomWb.SheetNames.find((n) => bomWb.Sheets[n] === sheet) || "—";
          const r = processFgTab(sheet, ctx, bomTabName);
          if (r) {
            bomCost = r.bomCost;
            bomLineCount = r.lines;
            fgSheetsBuilt.set(fgCode, { tabName: bomTabName, result: r });
            bomSourceNote = priceWb || subIndex.size
              ? `recursive sum of ${r.lines} lines (${r.resolvedCount} priced from RATE MASTER/sub-assembly/casting, ${r.fallbackCount} from dump's own Unit Price)`
              : `recursive sum of ${r.lines} lines (dump's own Unit Price — no Price List uploaded)`;
            if (r.fallbackCount > 0) {
              runExceptions.push({ item: fgCode, issue: `${r.fallbackCount} of ${r.lines} BOM lines had no qualifying Price List rate, cast-part match, or sub-assembly link — used dump's own Unit Price` });
            }
            r.lineRows.forEach((ld) => {
              const key = String(ld.code).trim().toLowerCase();
              if (!rateMasterUsage.has(key)) {
                rateMasterUsage.set(key, { code: ld.code, desc: ld.desc, rate: ld.unitPrice, source: ld.source, date: null, usedIn: new Set() });
              }
              rateMasterUsage.get(key).usedIn.add(fgCode);
            });
          } else {
            runExceptions.push({ item: fgCode, issue: "BOM tab found but no header row with “No.” found" });
          }
        } else {
          runExceptions.push({ item: fgCode, issue: "No matching tab in SAP BOM Dump for this FG code" });
        }
      } else {
        runExceptions.push({ item: fgCode, issue: "SAP BOM Dump not uploaded — BOM cost is an illustrative estimate" });
      }
      const usedFallback = bomCost == null;
      if (usedFallback) bomCost = 480 + wattNum * 3.35;

      let poPrice = 0, itemNo12nc = "—", desc = "(no BP Catalogue match)", bpItemNoMatched = "—", fgPriceItemNoMatched = "—";
      let bpCatalogDesc = "", itemDesc = "";
      if (bpWb) {
        const matches = lookupByItemNo(bpWb, fgCode);
        if (matches.length) {
          itemNo12nc = findKeyIn(matches[0], ["bpcatalognumber", "12nc"]) || "—";
          bpCatalogDesc = findKeyIn(matches[0], ["bpcatalogdescription"]) || "";
          itemDesc = findKeyIn(matches[0], ["itemdescription"]) || "";
          desc = itemDesc || bpCatalogDesc || desc;
          bpItemNoMatched = findKeyIn(matches[0], ["itemno", "no", "itemcode"]) || fgCode;
        } else {
          runExceptions.push({ item: fgCode, issue: "No Item No. match in BP Catalogue" });
        }
      }
      if (fgPriceWb) {
        const matches = lookupByItemNo(fgPriceWb, fgCode);
        if (matches.length) {
          poPrice = toNum(findKeyIn(matches[0], ["price"]));
          fgPriceItemNoMatched = findKeyIn(matches[0], ["itemno", "no", "itemcode"]) || fgCode;
        } else {
          runExceptions.push({ item: fgCode, issue: "No Item No. match in FG Price List" });
        }
      }

      // New Price: the SAME RATE MASTER logic used for BOM component lines
      // (PriceListRate/GRPORate, 365-day window, outlier discard, highest
      // survivor wins) — applied here to the FG's own Item No, so New Price
      // reflects the latest highest-resolved price list rate for the FG itself.
      let newPrice = 0, newPriceSource = null, newPriceDate = null;
      if (rateMaster) {
        const rm = rateMaster.get(String(fgCode).trim().toLowerCase());
        if (rm && rm.rate != null) {
          newPrice = rm.rate;
          newPriceSource = rm.source;
          newPriceDate = rm.date;
          const key = String(fgCode).trim().toLowerCase();
          if (!rateMasterUsage.has(key)) {
            rateMasterUsage.set(key, { code: fgCode, desc: `(FG's own item — New Price) ${desc}`, rate: rm.rate, source: rm.source, date: rm.date, usedIn: new Set() });
          }
          rateMasterUsage.get(key).usedIn.add(fgCode);
        } else {
          runExceptions.push({ item: fgCode, issue: "No qualifying RATE MASTER candidate for this FG's own Item No (no PriceListRate/GRPORate within 365 days) — New Price left at 0" });
        }
      }

      // Matches the FG detail sheet's own Grand Total exactly: Total =
      // BOM+Assembly+Testing, Profit = Total × Profit%, Freight added last —
      // NOT a margin-on-price formula. Kept in lockstep with buildFgDetailSheet.
      const totalBeforeProfit = bomCost + assyCost + testingCost;
      const profitAmount = totalBeforeProfit * (profitPct / 100);
      const costingOn = totalBeforeProfit + profitAmount + freight;
      const changeVsOldPct = oldCosting ? ((costingOn - oldCosting) / oldCosting) * 100 : null;
      const diffVsPoPct = poPrice ? ((costingOn - poPrice) / poPrice) * 100 : null;
      const askVsGivenPct = newPrice && poPrice ? ((newPrice - poPrice) / poPrice) * 100 : null;

      resultRows.push({
        sr: idx + 1, watt: wattNum, fgCode, itemNo12nc, desc, bpCatalogDesc, itemDesc, poPrice, costingOn,
        bomCost, bomSourceNote, bomTabName, bomLineCount, usedFallback, assyCost, testingCost, freight, destination,
        oldCosting, changeVsOldPct, diffVsPoPct, bpItemNoMatched, fgPriceItemNoMatched,
        newPrice, newPriceSource, newPriceDate, askVsGivenPct,
      });
    });

    return {
      resultRows, runExceptions, stamp, profitPct, oldCostingDateDisplay, oldCostingDateRaw, rateMasterUsage,
      fgSheetsBuilt, subAssemblySheets: ctx.subAssemblySheets, cfg, itemMasterRows,
      filesUsed: { bom: !!bomWb, bpcat: !!bpWb, fgprice: !!fgPriceWb, price: !!priceWb, itemmaster: itemMasterRows.length > 0 },
    };
  }

  function buildInputSheetAOA() {
    const castRows = readRows(castBody, ["name", "code", "weight", "shot", "fettle", "sqin", "drill", "tap"]);
    const wattRows = readRows(wattBody, ["fg", "watt", "oldcost"]);
    const assyRows = readRows(assyBody, ["watt", "assy", "testing", "freight", "dest"]);
    const aoa = [];
    aoa.push(["A. COMMODITY RATES"]);
    aoa.push(["ADC12 (₹/kg)", val("adc12")]);
    aoa.push(["Extrusion (₹/kg)", val("extrusion")]);
    aoa.push(["PC (₹/kg)", val("pc")]);
    aoa.push(["Kovestro virgin (₹/kg)", val("kovVirgin")]);
    aoa.push(["Kovestro opaque (₹/kg)", val("kovOpaque")]);
    aoa.push(["Other commodity 1 (₹/kg)", val("other1")]);
    aoa.push(["Other commodity 2 (₹/kg)", val("other2")]);
    aoa.push(["Other commodity 3 (₹/kg)", val("other3")]);
    aoa.push(["Melting loss (%)", val("meltLoss")]);
    aoa.push(["Drilling charge / hole (₹)", val("drillCharge")]);
    aoa.push(["Tapping charge / hole (₹)", val("tapCharge")]);
    aoa.push(["Powder coating (₹/sq in)", val("powderCoat")]);
    aoa.push([]);
    aoa.push(["A2. CAST / MOULDED PARTS"]);
    aoa.push(["Part Name", "Item Code", "Weight (kg)", "Shot Charge", "Fettling/Grinding", "Sq Inch (powder coat)", "Drill Holes", "Tap Holes"]);
    castRows.forEach((r) => aoa.push([r.name, r.code, Number(r.weight) || 0, Number(r.shot) || 0, Number(r.fettle) || 0, Number(r.sqin) || 0, Number(r.drill) || 0, Number(r.tap) || 0]));
    aoa.push([]);
    aoa.push(["B. WATTAGE"]);
    aoa.push(["Old Costing baseline date", document.getElementById("oldCostingDate").value || "(not set)"]);
    aoa.push(["FG Code", "Wattage (W)", "Old Costing (₹)"]);
    wattRows.forEach((r) => aoa.push([r.fg, Number(r.watt) || 0, Number(r.oldcost) || 0]));
    aoa.push([]);
    aoa.push(["C. ASSEMBLY, TESTING & FREIGHT COST (Freight = transport charge)"]);
    aoa.push(["Wattage (W)", "Assembly Cost (₹)", "Testing Cost (₹)", "Freight / Transport Cost (₹)", "Destination"]);
    assyRows.forEach((r) => aoa.push([Number(r.watt) || 0, Number(r.assy) || 0, Number(r.testing) || 0, Number(r.freight) || 0, r.dest || ""]));
    aoa.push([]);
    aoa.push(["D. PROFIT %", val("profitPct")]);
    aoa.push([]);
    aoa.push(["E. DRIVER ASSEMBLY RULE"]);
    aoa.push(["Potted %", val("pottedPct")]);
    aoa.push(["Non-potted %", val("nonPottedPct")]);
    aoa.push([]);
    aoa.push(["F. SPD ASSEMBLY RULE"]);
    aoa.push(["SPD assembly %", val("spdPct")]);
    aoa.push([]);
    aoa.push(["G. LED BOARD"]);
    aoa.push(["SMD mounting cost / LED (₹)", val("smdCost")]);
    aoa.push(["Testing cost / board (₹)", val("testCost")]);
    aoa.push([]);
    aoa.push(["Run date", new Date().toLocaleString()]);
    return aoa;
  }

  const CAT_ORDER = ["Housing", "Electronics", "Hardware", "Wires", "Consumables", "Packing", "Labour", "Uncategorised"];

  // Real cell styling (fills/bold/number formats) — the free build of
  // SheetJS silently drops styles on write, so the output workbook is built
  // with ExcelJS instead (loaded alongside SheetJS; SheetJS still does all
  // the *reading* of uploaded files, unchanged).
  const XL_STYLE = {
    titleFill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF200" } },
    titleFont: { bold: true, size: 12 },
    colHeaderFill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8E8E8" } },
    colHeaderFont: { bold: true },
    boldFont: { bold: true },
    grandFill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF200" } },
  };
  function addSheetName(usedNames, desiredName) {
    let base = String(desiredName).replace(/[\\/?*[\]:]/g, " ").trim().slice(0, 31) || "Sheet";
    let name = base, n = 1;
    while (usedNames.has(name)) { name = (base.slice(0, 27) + "_" + n).slice(0, 31); n++; }
    usedNames.add(name);
    return name;
  }
  // Plain-values sheet (no formulas) from a simple array-of-arrays — used
  // for VALIDATION BACKUP / RATE MASTER / INPUT SHEET / EXCEPTIONS.
  function addAoaSheet(wb, usedNames, name, aoa, opts) {
    const sheetName = addSheetName(usedNames, name);
    const ws = wb.addWorksheet(sheetName);
    aoa.forEach((row, r) => {
      (row || []).forEach((v, c) => {
        if (v !== undefined) ws.getCell(r + 1, c + 1).value = v;
      });
    });
    if (opts && opts.boldHeader && aoa[0]) {
      ws.getRow(1).font = XL_STYLE.colHeaderFont;
      for (let c = 1; c <= aoa[0].length; c++) ws.getCell(1, c).fill = XL_STYLE.colHeaderFill;
    }
    if (opts && opts.colWidths) ws.columns = opts.colWidths.map((w) => ({ width: w }));
    return ws;
  }

  // One detail sheet per FG tab: category-grouped, recursively-priced lines
  // with real SUM formulas, then BOM Cost → Assembly → Testing → Total →
  // Profit → Freight → Grand Total. Matches the team's real per-FG sheet
  // layout exactly (validated against the sample "BRP277 150 S2" sheet).
  // Columns: A=Item Sub Sub Group B=ItemSubgroup (both VLOOKUP'd against the
  // embedded ITEM MASTER sheet when one was uploaded) C=Category (left BLANK
  // — filled in by hand after the run, per business instruction) D=No.
  // E=Description F=Quantity G=UoM Name H=Unit Price I=Position J=Total; a
  // blank subtotal row (Total column only) after each category; then Bom
  // Cost/Assembly/Testing/Total in I/J and Profit/Freight in H/I/J, ending
  // in a yellow-filled Grand total — same as the title block.
  function buildFgDetailSheet(wb, usedNames, fgCode, tabName, processed, extra) {
    const grouped = {};
    processed.lineRows.forEach((r) => { (grouped[r.category] = grouped[r.category] || []).push(r); });
    const orderedCats = CAT_ORDER.filter((c) => grouped[c]).concat(Object.keys(grouped).filter((c) => !CAT_ORDER.includes(c)));

    const sheetName = addSheetName(usedNames, tabName);
    const ws = wb.addWorksheet(sheetName);
    ws.columns = [{ width: 16 }, { width: 14 }, { width: 12 }, { width: 14 }, { width: 42 }, { width: 9 }, { width: 9 }, { width: 11 }, { width: 20 }, { width: 13 }];

    ws.getCell("C1").value = extra.itemNo12nc || "";
    ws.getCell("C2").value = fgCode;
    ws.mergeCells("D1:J1");
    ws.getCell("D1").value = extra.bpCatalogDesc || extra.desc || "";
    ws.mergeCells("D2:J2");
    ws.getCell("D2").value = extra.itemDesc || "";
    ["C1", "C2", "D1", "D2"].forEach((addr) => {
      const cell = ws.getCell(addr);
      cell.fill = XL_STYLE.titleFill;
      cell.font = XL_STYLE.titleFont;
      cell.alignment = { vertical: "middle", horizontal: addr[0] === "C" ? "center" : "left" };
    });

    const headerRowIdx = 4;
    ["Item Sub Sub Group", "ItemSubgroup", "Category", "No.", "Description", "Quantity", "UoM Name", "Unit Price", "Position", "Total"].forEach((h, i) => {
      ws.getCell(headerRowIdx, i + 1).value = h;
    });
    ws.getRow(headerRowIdx).font = XL_STYLE.colHeaderFont;
    for (let c = 1; c <= 10; c++) ws.getCell(headerRowIdx, c).fill = XL_STYLE.colHeaderFill;

    let rowNum = headerRowIdx + 1;
    const subtotalRows = [];
    orderedCats.forEach((cat) => {
      const startRow = rowNum;
      grouped[cat].forEach((r) => {
        if (extra.hasItemMaster) {
          ws.getCell(rowNum, 1).value = { formula: `VLOOKUP(D${rowNum}&"",'${extra.itemMasterSheetName}'!$A:$C,2,0)` };
          ws.getCell(rowNum, 2).value = { formula: `VLOOKUP(D${rowNum}&"",'${extra.itemMasterSheetName}'!$A:$C,3,0)` };
        }
        // Category (col C) intentionally left blank — filled in by hand.
        ws.getCell(rowNum, 4).value = String(r.code);
        ws.getCell(rowNum, 5).value = r.desc;
        ws.getCell(rowNum, 6).value = r.qty;
        ws.getCell(rowNum, 7).value = r.uom || "NOS";
        const priceCell = ws.getCell(rowNum, 8);
        priceCell.value = Number(r.unitPrice.toFixed(4));
        priceCell.numFmt = "#,##0.00";
        ws.getCell(rowNum, 9).value = r.position || "";
        ws.getCell(rowNum, 10).value = { formula: `F${rowNum}*H${rowNum}` };
        rowNum++;
      });
      const endRow = rowNum - 1;
      if (extra.hasItemMaster) {
        ws.getCell(rowNum, 1).value = { formula: `VLOOKUP(D${rowNum}&"",'${extra.itemMasterSheetName}'!$A:$C,2,0)` };
        ws.getCell(rowNum, 2).value = { formula: `VLOOKUP(D${rowNum}&"",'${extra.itemMasterSheetName}'!$A:$C,3,0)` };
      }
      const subCell = ws.getCell(rowNum, 10);
      subCell.value = { formula: `SUM(J${startRow}:J${endRow})` };
      subCell.font = XL_STYLE.boldFont;
      subCell.border = { top: { style: "thin" } };
      subtotalRows.push(rowNum);
      rowNum++;
    });

    rowNum++; // spacer
    const bomCostRow = rowNum;
    ws.getCell(rowNum, 9).value = "Bom Cost";
    ws.getCell(rowNum, 9).font = XL_STYLE.boldFont;
    ws.getCell(rowNum, 10).value = subtotalRows.length ? { formula: `SUM(${subtotalRows.map((r) => `J${r}`).join(",")})` } : 0;
    ws.getCell(rowNum, 10).font = XL_STYLE.boldFont;
    rowNum++;
    const assemblyRow = rowNum;
    ws.getCell(rowNum, 9).value = "Assembly";
    ws.getCell(rowNum, 10).value = extra.assyCost;
    rowNum++;
    const testingRow = rowNum;
    ws.getCell(rowNum, 9).value = "Testing";
    ws.getCell(rowNum, 10).value = extra.testingCost;
    rowNum++;
    const totalRow = rowNum;
    ws.getCell(rowNum, 9).value = "Total";
    ws.getCell(rowNum, 9).font = XL_STYLE.boldFont;
    ws.getCell(rowNum, 10).value = { formula: `SUM(J${bomCostRow},J${assemblyRow},J${testingRow})` };
    ws.getCell(rowNum, 10).font = XL_STYLE.boldFont;
    rowNum++;
    const profitRow = rowNum;
    ws.getCell(rowNum, 8).value = "Profit";
    const profitPctCell = ws.getCell(rowNum, 9);
    profitPctCell.value = extra.profitPct / 100;
    profitPctCell.numFmt = "0%";
    ws.getCell(rowNum, 10).value = { formula: `J${totalRow}*I${rowNum}` };
    rowNum++;
    const freightRow = rowNum;
    ws.getCell(rowNum, 8).value = "Freight";
    ws.getCell(rowNum, 9).value = extra.destination || "";
    ws.getCell(rowNum, 10).value = extra.freight;
    rowNum++;
    const grandRow = rowNum;
    ws.getCell(rowNum, 9).value = "Grand total";
    ws.getCell(rowNum, 10).value = { formula: `SUM(J${totalRow},J${profitRow},J${freightRow})` };
    for (let c = 9; c <= 10; c++) {
      const cell = ws.getCell(rowNum, c);
      cell.fill = XL_STYLE.grandFill;
      cell.font = XL_STYLE.boldFont;
    }

    return { sheetName, grandTotalCellRef: `J${grandRow}` };
  }

  // One sheet per distinct sub-assembly actually used this run (Driver/SPD/
  // LED board/generic link), showing every block it resolved recursively.
  function buildSubAssemblySheet(wb, usedNames, entry) {
    const { tabName, type, breakdown } = entry;
    const sheetName = addSheetName(usedNames, tabName);
    const ws = wb.addWorksheet(sheetName);
    ws.columns = [{ width: 16 }, { width: 42 }, { width: 10 }, { width: 12 }, { width: 14 }];
    ws.getCell("A1").value = tabName;
    ws.getCell("B1").value = type.toUpperCase();
    ws.getCell("A1").fill = XL_STYLE.titleFill;
    ws.getCell("B1").fill = XL_STYLE.titleFill;
    ws.getRow(1).font = XL_STYLE.boldFont;

    let rowNum = 3;
    const blockSubtotalRows = [];
    breakdown.blocks.forEach((p, i) => {
      ws.getCell(rowNum, 1).value = `Block ${i + 1}: ${p.block.identityCode} — ${p.block.identityDesc}`;
      ws.getRow(rowNum).font = XL_STYLE.boldFont;
      rowNum++;
      ["No.", "Description", "Quantity", "Unit Price", "Total"].forEach((h, idx) => {
        ws.getCell(rowNum, idx + 1).value = h;
      });
      ws.getRow(rowNum).font = XL_STYLE.colHeaderFont;
      for (let c = 1; c <= 5; c++) ws.getCell(rowNum, c).fill = XL_STYLE.colHeaderFill;
      rowNum++;
      const startRow = rowNum;
      p.detail.forEach((d) => {
        ws.getCell(rowNum, 1).value = d.code;
        ws.getCell(rowNum, 2).value = d.desc;
        ws.getCell(rowNum, 3).value = d.qty;
        ws.getCell(rowNum, 4).value = Number(d.price.toFixed(4));
        ws.getCell(rowNum, 5).value = { formula: `C${rowNum}*D${rowNum}` };
        rowNum++;
      });
      const endRow = rowNum - 1;
      ws.getCell(rowNum, 1).value = "Block Subtotal";
      ws.getCell(rowNum, 1).font = XL_STYLE.boldFont;
      ws.getCell(rowNum, 5).value = { formula: `SUM(E${startRow}:E${endRow})` };
      ws.getCell(rowNum, 5).font = XL_STYLE.boldFont;
      blockSubtotalRows.push(rowNum);
      rowNum += 2;
    });

    const combinedRow = rowNum;
    ws.getCell(rowNum, 1).value = "Combined BOM";
    ws.getCell(rowNum, 1).font = XL_STYLE.boldFont;
    ws.getCell(rowNum, 5).value = blockSubtotalRows.length ? { formula: `SUM(${blockSubtotalRows.map((r) => `E${r}`).join(",")})` } : 0;
    ws.getCell(rowNum, 5).font = XL_STYLE.boldFont;
    let grandRow = combinedRow;
    if (type === "driver" || type === "spd") {
      rowNum++;
      const assyPctRow = rowNum;
      ws.getCell(rowNum, 1).value = "Assembly %";
      const pctCell = ws.getCell(rowNum, 4);
      pctCell.value = breakdown.assyPct / 100;
      pctCell.numFmt = "0%";
      rowNum++;
      grandRow = rowNum;
      ws.getCell(rowNum, 1).value = "Grand Total";
      ws.getCell(rowNum, 5).value = { formula: `E${combinedRow}*(1+D${assyPctRow})` };
      ws.getRow(rowNum).font = XL_STYLE.boldFont;
      for (let c = 1; c <= 5; c++) ws.getCell(rowNum, c).fill = XL_STYLE.grandFill;
    } else if (type === "ledboard") {
      rowNum++;
      const smdRow = rowNum;
      ws.getCell(rowNum, 1).value = `SMD mounting (${breakdown.ledQty} × ₹${breakdown.smdCost})`;
      ws.getCell(rowNum, 5).value = breakdown.ledQty * breakdown.smdCost;
      rowNum++;
      const testRow = rowNum;
      ws.getCell(rowNum, 1).value = "Testing";
      ws.getCell(rowNum, 5).value = breakdown.testCost;
      rowNum++;
      grandRow = rowNum;
      ws.getCell(rowNum, 1).value = "Grand Total";
      ws.getCell(rowNum, 5).value = { formula: `SUM(E${combinedRow},E${smdRow},E${testRow})` };
      ws.getRow(rowNum).font = XL_STYLE.boldFont;
      for (let c = 1; c <= 5; c++) ws.getCell(rowNum, c).fill = XL_STYLE.grandFill;
    }

    return { sheetName, grandTotalCellRef: `E${grandRow}` };
  }

  function buildOutputWorkbook(runData) {
    const { resultRows, runExceptions, stamp, oldCostingDateDisplay, rateMasterUsage, fgSheetsBuilt, subAssemblySheets, cfg, itemMasterRows } = runData;
    const wb = new ExcelJS.Workbook();
    const usedNames = new Set();

    // ---- ITEM MASTER: full Code / Item Sub Sub Group / ItemSubgroup list
    // (~35k items company-wide), embedded in full every run — no filtering,
    // so a VLOOKUP can never miss a code just because it wasn't guessed as
    // "relevant". Codes are written as text; the VLOOKUP formulas coerce
    // their lookup value to text too (D5&"") so a numeric-looking item code
    // in the BOM dump still matches — Excel does NOT match a number against
    // a text cell by default, which is what caused #N/A across the board. ----
    let itemMasterSheetName = null;
    if (itemMasterRows && itemMasterRows.length) {
      const imAoa = [["Code", "Item Sub Sub Group", "ItemSubgroup"]].concat(
        itemMasterRows.map((r) => [String(r.code), r.subSubGroup, r.subGroup])
      );
      const imWs = addAoaSheet(wb, usedNames, "ITEM MASTER", imAoa, { boldHeader: true, colWidths: [16, 20, 16] });
      imWs.getColumn(1).numFmt = "@"; // force text format so numeric-looking codes aren't reinterpreted as numbers
      itemMasterSheetName = imWs.name;
    }

    // ---- Final Summary (mirrors the team's real sheet + live formulas) ----
    const headerRow = ["Sr", "Wattage (W)", "Item No. (FG Code)", "12NC", "Description", "PO Price",
      "Differential", `New Price ${stamp}`, "Ask vs Given",
      `Costing On ${stamp}`, "Diff. vs PO %", `Old Costing (${oldCostingDateDisplay})`, "Change vs Old Costing %"];
    const wsFinal = addAoaSheet(wb, usedNames, "Final Summary", [headerRow], { boldHeader: true, colWidths: headerRow.map(() => 18) });
    resultRows.forEach((r, i) => {
      const row = i + 2;
      wsFinal.getCell(row, 1).value = r.sr;
      wsFinal.getCell(row, 2).value = r.watt;
      wsFinal.getCell(row, 3).value = r.fgCode;
      wsFinal.getCell(row, 4).value = r.itemNo12nc;
      wsFinal.getCell(row, 5).value = r.desc;
      wsFinal.getCell(row, 6).value = r.poPrice;
      wsFinal.getCell(row, 8).value = Number(r.newPrice.toFixed(2));
      const askCell = wsFinal.getCell(row, 9);
      askCell.value = { formula: `IFERROR((H${row}-F${row})/F${row},"")` };
      askCell.numFmt = "0.0%";
      wsFinal.getCell(row, 10).value = Number(r.costingOn.toFixed(2));
      const diffCell = wsFinal.getCell(row, 11);
      diffCell.value = { formula: `IFERROR((J${row}-F${row})/F${row},"")` };
      diffCell.numFmt = "0.0%";
      wsFinal.getCell(row, 12).value = r.oldCosting || "";
      const chgCell = wsFinal.getCell(row, 13);
      chgCell.value = { formula: `IFERROR((J${row}-L${row})/L${row},"")` };
      chgCell.numFmt = "0.0%";
    });

    // ---- One detail sheet per FG tab + one per distinct sub-assembly used
    // this run (Driver/SPD/LED board/generic), mirroring the team's real
    // per-product sheets — then Final Summary's Costing On column is
    // repointed to live-reference each FG sheet's own Grand Total cell. ----
    const fgSheetNames = new Map(); // fgCode -> {sheetName, cellRef}
    resultRows.forEach((r) => {
      const built = fgSheetsBuilt.get(r.fgCode);
      if (!built) return;
      const { sheetName, grandTotalCellRef } = buildFgDetailSheet(wb, usedNames, r.fgCode, built.tabName, built.result, {
        assyCost: r.assyCost, testingCost: r.testingCost, freight: r.freight, destination: r.destination, profitPct: runData.profitPct,
        itemNo12nc: r.itemNo12nc !== "—" ? r.itemNo12nc : "", bpCatalogDesc: r.bpCatalogDesc, itemDesc: r.itemDesc, desc: r.desc,
        hasItemMaster: !!itemMasterSheetName, itemMasterSheetName,
      });
      fgSheetNames.set(r.fgCode, { sheetName, cellRef: grandTotalCellRef });
    });
    Array.from(subAssemblySheets.values()).forEach((entry) => buildSubAssemblySheet(wb, usedNames, entry));
    resultRows.forEach((r, i) => {
      const linked = fgSheetNames.get(r.fgCode);
      if (!linked) return; // fallback/illustrative rows keep their static number
      const row = i + 2;
      wsFinal.getCell(row, 10).value = { formula: `'${linked.sheetName}'!${linked.cellRef}` };
    });

    // ---- Validation Backup: every intermediate number behind Final Summary,
    // laid out so it can be cross-checked by hand against the source files ----
    const backupHeader = [
      "FG Code", "Wattage (W)", "BOM Dump tab matched", "BOM lines summed", "Flat BOM Cost (Qty×Unit Price)",
      "Assembly Cost", "Testing Cost", "Total (BOM+Assy+Testing)", "Profit %", "Profit Amount", "Freight / Transport Cost", "Destination",
      "Costing On = Total + Profit + Freight", "BP Catalogue Item No. matched", "12NC", "Description",
      "FG Price List Item No. matched", "PO Price", "Diff. vs PO %",
      "New Price (RATE MASTER on FG's own code)", "New Price Source", "New Price Date", "Ask vs Given %",
      "Old Costing", "Change vs Old %", "Notes",
    ];
    const backupAoa = [backupHeader];
    resultRows.forEach((r) => {
      const totalBeforeProfit = r.bomCost + r.assyCost + r.testingCost;
      backupAoa.push([
        r.fgCode, r.watt, r.bomTabName, r.bomLineCount, Number(r.bomCost.toFixed(2)),
        r.assyCost, r.testingCost, Number(totalBeforeProfit.toFixed(2)), runData.profitPct,
        Number((totalBeforeProfit * (runData.profitPct / 100)).toFixed(2)), r.freight, r.destination || "",
        Number(r.costingOn.toFixed(2)), r.bpItemNoMatched, r.itemNo12nc, r.desc,
        r.fgPriceItemNoMatched, r.poPrice,
        r.diffVsPoPct == null ? "" : Number(r.diffVsPoPct.toFixed(1)),
        Number(r.newPrice.toFixed(2)), r.newPriceSource || "no qualifying candidate",
        r.newPriceDate ? r.newPriceDate.toISOString().slice(0, 10) : "—",
        r.askVsGivenPct == null ? "" : Number(r.askVsGivenPct.toFixed(1)),
        r.oldCosting || "",
        r.changeVsOldPct == null ? "" : Number(r.changeVsOldPct.toFixed(1)),
        r.usedFallback ? "BOM cost is an illustrative estimate — no BOM Dump match" : r.bomSourceNote,
      ]);
    });
    addAoaSheet(wb, usedNames, "VALIDATION BACKUP", backupAoa, { boldHeader: true, colWidths: backupHeader.map(() => 20) });

    // ---- RATE MASTER: every item code priced during this run, with the rule
    // and source that resolved it (§3 / §4 single source of truth) ----
    const rmHeader = ["Item Code", "Description", "Resolved Rate", "Source", "Rate Date", "Used In (FG)"];
    const rmRows = Array.from(rateMasterUsage.values()).map((u) => [
      u.code, u.desc, u.rate,
      u.source === "SAP dump Unit Price" ? "SAP dump Unit Price (no Price List match)" : u.source,
      u.date ? u.date.toISOString().slice(0, 10) : "—",
      Array.from(u.usedIn).join(", "),
    ]);
    const rmAoa = [rmHeader].concat(rmRows.length ? rmRows : [["—", "No BOM lines summed this run (upload SAP BOM Dump + Price List)", "", "", "", ""]]);
    addAoaSheet(wb, usedNames, "RATE MASTER", rmAoa, { boldHeader: true, colWidths: rmHeader.map(() => 20) });

    // ---- CASTING: commodity rates + cast part breakdown, live formulas ----
    const castRows = readRows(castBody, ["name", "code", "weight", "shot", "fettle", "sqin", "drill", "tap"]).filter((r) => r.name || r.code);
    if (castRows.length) {
      const castSheetName = addSheetName(usedNames, "CASTING");
      const wsCasting = wb.addWorksheet(castSheetName);
      const castHeader = ["Part Name", "Item Code", "Weight (kg)", "Chargeable Weight (kg)", "Bare Cost", "Shot Charge", "Fettling/Grinding", "PDC Cost", "Drill Holes", "Tap Holes", "Machining Cost", "Sq Inch", "Powder Coat Cost", "Total"];
      wsCasting.getCell(1, 1).value = `ADC12=${cfg.adc12}  MeltLoss=${cfg.meltLoss}%  Drill=${cfg.drillCharge}  Tap=${cfg.tapCharge}  PowderCoat=${cfg.powderCoat}`;
      wsCasting.getCell(1, 1).font = XL_STYLE.boldFont;
      castHeader.forEach((h, i) => { wsCasting.getCell(2, i + 1).value = h; });
      wsCasting.getRow(2).font = XL_STYLE.colHeaderFont;
      for (let c = 1; c <= castHeader.length; c++) wsCasting.getCell(2, c).fill = XL_STYLE.colHeaderFill;
      castRows.forEach((r, i) => {
        const row = i + 3;
        wsCasting.getCell(row, 1).value = r.name;
        wsCasting.getCell(row, 2).value = r.code;
        wsCasting.getCell(row, 3).value = Number(r.weight) || 0;
        wsCasting.getCell(row, 4).value = { formula: `C${row}*(1+${cfg.meltLoss}/100)` };
        wsCasting.getCell(row, 5).value = { formula: `D${row}*${cfg.adc12}` };
        wsCasting.getCell(row, 6).value = Number(r.shot) || 0;
        wsCasting.getCell(row, 7).value = Number(r.fettle) || 0;
        wsCasting.getCell(row, 8).value = { formula: `SUM(E${row},F${row},G${row})` };
        wsCasting.getCell(row, 9).value = Number(r.drill) || 0;
        wsCasting.getCell(row, 10).value = Number(r.tap) || 0;
        wsCasting.getCell(row, 11).value = { formula: `I${row}*${cfg.drillCharge}+J${row}*${cfg.tapCharge}` };
        wsCasting.getCell(row, 12).value = Number(r.sqin) || 0;
        wsCasting.getCell(row, 13).value = { formula: `L${row}*${cfg.powderCoat}` };
        wsCasting.getCell(row, 14).value = { formula: `SUM(H${row},K${row},M${row})` };
      });
      wsCasting.columns = castHeader.map(() => ({ width: 15 }));
    }

    // ---- Input Sheet (everything submitted for this run) ----
    addAoaSheet(wb, usedNames, "INPUT SHEET", buildInputSheetAOA());

    // ---- Exceptions ----
    const excAoa = [["Item / FG", "Issue"]].concat(
      runExceptions.length ? runExceptions.map((e) => [e.item, e.issue]) : [["—", "No exceptions flagged this run"]]
    );
    addAoaSheet(wb, usedNames, "EXCEPTIONS", excAoa, { boldHeader: true, colWidths: [24, 60] });

    // ---- Raw copies of every uploaded file's tabs (so nothing you fed in is lost) ----
    const prefixes = { bom: "BOM", price: "PRICE", bpcat: "BPCAT", fgprice: "FGPRICE", input: "INPUTFILE" };
    Object.keys(uploaded).forEach((key) => {
      const entry = uploaded[key];
      if (!entry || !entry.wb) return;
      entry.wb.SheetNames.forEach((sn) => {
        const matrix = XLSX.utils.sheet_to_json(entry.wb.Sheets[sn], { header: 1, raw: true, defval: "" });
        const sheetName = addSheetName(usedNames, `${prefixes[key] || key}_${sn}`);
        const wsRaw = wb.addWorksheet(sheetName);
        matrix.forEach((row, r) => {
          row.forEach((v, c) => { if (v !== "") wsRaw.getCell(r + 1, c + 1).value = v; });
        });
      });
    });

    lastWorkbook = wb;
    return wb;
  }

  // ExcelJS writes asynchronously — this triggers the actual browser download.
  async function downloadWorkbook(wb, filename) {
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function renderResultsTable(runData) {
    const { resultRows, stamp, filesUsed, oldCostingDateDisplay } = runData;
    document.getElementById("newPriceHead").textContent = `New Price ${stamp}`;
    document.getElementById("costingHead").textContent = `Costing On ${stamp}`;
    document.getElementById("oldCostingHead").textContent = `Old Costing (${oldCostingDateDisplay})`;

    const rowsHtml = resultRows.map((r) => {
      return `<tr>
        <td>${r.sr}</td>
        <td>${r.watt} W</td>
        <td><strong>${r.fgCode}</strong></td>
        <td>${r.itemNo12nc}</td>
        <td>${r.desc}</td>
        <td>₹${r.poPrice.toFixed(2)}</td>
        <td>₹${r.newPrice.toFixed(2)}${r.newPriceSource ? "" : " *"}</td>
        <td>₹${r.costingOn.toFixed(2)}${r.usedFallback ? " *" : ""}</td>
        <td>${r.diffVsPoPct == null ? "—" : `<span class="badge ${Math.abs(r.diffVsPoPct) <= 5 ? "ok" : "warn"}">${r.diffVsPoPct.toFixed(1)}%</span>`}</td>
        <td>${r.oldCosting ? "₹" + r.oldCosting.toFixed(2) : "—"}</td>
        <td>${r.changeVsOldPct == null ? "—" : `<span class="badge ${Math.abs(r.changeVsOldPct) <= 5 ? "ok" : "warn"}">${r.changeVsOldPct.toFixed(1)}%</span>`}</td>
      </tr>`;
    }).join("");
    document.getElementById("resultBody").innerHTML = rowsHtml ||
      `<tr><td colspan="11" style="color:var(--text-muted)">No FG rows entered in section B.</td></tr>`;

    const heroTitle = document.getElementById("resultHeroTitle");
    const heroSub = document.getElementById("resultHeroSub");
    heroTitle.textContent = "Run complete — workbook ready";
    heroSub.textContent = filesUsed.bom
      ? "BOM cost resolved recursively per FG tab — cast parts, Driver/SPD/LED board links, and RATE MASTER prices all applied."
      : "SAP BOM Dump wasn't uploaded, so BOM cost below is an illustrative estimate (marked *).";

    document.getElementById("resultNote").textContent =
      `BOM Cost: ${filesUsed.bom ? "recursively resolved per line — cast-part lines use the CASTING formula (Input Sheet §A2), lines linking to a Driver/SPD/LED-board tab are resolved via that sub-assembly's own formula, everything else uses RATE MASTER (or the dump's own Unit Price as fallback). Lines are grouped into Housing/Electronics/Hardware/Wires/Consumables/Packing on each FG's own detail sheet." : "no BOM Dump uploaded, using illustrative placeholder (marked *)."} ` +
      `12NC / Description: ${filesUsed.bpcat ? "matched from BP Catalogue — its Item No. column is the FG code." : "BP Catalogue not uploaded."} ` +
      `PO Price: ${filesUsed.fgprice ? "matched from FG Price List by exact Item No." : "FG Price List not uploaded."} ` +
      `New Price: resolved the same way as every BOM line — highest of PriceListRate/GRPORate within 365 days (outliers discarded), applied to the FG's own Item No. Shows ₹0.00 (marked *) only when the Price List has no qualifying candidate for that code. ` +
      `Item Sub Sub Group / ItemSubgroup: ${filesUsed.itemmaster ? "real VLOOKUP formulas on each FG detail sheet against the built-in ITEM MASTER sheet — blank/subtotal rows correctly show #N/A, same as your real sheets." : "the built-in Item Master list is empty (ITEM_MASTER_DATA in app.js) — those two columns are left blank until it's filled in."} Category is always left blank for manual entry. ` +
      `Old Costing comes from what you entered in Section B (baseline date above) — it is a fixed snapshot, never recalculated. Full per-FG working is in the VALIDATION BACKUP sheet, and each FG/sub-assembly gets its own detail sheet, in the downloaded workbook for manual cross-check.`;

    const excWrap = document.getElementById("runExceptionsWrap");
    const excBody = document.getElementById("runExceptionsBody");
    if (runData.runExceptions.length) {
      excWrap.style.display = "block";
      excBody.innerHTML = runData.runExceptions.map((e) => `<tr><td>${e.item}</td><td>${e.issue}</td></tr>`).join("");
    } else {
      excWrap.style.display = "none";
    }
  }

  document.getElementById("downloadBtn").addEventListener("click", () => {
    if (!lastWorkbook) return;
    downloadWorkbook(lastWorkbook, `Costing_Run_${todayStamp()}.xlsx`);
  });

  runBtn.addEventListener("click", () => {
    runBtn.disabled = true;
    progressTrack.style.display = "block";
    runLog.style.display = "block";
    runLog.innerHTML = "";
    resultBlock.style.display = "none";
    let i = 0;
    progressFill.style.width = "0%";
    const timer = setInterval(() => {
      if (i < LOG_STEPS.length) {
        const line = document.createElement("div");
        line.className = "ok-line";
        line.textContent = "✓ " + LOG_STEPS[i];
        runLog.appendChild(line);
        runLog.scrollTop = runLog.scrollHeight;
        i++;
        progressFill.style.width = Math.round((i / LOG_STEPS.length) * 100) + "%";
      } else {
        clearInterval(timer);
        runBtn.disabled = false;
        (async () => {
          try {
            const runData = runEngine();
            renderResultsTable(runData);
            buildOutputWorkbook(runData);
            recordRunHistory(runData);
            resultBlock.style.display = "block";
            resultBlock.scrollIntoView({ behavior: "smooth", block: "nearest" });
            await downloadWorkbook(lastWorkbook, `Costing_Run_${runData.stamp}.xlsx`);
          } catch (err) {
            const line = document.createElement("div");
            line.style.color = "var(--danger)";
            line.textContent = "✗ Error: " + err.message;
            runLog.appendChild(line);
          }
        })();
      }
    }, 220);
  });
})();
