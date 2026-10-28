import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { compileTypeScript } from "../support/typescript.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
test("prepared data declarations preserve opaque handles and Full/Basic lifecycle boundaries", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-prepared-data-"));
  try {
    const file = path.join(directory, "consumer.mts");
    await writeFile(file, `
import { chart, prepareDataUpdate, type PreparedDataUpdate, type DataSource } from ${JSON.stringify(path.join(root, "types/index.js"))};
import { chart as basic, prepareDataUpdate as prepareBasic } from ${JSON.stringify(path.join(root, "types/basic.js"))};
const full = chart(), small = basic(), host = { requestToken: "latest" };
const rows = await prepareDataUpdate(full, { kind: "create", id: "rows", keyField: "id",
  source: { kind: "inline", values: [{ id: "a", value: 2 }] } }, host);
full.applyDataUpdate({ prepared: rows, requestToken: "latest" });
const initial = await prepareBasic(small, { kind: "create", id: "rows", source: {
  kind: "named", name: "table", format: "csv", parse: { date: { type: "date", timeZone: "UTC" } }
} }, { ...host, resolveNamed: ({ name, signal }) => ({ text: "date\\n2024-01-01", encoding: "utf-8", mimeType: "text/csv" }) });
small.applyDataUpdate({ prepared: initial, requestToken: "latest" }).createCanvas();
const update = await prepareDataUpdate(full, { kind: "revise", target: "rows", id: "next", rowMap: [0, null] }, host);
full.applyDataUpdate({ prepared: update, requestToken: "latest" });
const parameter = await prepareDataUpdate(full, { kind: "parameter", target: "region", value: "north" }, host);
full.applyDataUpdate({ prepared: parameter, requestToken: "latest" });
await prepareDataUpdate(full, { kind: "create", id: "external", source: { kind: "url", url: "/data.json", format: "json" } }, {
  ...host, baseURL: "https://example.test/", signal: new AbortController().signal,
  load: async ({ url }) => ({ bytes: new TextEncoder().encode("[]"), encoding: "utf-8", mimeType: "application/json" })
});
// @ts-expect-error opaque evidence cannot be constructed
const forged: PreparedDataUpdate = { kind: "data-update", request: { kind: "parameter", target: "p" } };
// @ts-expect-error descriptor cannot be mutated
rows.request.id = "changed";
// @ts-expect-error Basic applies create preparations only
small.applyDataUpdate({ prepared: update, requestToken: "latest" });
// @ts-expect-error Basic cannot prepare an edit
await prepareBasic(small, { kind: "parameter", target: "p", value: 2 }, host);
// @ts-expect-error application-owned current token is required
full.applyDataUpdate({ prepared: rows });
// @ts-expect-error use an explicit child instead of scoped dispatch
full.applyDataUpdate({ prepared: rows, requestToken: "latest", target: { child: "left" } });
// @ts-expect-error host token is required
await prepareDataUpdate(full, { kind: "parameter", target: "p", value: 2 }, {});
// @ts-expect-error creation needs an explicit ID
await prepareDataUpdate(full, { kind: "create", source: { kind: "inline", values: [] } }, host);
// @ts-expect-error field and tuple key modes are exclusive
await prepareDataUpdate(full, { kind: "create", id: "rows", keyField: "id", keyFields: ["id"], source: { kind: "inline", values: [] } }, host);
// @ts-expect-error explicit key arrays are not a prepared source policy
await prepareDataUpdate(full, { kind: "create", id: "rows", keys: [], source: { kind: "inline", values: [] } }, host);
// @ts-expect-error text and rows are exclusive
const both: DataSource = { kind: "inline", text: "[]", values: [], format: "json" };
// @ts-expect-error source rows cannot contain executable values
const executable: DataSource = { kind: "inline", values: [{ fn: () => 1 }] };
// @ts-expect-error dates require explicit zone
const date: DataSource = { kind: "inline", values: [], parse: { date: { type: "date" } } };
// @ts-expect-error delimiter is CSV-only
const json: DataSource = { kind: "url", url: "https://example.test/", format: "json", delimiter: "," };
// @ts-expect-error source response requires exact encoding
await prepareBasic(small, { kind: "create", id: "rows", source: { kind: "url", url: "https://example.test/", format: "csv" } }, { ...host, load: () => ({ text: "x", mimeType: "text/csv", encoding: "latin1" }) });
`);
    const result = compileTypeScript(["--noEmit", "--strict", "--exactOptionalPropertyTypes", "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", file]);
    assert.equal(result.status, 0, result.stdout + result.stderr);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
