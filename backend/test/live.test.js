// End-to-end: backend in live mode against the fake Service Layer, then
// the generated workbooks read back the way the portal reads them.
const test = require("node:test");
const assert = require("node:assert");
const XLSX = require("xlsx");
const { createFakeServiceLayer } = require("./fakeServiceLayer");

let sl, slServer, api, apiServer, base;

test.before(async () => {
  sl = createFakeServiceLayer();
  slServer = await new Promise((resolve) => { const s = sl.app.listen(0, () => resolve(s)); });
  Object.assign(process.env, {
    B1_MOCK_MODE: "false",
    B1_SERVICE_LAYER_URL: `http://127.0.0.1:${slServer.address().port}/b1s/v1`,
    B1_COMPANY_DB: "TESTDB",
    B1_USERNAME: "svc",
    B1_PASSWORD: "pw",
    B1_PRICE_LIST_ID: "1",
    B1_FG_PRICE_LIST_ID: "2",
    B1_BP_CATALOG_SOURCE: "oscn",
    B1_BP_CATALOG_CARD_CODE: "C00086",
    B1_FG_ITEM_GROUP_CODE: "101",
  });
  api = require("../server");
  apiServer = await new Promise((resolve) => { const s = api.app.listen(0, () => resolve(s)); });
  base = `http://127.0.0.1:${apiServer.address().port}/api`;
});

test.after(() => {
  slServer.close();
  apiServer.close();
});

async function getSheets(path) {
  const res = await fetch(base + path);
  assert.strictEqual(res.status, 200, await res.clone().text());
  const wb = XLSX.read(new Uint8Array(await res.arrayBuffer()), { type: "array" });
  return Object.fromEntries(wb.SheetNames.map((n) => [n, XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: "" })]));
}

test("test-connection logs in and reports the company", async () => {
  const res = await fetch(base + "/sap/test-connection");
  const body = await res.json();
  assert.strictEqual(body.ok, true);
  assert.strictEqual(body.companyDB, "TESTDB");
  assert.strictEqual(body.itemsReadable, true);
});

test("BOM dump expands sub-assemblies and skips text lines", async () => {
  const sheets = await getSheets("/bom-dump.xlsx?fgs=FG100");
  assert.deepStrictEqual(Object.keys(sheets), ["FG100", "DRV1"]);
  const fg = sheets.FG100;
  assert.deepStrictEqual(fg[0], ["FG100", "TEST Streetlight 100W", "", "", ""]);
  assert.deepStrictEqual(fg[1], ["No.", "Description", "Quantity", "UoM Name", "Unit Price"]);
  assert.deepStrictEqual(fg.slice(2), [
    ["HSG1", "TEST Housing", 1, "NOS", 305],
    ["DRV1", "MI_DRVR TEST 100W", 1, "NOS", 0],
    ["O'RING-1", "TEST O-Ring", 2, "NOS", 2],
  ]);
  assert.deepStrictEqual(sheets.DRV1.slice(2), [["PCB1", "TEST Driver PCB", 1, "NOS", 40]]);
});

test("price list covers only BOM items, with latest non-cancelled GRPO", async () => {
  const rows = (await getSheets("/price-list.xlsx?fgs=FG100"))["Price List"];
  assert.deepStrictEqual(rows[0], ["ItemCode", "ItemDescription", "GRPORate", "LatestGRPODate", "PriceListRate", "PriceUpdateDate"]);
  const byCode = Object.fromEntries(rows.slice(1).map((r) => [r[0], r]));
  assert.ok(!byCode.UNRELATED, "items outside the BOM are not fetched");
  assert.strictEqual(byCode.HSG1[2], 330);
  assert.strictEqual(byCode.HSG1[4], 310);
  assert.strictEqual(byCode.PCB1[2], 41);
  assert.strictEqual(byCode.PCB1[4], "");
  assert.strictEqual(byCode["O'RING-1"][4], 2.5);
  assert.strictEqual(byCode.FG100[4], 900);
});

test("BP catalogue comes from OSCN, filtered to the configured BP", async () => {
  const rows = (await getSheets("/bp-catalogue.xlsx?fgs=FG100"))["BP Catalogue"];
  assert.deepStrictEqual(rows.slice(1), [["C00086", "919600000100", "TEST 12NC desc", "FG100", "TEST Streetlight 100W"]]);
});

test("FG price list uses the FG price list number", async () => {
  const rows = (await getSheets("/fg-price-list.xlsx?fgs=FG100"))["FG Price List"];
  assert.deepStrictEqual(rows.slice(1), [["FG100", 950]]);
});

test("without fgs, falls back to the FG item group", async () => {
  const sheets = await getSheets("/bom-dump.xlsx");
  assert.deepStrictEqual(Object.keys(sheets), ["FG100", "DRV1"]);
});

test("unknown FG returns a readable 404", async () => {
  const res = await fetch(base + "/bom-dump.xlsx?fgs=NOPE");
  assert.strictEqual(res.status, 404);
  assert.match((await res.json()).error, /No Bill of Materials found in SAP B1 for: NOPE/);
});

test("one login is shared across concurrent requests", () => {
  assert.strictEqual(sl.stats.logins, 1);
});
