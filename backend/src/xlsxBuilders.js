const XLSX = require("xlsx");

// These four builders produce workbooks byte-for-byte in the shape the
// portal's app.js already parses (see findAllHeaderRows / parseBlocks /
// lookupByItemNo there) — nothing about that frontend parsing logic
// changes; only where the bytes come from (SAP B1 instead of a manual
// upload) is new.

function safeSheetName(name) {
  const base = String(name || "Sheet").replace(/[\\/?*[\]:]/g, " ").trim().slice(0, 31);
  return base || "Sheet";
}

// SAP BOM Dump shape: one tab per FG/sub-assembly.
// Row1 = identity (code, description), Row2 = header, then data rows with
// columns No. / Description / Quantity / UoM Name / Unit Price — exactly
// what findAllHeaderRows()/parseBlocks() in app.js scans for.
// `trees` = [{ code, description, lines: [{ code, description, quantity, uom, unitPrice }] }]
function buildBomDumpWorkbook(trees) {
  const wb = XLSX.utils.book_new();
  const usedNames = new Set();
  trees.forEach((tree) => {
    const rows = [
      [tree.code, tree.description || ""],
      ["No.", "Description", "Quantity", "UoM Name", "Unit Price"],
    ];
    tree.lines.forEach((ln) => {
      rows.push([ln.code, ln.description || "", ln.quantity, ln.uom || "NOS", ln.unitPrice]);
    });
    let name = safeSheetName(tree.sheetName || tree.code);
    let n = 1;
    while (usedNames.has(name)) { name = safeSheetName(`${name}_${n}`); n++; }
    usedNames.add(name);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), name);
  });
  return wb;
}

// Price List shape: ItemCode, ItemDescription, GRPORate, LatestGRPODate, PriceListRate, PriceUpdateDate
// `rows` = [{ itemCode, itemDescription, grpoRate, latestGrpoDate, priceListRate, priceUpdateDate }]
function buildPriceListWorkbook(rows) {
  const header = ["ItemCode", "ItemDescription", "GRPORate", "LatestGRPODate", "PriceListRate", "PriceUpdateDate"];
  const aoa = [header].concat(
    rows.map((r) => [
      r.itemCode, r.itemDescription || "", r.grpoRate ?? "", r.latestGrpoDate || "", r.priceListRate ?? "", r.priceUpdateDate || "",
    ])
  );
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), "Price List");
  return wb;
}

// BP Catalogue shape: BP Code, BP Catalog Number, BP Catalog Description, Item No., Item Description
// `rows` = [{ bpCode, itemNo, bpCatalogNumber, bpCatalogDescription, itemDescription }]
function buildBpCatalogueWorkbook(rows) {
  const header = ["BP Code", "BP Catalog Number", "BP Catalog Description", "Item No.", "Item Description"];
  const aoa = [header].concat(
    rows.map((r) => [r.bpCode || "", r.bpCatalogNumber, r.bpCatalogDescription, r.itemNo, r.itemDescription])
  );
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), "BP Catalogue");
  return wb;
}

// FG Price List shape: Item No., Price
// `rows` = [{ itemNo, price }]
function buildFgPriceListWorkbook(rows) {
  const header = ["Item No.", "Price"];
  const aoa = [header].concat(rows.map((r) => [r.itemNo, r.price]));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), "FG Price List");
  return wb;
}

function workbookToBuffer(wb) {
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

module.exports = {
  buildBomDumpWorkbook,
  buildPriceListWorkbook,
  buildBpCatalogueWorkbook,
  buildFgPriceListWorkbook,
  workbookToBuffer,
};
