// Real SAP B1 Service Layer queries, one function per data source the
// portal needs. Every function is isolated and commented with a
// "CONFIRM WITH YOUR SAP B1 / BASIS TEAM" note wherever the mapping
// depends on how *your* SAP B1 is configured (price list numbers, item
// groups, custom fields) rather than something standard across every B1
// install — tune those without touching anything else in this file.
//
// Every query is scoped to an explicit list of item codes where it can be
// (the FGs being costed plus everything in their BOMs), so a costing run
// pulls a few hundred items instead of the whole company item master.

// Item codes per $filter request — keeps the query URL well under the
// length limits of IIS / Service Layer's reverse proxy.
const CODES_PER_REQUEST = 40;

function toIsoDate(d) {
  if (!d) return "";
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d).slice(0, 10);
}

// OData string literal: single quotes are escaped by doubling them
function odataString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function uniqueCodes(codes) {
  return Array.from(new Set((codes || []).map((c) => String(c).trim()).filter(Boolean)));
}

// Runs one paged query per chunk of item codes and concatenates the results.
async function getByCodes(client, path, field, codes, params = {}, extraFilter) {
  const out = [];
  for (const part of chunk(uniqueCodes(codes), CODES_PER_REQUEST)) {
    let filter = "(" + part.map((c) => `${field} eq ${odataString(c)}`).join(" or ") + ")";
    if (extraFilter) filter += ` and ${extraFilter}`;
    const rows = await client.getAllPages(path, { ...params, $filter: filter });
    out.push(...rows);
  }
  return out;
}

// Items master: ItemCode / ItemName / InventoryUOM / LastPurchasePrice.
// LastPurchasePrice is SAP B1's built-in "undated Last Purchase Price"
// (OITM.LastPurPrc) — the exact fallback the brief's §3 describes for a
// BOM line with zero qualifying RATE MASTER candidates.
async function fetchItemsMaster(client, { itemCodes } = {}) {
  const items = await getByCodes(client, "/Items", "ItemCode", itemCodes, {
    $select: "ItemCode,ItemName,ForeignName,InventoryUOM,LastPurchasePrice,ItemsGroupCode",
  });
  const byCode = new Map();
  items.forEach((it) => byCode.set(String(it.ItemCode), it));
  return byCode;
}

// Every item code in the configured Finished Goods item group — used when
// the portal doesn't name specific FGs to cost.
// CONFIRM: B1_FG_ITEM_GROUP_CODE must be the OITB.ItmsGrpCod of your FG group.
async function fetchFgCodesByGroup(client, { fgItemGroupCode }) {
  const items = await client.getAllPages("/Items", {
    $select: "ItemCode",
    $filter: `ItemsGroupCode eq ${Number(fgItemGroupCode)}`,
  });
  return items.map((it) => String(it.ItemCode));
}

// Bill of Materials: SAP B1's native multi-level BOM object. A
// ProductTreeLine's ItemCode can itself be a Production item with its own
// ProductTree (Driver / SPD / LED board) — expandBomTrees() follows those
// links level by level so the dump carries one tab per sub-assembly, which
// is exactly what the portal's recursive resolution expects.
async function fetchProductTrees(client, { treeCodes }) {
  return getByCodes(client, "/ProductTrees", "TreeCode", treeCodes);
}

async function expandBomTrees(client, { fgCodes, maxDepth = 10 }) {
  const trees = new Map(); // TreeCode -> tree, FGs first, then each deeper level
  const queried = new Set();
  let level = uniqueCodes(fgCodes);
  for (let depth = 0; level.length && depth <= maxDepth; depth++) {
    level.forEach((c) => queried.add(c));
    const found = await fetchProductTrees(client, { treeCodes: level });
    const next = new Set();
    found.forEach((tree) => {
      const code = String(tree.TreeCode);
      if (trees.has(code)) return;
      tree.ProductTreeLines = (tree.ProductTreeLines || []).filter(
        (ln) => ln.ItemCode && ln.ItemType !== "pit_Text"
      );
      trees.set(code, tree);
      tree.ProductTreeLines.forEach((ln) => {
        const child = String(ln.ItemCode);
        if (!queried.has(child)) next.add(child);
      });
    });
    level = Array.from(next);
  }
  return Array.from(trees.values());
}

// PriceListRate: from each Item's nested ItemPrices collection, filtered to
// your configured Price List number.
// CONFIRM: standard ItemPrices rows don't carry a per-row "last changed"
// timestamp via Service Layer — PriceUpdateDate below is approximated as
// today's date (the fetch date) until your Basis team points at a real
// source (a B1 change-log table, or a custom UDF that tracks it).
async function fetchPriceListRates(client, { priceListId, itemCodes }) {
  const items = await getByCodes(client, "/Items", "ItemCode", itemCodes, { $select: "ItemCode,ItemPrices" });
  const today = toIsoDate(new Date());
  const rows = [];
  items.forEach((it) => {
    const match = (it.ItemPrices || []).find((p) => String(p.PriceList) === String(priceListId));
    if (match && match.Price != null && match.Price !== 0) {
      rows.push({ itemCode: it.ItemCode, priceListRate: match.Price, priceUpdateDate: today, grpoRate: null, latestGrpoDate: null });
    }
  });
  return rows;
}

// GRPORate / LatestGRPODate: most recent Goods Receipt PO line per item
// within the lookback window. Cancelled GRPOs and their cancellation
// documents are excluded (CancelStatus 'csNo' = neither).
// Service Layer can't filter documents by a line's ItemCode, so this pages
// through every GRPO header+lines in the window and keeps only the codes
// asked for; B1_GRPO_LOOKBACK_DAYS bounds how much that is.
// CONFIRM: line Price is in the document currency — fine for INR-only
// purchasing; imported parts in USD/EUR would need the doc rate applied.
async function fetchGrpoRates(client, { lookbackDays = 400, itemCodes } = {}) {
  const sinceStr = toIsoDate(new Date(Date.now() - lookbackDays * 86400000));
  const docs = await client.getAllPages("/PurchaseDeliveryNotes", {
    $select: "DocEntry,DocDate,DocumentLines",
    $filter: `DocDate ge '${sinceStr}' and CancelStatus eq 'csNo'`,
    $orderby: "DocDate desc,DocEntry desc",
  });
  const latestByItem = new Map(); // itemCode -> { rate, date }
  const wanted = itemCodes ? new Set(uniqueCodes(itemCodes)) : null;
  docs.forEach((doc) => {
    (doc.DocumentLines || []).forEach((line) => {
      const code = String(line.ItemCode);
      if (wanted && !wanted.has(code)) return;
      if (!latestByItem.has(code)) {
        latestByItem.set(code, { rate: line.Price ?? line.UnitPrice, date: toIsoDate(doc.DocDate) });
      }
    });
  });
  return latestByItem;
}

// BP Catalogue / "12NC": the portal's sample BP Catalogue is SAP B1's own
// "Business Partner Catalog Numbers" report (table OSCN — BP Code, BP
// Catalog Number, Item No.), which Service Layer exposes as AlternateCatNum.
// Some installs keep the 12NC in an Item UDF instead — set
// B1_BP_CATALOG_SOURCE=udf and B1_BP_CATALOG_UDF=<field> for that.
// CONFIRM WITH YOUR BASIS TEAM which BP (B1_BP_CATALOG_CARD_CODE) owns the
// 12NC numbers if more than one customer has catalogue entries per item.
async function fetchBpCatalogue(client, { itemCodes, source = "oscn", udfFieldName = "U_12NC", cardCode, itemsMaster }) {
  if (source === "udf") {
    const items = await getByCodes(client, "/Items", "ItemCode", itemCodes, {
      $select: `ItemCode,ItemName,ForeignName,${udfFieldName}`,
    });
    return items.map((it) => ({
      bpCode: "",
      itemNo: it.ItemCode,
      bpCatalogNumber: it[udfFieldName] || "",
      bpCatalogDescription: it.ForeignName || it.ItemName || "",
      itemDescription: it.ItemName || "",
    }));
  }
  const extra = cardCode ? `CardCode eq ${odataString(cardCode)}` : undefined;
  const rows = await getByCodes(client, "/AlternateCatNum", "ItemCode", itemCodes, {}, extra);
  return rows.map((r) => {
    const item = itemsMaster && itemsMaster.get(String(r.ItemCode));
    return {
      bpCode: r.CardCode || "",
      itemNo: r.ItemCode,
      bpCatalogNumber: r.Substitute || r.DisplayBPCatalogNumber || "",
      bpCatalogDescription: r.Description || r.ItemDescription || "",
      itemDescription: item ? item.ItemName || "" : "",
    };
  });
}

// FG Price List / "current PO price": each FG's own price from a
// configured sales/purchase Price List.
// CONFIRM: which Price List number represents "current system FG price" —
// defaults to the same B1_PRICE_LIST_ID used for RATE MASTER unless
// B1_FG_PRICE_LIST_ID is set separately in .env.
async function fetchFgPriceList(client, { priceListId, itemCodes }) {
  const items = await getByCodes(client, "/Items", "ItemCode", itemCodes, { $select: "ItemCode,ItemPrices" });
  const rows = [];
  items.forEach((it) => {
    const match = (it.ItemPrices || []).find((p) => String(p.PriceList) === String(priceListId));
    if (match && match.Price != null) rows.push({ itemNo: it.ItemCode, price: match.Price });
  });
  return rows;
}

module.exports = {
  odataString,
  fetchItemsMaster,
  fetchFgCodesByGroup,
  fetchProductTrees,
  expandBomTrees,
  fetchPriceListRates,
  fetchGrpoRates,
  fetchBpCatalogue,
  fetchFgPriceList,
};
