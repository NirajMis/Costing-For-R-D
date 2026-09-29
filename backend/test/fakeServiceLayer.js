// A tiny stand-in for SAP B1 Service Layer, just enough OData (login
// cookie, $filter "eq ... or ...", Prefer maxpagesize + nextLink paging)
// to exercise the backend's live mode without a real SAP server.
const express = require("express");

const data = {
  Items: [
    { ItemCode: "FG100", ItemName: "TEST Streetlight 100W", ForeignName: "", InventoryUOM: "NOS", LastPurchasePrice: 0, ItemsGroupCode: 101,
      ItemPrices: [{ PriceList: 1, Price: 900 }, { PriceList: 2, Price: 950 }] },
    { ItemCode: "HSG1", ItemName: "TEST Housing", InventoryUOM: "NOS", LastPurchasePrice: 300, ItemsGroupCode: 100, ItemPrices: [{ PriceList: 1, Price: 310 }] },
    { ItemCode: "DRV1", ItemName: "MI_DRVR TEST 100W", InventoryUOM: "NOS", LastPurchasePrice: 0, ItemsGroupCode: 102, ItemPrices: [{ PriceList: 1, Price: 0 }] },
    { ItemCode: "PCB1", ItemName: "TEST Driver PCB", InventoryUOM: "NOS", LastPurchasePrice: 40, ItemsGroupCode: 100, ItemPrices: [] },
    { ItemCode: "O'RING-1", ItemName: "TEST O-Ring", InventoryUOM: "NOS", LastPurchasePrice: 2, ItemsGroupCode: 100, ItemPrices: [{ PriceList: 1, Price: 2.5 }] },
    { ItemCode: "UNRELATED", ItemName: "Not in any BOM", InventoryUOM: "NOS", LastPurchasePrice: 1, ItemsGroupCode: 100, ItemPrices: [{ PriceList: 1, Price: 1 }] },
  ],
  ProductTrees: [
    { TreeCode: "FG100", TreeType: "iProductionTree", ProductTreeLines: [
      { ItemCode: "HSG1", ItemType: "pit_Item", Quantity: 1, Price: 305 },
      { ItemCode: "DRV1", ItemType: "pit_Item", Quantity: 1, Price: 0 },
      { ItemCode: "", ItemType: "pit_Text", Quantity: 0 },
      { ItemCode: "O'RING-1", ItemType: "pit_Item", Quantity: 2, Price: 0 },
    ] },
    { TreeCode: "DRV1", TreeType: "iProductionTree", ProductTreeLines: [
      { ItemCode: "PCB1", ItemType: "pit_Item", Quantity: 1, Price: 0 },
    ] },
    { TreeCode: "OTHER", TreeType: "iProductionTree", ProductTreeLines: [{ ItemCode: "UNRELATED", ItemType: "pit_Item", Quantity: 1 }] },
  ],
  PurchaseDeliveryNotes: [],
  AlternateCatNum: [
    { ItemCode: "FG100", CardCode: "C00086", Substitute: "919600000100", Description: "TEST 12NC desc" },
    { ItemCode: "FG100", CardCode: "C99999", Substitute: "OTHER-CAT", Description: "other BP" },
  ],
};

function daysAgo(n) {
  return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10) + "T00:00:00Z";
}
data.PurchaseDeliveryNotes = [
  { DocEntry: 1, DocDate: daysAgo(30), CancelStatus: "csNo", DocumentLines: [{ ItemCode: "HSG1", Price: 320 }, { ItemCode: "UNRELATED", Price: 5 }] },
  { DocEntry: 2, DocDate: daysAgo(10), CancelStatus: "csNo", DocumentLines: [{ ItemCode: "HSG1", Price: 330 }, { ItemCode: "PCB1", Price: 41 }] },
  { DocEntry: 3, DocDate: daysAgo(5), CancelStatus: "csCancelled", DocumentLines: [{ ItemCode: "HSG1", Price: 999 }] },
  { DocEntry: 4, DocDate: daysAgo(900), CancelStatus: "csNo", DocumentLines: [{ ItemCode: "PCB1", Price: 1 }] },
];

// Parses the filter shapes the backend sends into a row predicate.
function compileFilter(filter) {
  if (!filter) return () => true;
  const clauses = [];
  const re = /(\w+) (eq|ge) (?:'((?:[^']|'')*)'|(\d+))/g;
  let m;
  // Test codes never contain " and ", so a plain split is enough
  filter.split(/\s+and\s+/).forEach((g) => {
    const ors = [];
    while ((m = re.exec(g))) ors.push({ field: m[1], op: m[2], value: m[3] != null ? m[3].replace(/''/g, "'") : Number(m[4]) });
    re.lastIndex = 0;
    if (ors.length) clauses.push(ors);
  });
  return (row) =>
    clauses.every((ors) =>
      ors.some(({ field, op, value }) => {
        const v = row[field];
        if (op === "eq") return String(v) === String(value);
        return String(v) >= String(value);
      })
    );
}

function createFakeServiceLayer() {
  const app = express();
  app.use(express.json());
  const stats = { logins: 0, requests: [] };
  const SESSION = "B1SESSION=fake-session";

  app.post("/b1s/v1/Login", (req, res) => {
    stats.logins++;
    const { CompanyDB, UserName, Password } = req.body || {};
    if (CompanyDB !== "TESTDB" || UserName !== "svc" || Password !== "pw") {
      return res.status(401).json({ error: { code: -304, message: { lang: "en-us", value: "Fail to get DB Credentials from SLD" } } });
    }
    res.setHeader("Set-Cookie", [`${SESSION}; path=/b1s; HttpOnly`, "ROUTEID=.node1; path=/b1s"]);
    res.json({ SessionId: "fake-session", Version: "1000190", SessionTimeout: 30 });
  });
  app.post("/b1s/v1/Logout", (req, res) => res.status(204).end());

  app.get("/b1s/v1/:entity", (req, res) => {
    if (!String(req.headers.cookie || "").includes(SESSION)) {
      return res.status(401).json({ error: { code: 301, message: { value: "Invalid session." } } });
    }
    const rows = data[req.params.entity];
    if (!rows) return res.status(404).json({ error: { code: -1, message: { value: `Resource not found for the segment '${req.params.entity}'` } } });
    stats.requests.push({ entity: req.params.entity, query: req.query });
    let out = rows.filter(compileFilter(req.query.$filter));
    if (req.query.$orderby && req.params.entity === "PurchaseDeliveryNotes") {
      out = out.slice().sort((a, b) => (b.DocDate + b.DocEntry).localeCompare(a.DocDate + a.DocEntry));
    }
    if (req.query.$top) out = out.slice(0, Number(req.query.$top));
    if (req.query.$select) {
      const fields = req.query.$select.split(",");
      out = out.map((r) => Object.fromEntries(fields.filter((f) => f in r).map((f) => [f, r[f]])));
    }
    // Page size 2 regardless of what's asked, to force nextLink paging
    const skip = Number(req.query.$skip) || 0;
    const page = out.slice(skip, skip + 2);
    const body = { value: page };
    if (skip + 2 < out.length) {
      const q = new URLSearchParams({ ...req.query, $skip: String(skip + 2) });
      body["odata.nextLink"] = `${req.params.entity}?${q.toString()}`;
    }
    res.json(body);
  });

  return { app, stats };
}

module.exports = { createFakeServiceLayer };
