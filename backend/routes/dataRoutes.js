const express = require("express");
const builders = require("../src/xlsxBuilders");
const mock = require("../src/mockData");
const assemble = require("../src/assemble");

function sendXlsx(res, workbook, filename) {
  const buffer = builders.workbookToBuffer(workbook);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(buffer);
}

// ?fgs=CODE1,CODE2 — the FGs being costed. `items` is the older name.
function requestedFgs(req) {
  const raw = req.query.fgs || req.query.items;
  return raw ? String(raw).split(",").map((s) => s.trim()).filter(Boolean) : [];
}

// `getClient` is a () => SapB1Client | null — null in mock mode.
function createDataRoutes({ getClient, config }) {
  const router = express.Router();

  router.get("/health", (req, res) => {
    res.json({ ok: true, mockMode: config.mockMode });
  });

  // Logs in to Service Layer and reports what it connected to — the first
  // thing to try after filling in .env. Never returns credentials.
  router.get("/sap/test-connection", async (req, res, next) => {
    if (config.mockMode) return res.json({ ok: true, mockMode: true, message: "Mock mode — SAP B1 is not contacted." });
    try {
      const client = getClient();
      const info = await client.login();
      const sample = await client.get("/Items", { $select: "ItemCode", $top: 1 });
      res.json({
        ok: true,
        mockMode: false,
        companyDB: config.b1.companyDB,
        serviceLayerVersion: info.version || null,
        sessionTimeoutMinutes: info.sessionTimeout,
        itemsReadable: Array.isArray(sample.value),
      });
    } catch (err) {
      next(err);
    }
  });

  // Each data file: mock rows in mock mode, otherwise built from the
  // expanded BOM context for the requested FGs.
  function dataRoute(path, filename, buildMock, buildLive) {
    router.get(path, async (req, res, next) => {
      try {
        if (config.mockMode) return sendXlsx(res, buildMock(), filename);
        const client = getClient();
        const ctx = await assemble.getBomContext(client, config, requestedFgs(req));
        sendXlsx(res, await buildLive(client, ctx), filename);
      } catch (err) {
        next(err);
      }
    });
  }

  dataRoute(
    "/bom-dump.xlsx",
    "SAP BOM Dump.xlsx",
    () => builders.buildBomDumpWorkbook(mock.bomTrees),
    (client, ctx) => {
      if (!ctx.trees.length) {
        const err = new Error(`No Bill of Materials found in SAP B1 for: ${ctx.fgCodes.join(", ")}`);
        err.status = 404;
        throw err;
      }
      return builders.buildBomDumpWorkbook(assemble.assembleBomTrees(ctx));
    }
  );

  dataRoute(
    "/price-list.xlsx",
    "Price List.xlsx",
    () => builders.buildPriceListWorkbook(mock.priceListRows),
    async (client, ctx) => builders.buildPriceListWorkbook(await assemble.assemblePriceListRows(client, config, ctx))
  );

  dataRoute(
    "/bp-catalogue.xlsx",
    "BP Catalogue.xlsx",
    () => builders.buildBpCatalogueWorkbook(mock.bpCatalogueRows),
    async (client, ctx) => builders.buildBpCatalogueWorkbook(await assemble.assembleBpCatalogueRows(client, config, ctx))
  );

  dataRoute(
    "/fg-price-list.xlsx",
    "FG Price List.xlsx",
    () => builders.buildFgPriceListWorkbook(mock.fgPriceListRows),
    async (client, ctx) => builders.buildFgPriceListWorkbook(await assemble.assembleFgPriceListRows(client, config, ctx))
  );

  return router;
}

module.exports = createDataRoutes;
