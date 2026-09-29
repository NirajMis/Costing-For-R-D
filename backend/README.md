# Costing Portal backend — SAP Business One bridge

Fetches BOM, Price List, BP Catalogue, and FG Price List from SAP Business
One's Service Layer and serves each as an `.xlsx` file **in the exact shape
the portal's `app.js` already parses** — so nothing about the frontend
engine (categorisation, RATE MASTER, recursive sub-assembly resolution)
needed to change. The portal's "Fetch from SAP B1" button calls this server
instead of you uploading files by hand.

Ships in **mock mode by default** — it returns a small, clearly-fake demo
dataset, so you can test the whole pipeline (backend → xlsx → portal →
downloaded workbook) right now, before SAP B1 Service Layer access exists.

## Quick start (mock mode — no SAP B1 needed)

```
cd backend
npm install
npm start
```

Server starts on `http://localhost:4000`. Open the portal (`index.html`),
go to **New Costing Run**, and in the "Fetch from SAP Business One" card
enter `http://localhost:4000` and click the fetch button — it fills all 4
dropzones with the mock data. This proves the plumbing works end-to-end.

## What a live fetch pulls from SAP B1

The portal sends the FG codes being costed (typed in the SAP card, or taken
from Step 2's Section B wattage table) as `?fgs=CODE1,CODE2`. For those FGs
the backend:

1. Reads each FG's Bill of Materials (`ProductTrees`) and follows every
   line that is itself a BOM (Driver, SPD, LED board, ...) level by level,
   so the dump has one tab per FG and per sub-assembly.
2. Reads the Item master (`Items`) for just the codes in those BOMs:
   description, inventory UoM, Last Purchase Price.
3. Price List: `PriceListRate` from `B1_PRICE_LIST_ID`, and `GRPORate` /
   `LatestGRPODate` from the most recent non-cancelled Goods Receipt PO
   (`PurchaseDeliveryNotes`) within `B1_GRPO_LOOKBACK_DAYS`.
4. BP Catalogue: 12NC from Business Partner Catalog Numbers (OSCN,
   `AlternateCatNum`), or an Item UDF with `B1_BP_CATALOG_SOURCE=udf`.
5. FG Price List: the FG's price in `B1_FG_PRICE_LIST_ID`.

The expanded BOM is cached for 5 minutes, so the portal's 4 downloads for
the same FGs only walk the BOM once. With no `fgs`, every item in
`B1_FG_ITEM_GROUP_CODE` is costed.

## Tests

`npm test` runs the backend in live mode against a small fake Service
Layer (`test/fakeServiceLayer.js`) and checks every generated workbook:
sub-assembly expansion, OData paging, quoting of codes like `O'RING`,
GRPO selection, and the single shared login.

## Going live against real SAP B1

1. **Confirm Service Layer is reachable.** Ask your Basis/IT team for:
   - The Service Layer URL, e.g. `https://sap-server:50000/b1s/v1`
   - The exact CompanyDB name
   - A **dedicated service account** (not a personal login) — read-only
     scoped where SAP B1's authorization model allows it
2. Copy `.env.example` to `.env` and fill in `B1_SERVICE_LAYER_URL`,
   `B1_COMPANY_DB`, `B1_USERNAME`, `B1_PASSWORD`.
3. Set `B1_MOCK_MODE=false`.
4. Fill in the **business-specific mapping** values in `.env` — these are
   assumptions until validated against your actual SAP B1 setup:
   - `B1_PRICE_LIST_ID` — which Price List number is "PriceListRate"
   - `B1_FG_ITEM_GROUP_CODE` — which Item Group identifies finished goods (only used when the portal sends no FG codes)
   - `B1_BP_CATALOG_SOURCE` — `oscn` (default; BP Catalog Numbers, which is
     what the sample `bp cat.xlsx` is) or `udf` with `B1_BP_CATALOG_UDF`
   - `B1_BP_CATALOG_CARD_CODE` — the customer BP whose catalogue numbers
     are the 12NC, if more than one BP has entries
5. Restart (`npm start`) and open `GET /api/sap/test-connection` — it logs
   in and reports the company DB and Service Layer version, or SAP's own
   error message. Then try `GET /api/bom-dump.xlsx?fgs=<one real FG code>`
   and inspect the output before running a full costing pass.

Every business-specific assumption is marked with a
`CONFIRM WITH YOUR SAP B1 / BASIS TEAM` comment in `src/sapB1Queries.js` —
that file is the one place you or your SAP partner will need to tune.

## Deploying (cloud + VPN, per your setup)

This server needs **network access to your SAP B1 Service Layer** — since
you're hosting it on cloud (Azure/AWS) rather than on-prem next to SAP B1,
your IT team will need to set up a VPN or private link from the cloud VM/
container to the SAP B1 host, and firewall the Service Layer port (default
`50000`) so only this backend can reach it. That network setup is outside
what this codebase can configure — it's an infrastructure step your IT/
Basis team owns.

Once deployed, set `CORS_ORIGINS` in `.env` to the actual URL the portal
(`index.html`) is served from, so the browser is allowed to call this API.

## Endpoints

| Endpoint | Returns |
|---|---|
| `GET /api/health` | `{ ok, mockMode }` |
| `GET /api/sap/test-connection` | Logs in to Service Layer, returns `{ ok, companyDB, serviceLayerVersion }` |
| `GET /api/bom-dump.xlsx?fgs=A,B` | SAP BOM Dump workbook (one tab per FG/sub-assembly) |
| `GET /api/price-list.xlsx` | Price List (ItemCode/GRPORate/LatestGRPODate/PriceListRate/PriceUpdateDate) |
| `GET /api/bp-catalogue.xlsx` | BP Catalogue (Item No./BP Catalog Number/BP Catalog Description/Item Description) |
| `GET /api/fg-price-list.xlsx` | FG Price List (Item No./Price) |

The Input Sheet (commodity rates, cast parts, wattage, assembly rules) is
**not** fetched from SAP B1 — it stays a manual form in the portal, since
it's business logic the costing team enters per run, not ERP master data.

## Files

```
backend/
  server.js              Express app entry, config from .env
  routes/dataRoutes.js    The 4 endpoints above
  src/sapB1Client.js      Session-managed Service Layer HTTP client
  src/sapB1Queries.js     Real B1 queries — the business-specific tuning lives here
  src/assemble.js         Combines raw B1 query results into portal-shaped rows
  src/xlsxBuilders.js     Builds .xlsx files matching app.js's parser exactly
  src/mockData.js         Small fake dataset used when B1_MOCK_MODE=true
  test/                   Live-mode tests against a fake Service Layer
```
