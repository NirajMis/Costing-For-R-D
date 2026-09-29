// Combines the raw SAP B1 query results into the row shapes xlsxBuilders.js
// expects. Kept separate from sapB1Queries.js so the "what does B1 return"
// code and the "how do we combine it" code don't get tangled together.
const queries = require("./sapB1Queries");

// The portal fetches its 4 files one after another for the same FGs; each
// needs the same expanded BOM (to know which item codes to price), so it is
// built once and reused for a few minutes.
const CONTEXT_TTL_MS = 5 * 60 * 1000;
const contextCache = new Map();

async function resolveFgCodes(client, config, requested) {
  const codes = (requested || []).map((c) => String(c).trim()).filter(Boolean);
  if (codes.length) return Array.from(new Set(codes));
  if (config.fgItemGroupCode) return queries.fetchFgCodesByGroup(client, { fgItemGroupCode: config.fgItemGroupCode });
  const err = new Error(
    "No FG codes given. Enter the FG codes to cost in the portal (or call with ?fgs=CODE1,CODE2), or set B1_FG_ITEM_GROUP_CODE to fetch every finished good."
  );
  err.status = 400;
  throw err;
}

// { fgCodes, trees, itemsMaster, allCodes } for one set of FGs: the FGs,
// every sub-assembly under them, and every component code they use.
function getBomContext(client, config, requestedFgs) {
  const key = (requestedFgs || []).map((c) => String(c).trim()).filter(Boolean).sort().join(",");
  const hit = contextCache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.promise;
  const promise = (async () => {
    const fgCodes = await resolveFgCodes(client, config, requestedFgs);
    const trees = await queries.expandBomTrees(client, { fgCodes });
    const codes = new Set(fgCodes);
    trees.forEach((t) => {
      codes.add(String(t.TreeCode));
      t.ProductTreeLines.forEach((ln) => codes.add(String(ln.ItemCode)));
    });
    const allCodes = Array.from(codes);
    const itemsMaster = await queries.fetchItemsMaster(client, { itemCodes: allCodes });
    return { fgCodes, trees, itemsMaster, allCodes };
  })();
  contextCache.set(key, { promise, expiresAt: Date.now() + CONTEXT_TTL_MS });
  promise.catch(() => contextCache.delete(key));
  return promise;
}

function clearContextCache() {
  contextCache.clear();
}

function assembleBomTrees(ctx) {
  return ctx.trees.map((tree) => {
    const self = ctx.itemsMaster.get(String(tree.TreeCode));
    return {
      code: tree.TreeCode,
      sheetName: tree.TreeCode,
      description: self ? self.ItemName : "",
      lines: tree.ProductTreeLines.map((line) => {
        const comp = ctx.itemsMaster.get(String(line.ItemCode));
        // The BOM line's own price (what SAP's BOM screen shows under Unit
        // Price), falling back to the item's Last Purchase Price — RATE
        // MASTER resolution on the portal side takes over from here.
        const linePrice = Number(line.Price) || 0;
        return {
          code: line.ItemCode,
          description: comp ? comp.ItemName : "",
          quantity: line.Quantity,
          uom: comp && comp.InventoryUOM ? comp.InventoryUOM : "NOS",
          unitPrice: linePrice || (comp ? comp.LastPurchasePrice || 0 : 0),
        };
      }),
    };
  });
}

async function assemblePriceListRows(client, config, ctx) {
  const [plRows, grpoMap] = await Promise.all([
    queries.fetchPriceListRates(client, { priceListId: config.priceListId, itemCodes: ctx.allCodes }),
    queries.fetchGrpoRates(client, { lookbackDays: config.grpoLookbackDays, itemCodes: ctx.allCodes }),
  ]);
  const byCode = new Map(plRows.map((r) => [String(r.itemCode), r]));
  grpoMap.forEach((v, code) => {
    const existing = byCode.get(code) || { itemCode: code, priceListRate: null, priceUpdateDate: null };
    existing.grpoRate = v.rate;
    existing.latestGrpoDate = v.date;
    byCode.set(code, existing);
  });
  return Array.from(byCode.values()).map((r) => {
    const item = ctx.itemsMaster.get(String(r.itemCode));
    return { ...r, itemDescription: item ? item.ItemName : "" };
  });
}

function assembleBpCatalogueRows(client, config, ctx) {
  return queries.fetchBpCatalogue(client, {
    itemCodes: ctx.fgCodes,
    source: config.bpCatalogSource,
    udfFieldName: config.bpCatalogUdf,
    cardCode: config.bpCatalogCardCode,
    itemsMaster: ctx.itemsMaster,
  });
}

function assembleFgPriceListRows(client, config, ctx) {
  return queries.fetchFgPriceList(client, {
    priceListId: config.fgPriceListId || config.priceListId,
    itemCodes: ctx.fgCodes,
  });
}

module.exports = {
  getBomContext,
  clearContextCache,
  assembleBomTrees,
  assemblePriceListRows,
  assembleBpCatalogueRows,
  assembleFgPriceListRows,
};
