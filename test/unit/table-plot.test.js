import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import test from "node:test";
import assert from "node:assert/strict";
import { chart, hconcat, prepareFontResource, prepareTextMetrics } from "../../src/index.js";
import { chart as basic } from "../../src/basic.js";
import { ChartProgram } from "../../src/ChartProgram.js";
import { getMarkItems, inspectProgram } from "../../src/inspection.js";
import { exportAccessibleData } from "../../src/accessibility.js";
import { serializeProgram, deserializeProgram, serializeGraphic, deserializeGraphic } from "../../src/persistence.js";
import { createInteractionSession } from "../../src/interaction.js";
const rows = [{ id: "a", name: "Same", amount: 4, group: "X", trend: [{ x: 0, y: 1 }, { x: 1, y: 3 }] },
  { id: "b", name: "Same", amount: 8, group: "Y", trend: [{ x: 0, y: 3 }, { x: 1, y: 2 }] }];
const columns = ["name", { field: "amount", align: "right", footer: "sum", cell: "bar" },
  { field: "trend", cell: { type: "sparkline", x: "x", y: "y" } }];
const base = () => chart().createCanvas({ width: 440, height: 240, margin: 20 }).createData({ id: "d", values: rows, keyField: "id" });
const build = patch => base().createTablePlot({ columns, ...patch });
const items = p => getMarkItems(p, { target: "table" });
const graphics = p => p.graphicSpec.objects.table.children.flatMap(id => p.graphicSpec.objects[id].items);
test("Table shortest Full call preserves header, body and footer cell identities", () => {
  const p = build();
  assert.equal(basic().createTablePlot, undefined);
  assert.equal(items(p).length, 12); assert.equal(new Set(items(p).map(item => item.key)).size, 12);
  assert.equal(inspectProgram(p).views[0].logicalDataItems, 12);
  assert.deepEqual(items(p).filter(item => item.channels.role === "body").map(item => item.fields.id), ["a", "a", "a", "b", "b", "b"]);
  assert.equal(items(p).find(item => item.channels.role === "footer" && item.channels.value === 12).channels.inputRows, 2);
  assert.ok(p.graphicSpec.objects.table.children.every(id => p.graphicSpec.objects[id].clip.width > 0));
});
test("Table row sort and column reorder retain exact cell keys and source rows", () => {
  const p = build(), before = serializeProgram(p), keys = new Set(items(p).map(item => item.key));
  const sorted = p.editTablePlot({ sortBy: [{ field: "amount", order: "descending" }], columns: [columns[2], columns[0], columns[1]] });
  assert.deepEqual(new Set(items(sorted).map(item => item.key)), keys);
  assert.equal(items(sorted).find(item => item.channels.role === "body").fields.id, "b");
  assert.deepEqual(sorted.semanticSpec.datasets[0].values, p.semanticSpec.datasets[0].values);
  assert.equal(serializeProgram(p), before);
  assert.equal(p.editTablePlot({ rowLimit: 1 }).graphicSpec.objects.table.items[0].properties.text, "1 of 2 rows shown");
});
test("Table revisions, Canvas size and editable or graphic-only restore preserve clipped cells", () => {
  const p = build(), original = items(p).filter(item => item.channels.role === "body").map(item => item.key);
  const next = p.reviseData({ source: "d", id: "next", values: [...rows].reverse().map(row => ({ ...row, amount: row.amount * 2 })) }).editCanvas({ width: 640 });
  assert.deepEqual(items(next).filter(item => item.channels.role === "body").map(item => item.key), [...original.slice(3), ...original.slice(0, 3)]);
  assert.equal(items(next).find(item => item.channels.role === "footer" && item.channels.value === 24).channels.usedRows, 2);
  assert.equal(graphics(next)[0].identity.lineage.revision, 1);
  assert.deepEqual(deserializeProgram(serializeProgram(next)).graphicSpec, next.graphicSpec);
  assert.deepEqual(deserializeGraphic(serializeGraphic(next)).graphicSpec, next.graphicSpec);
});
test("Table highlight transforms cell graphics inside their own clip and preserves labels and notice", () => {
  const p = build({ rowLimit: 1 }), notice = p.graphicSpec.objects.table.items;
  const next = p.selectMarks({ id: "s", target: "table", field: "id", op: "eq", value: "a" })
    .highlightMarks({ selection: "s", fill: "#ef4444", stroke: "#000000", strokeWidth: 2, dimOthers: { opacity: .2 }, bringToFront: true });
  const selected = items(next).filter(item => item.fields.id === "a");
  assert.equal(selected.length, 3); assert.ok(selected.every(item => item.properties.fill === "#ef4444"));
  assert.ok(graphics(next).filter(graphic => graphic.identity.role === "label").every(graphic => graphic.properties.stroke === undefined));
  assert.deepEqual(next.graphicSpec.objects.table.items, notice);
  const resized = next.editCanvas({ width: 600 });
  assert.ok(items(resized).filter(item => item.fields.id === "a").every(item => item.properties.fill === "#ef4444"));
  assert.deepEqual(next.removeMarkHighlight({ selection: "s" }).graphicSpec, p.graphicSpec);
});
test("Table actual hit returns the same typed row and column item and excludes neighboring cell overflow", () => {
  const p = build(), body = items(p).find(item => item.channels.role === "body");
  const session = createInteractionSession({ program: p });
  session.dispatch({ type: "inspect", point: { x: body.properties.x + 5, y: body.properties.y + 10 } });
  assert.equal(session.getState().hit.target.ownerId, "table"); assert.equal(session.getState().hit.target.itemKey, body.key);
  session.destroy();
});
test("Table accessible cells preserve full text, omitted source count, sparkline values and footer evidence", () => {
  const p = build({ rowLimit: 1 }), view = exportAccessibleData(p, { target: "table" }).views[0];
  assert.equal(view.rows.length, 9);
  assert.ok(view.rows.every(row => row.values["table:sourceRowCount"] === 2));
  assert.ok(view.rows.some(row => Array.isArray(row.values["table:value"])));
  assert.ok(view.rows.some(row => row.values["table:value"] === 12 && row.values["table:inputRows"] === 2));
});
test("Table color, legend and theme reuse native scale and appearance owners", () => {
  const p = build({ color: "group" }).editCanvas({ width: 600, margin: { left: 20, top: 20, bottom: 20, right: 120 } }).createLegend();
  assert.equal(p.semanticSpec.guides.legend.color.scale, "table-color");
  const next = p.editTablePlot({ color: { field: "amount", fieldType: "quantitative" } });
  const body = items(next).filter(item => item.channels.role === "body");
  assert.notEqual(body[0].properties.fill, body[3].properties.fill);
  const plain = build(), dark = plain.applyTheme({ theme: "dark" });
  assert.notEqual(graphics(dark)[0].properties.fill, graphics(plain)[0].properties.fill);
  assert.deepEqual(dark.removeTheme().graphicSpec, plain.graphicSpec);
});
test("Table filtering and removal reconcile named cell subtrees without stale objects", () => {
  const p = build(), next = p.filterMarks({ target: "table", field: "amount", op: "gt", value: 4 });
  assert.equal(items(next).filter(item => item.channels.role === "body").length, 3);
  assert.equal(next.graphicSpec.objects.table.children.length, 9);
  const removed = next.removeMark({ target: "table" });
  assert.equal(removed.graphicSpec.objects.table, undefined);
  assert.equal(Object.keys(removed.graphicSpec.objects).some(id => id.startsWith("table-cell-")), false);
});
test("Table invalid final candidates reject before any state-changing child", () => {
  const calls = [];
  class Capturing extends ChartProgram {
    editSemantic(args) { calls.push(args); return super.editSemantic(args); }
    createGraphics(args) { calls.push(args); return super.createGraphics(args); }
    editGraphics(args) { calls.push(args); return super.editGraphics(args); }
  }
  for (const patch of [{ columns: [] }, { columns: ["missing"] }, { rowHeight: 200 }, { labels: { fontSize: 100 } }, { columns: [{ field: "amount", width: 1000 }] }, { rowLimit: -1 }]) {
    calls.length = 0; assert.throws(() => new Capturing({ ...base() }).createTablePlot({ columns, ...patch })); assert.deepEqual(calls, []);
  }
  const p = build(), before = serializeProgram(p);
  assert.throws(() => new Capturing({ ...p }).editTablePlot({ rowHeight: 500 })); assert.deepEqual(calls, []);
  assert.equal(serializeProgram(p), before);
});

test("Table nested targets and facets keep local clipped cell owners through source revisions", () => {
  const p = build();
  const facets = p.facet({ field: "group" });
  assert.deepEqual(Object.values(facets.children).map(child => items(child).filter(item => item.channels.role === "body").length), [3,3]);
  const joined = hconcat({ programs: [{ id: "left", program: p }, { id: "right", program: p }] });
  const next = joined.editTablePlot({ target: { childPath: ["left"], id: "table" }, rowLimit: 1 });
  assert.equal(next.children.left.graphicSpec.objects.table.items[0].properties.text, "1 of 2 rows shown");
  assert.equal(next.children.right.graphicSpec.objects.table.items.length, 0);
  assert.deepEqual(deserializeProgram(serializeProgram(next)).graphicSpec, next.graphicSpec);
  const revised = facets.reviseData({ source: "d", id: "next", values: rows.map(row => ({ ...row, amount: 3 })) });
  assert.ok(Object.values(revised.children).every(child => items(child).some(item => item.channels.role === "footer" && item.channels.value === 3)));
});
test("Table empty inputs, zero visible rows and explicit no-header preserve source counts and footer policy", () => {
  const empty = chart().createCanvas().createData({ id: "d", values: [] }).createTablePlot({ columns: [{ field: "a", footer: { op: "sum", empty: "identity" } }], header: false });
  assert.equal(items(empty).length, 1); assert.equal(items(empty)[0].channels.value, 0);
  const hidden = build({ rowLimit: 0, header: false });
  assert.equal(items(hidden).length, 3);
  assert.ok(items(hidden).every(item => item.channels.role === "footer"));
  assert.equal(hidden.graphicSpec.objects.table.items[0].properties.text, "0 of 2 rows shown");
  assert.equal(items(hidden).find(item => item.channels.value === 12).channels.inputRows, 2);
});
test("Table long visible text is clipped without changing accessible full values or typed column identity", () => {
  const p = chart().createCanvas({ width: 220, height: 180, margin: 20 }).createData({ id: "d", values: [{ id: 1, name: "A long specimen name" }], keyField: "id" })
    .createTablePlot({ columns: [{ key: 1, field: "name", width: 90 }, { key: "1", field: "name", width: 90 }] });
  const body = items(p).filter(item => item.channels.role === "body");
  assert.equal(new Set(body.map(item => item.key)).size, 2);
  assert.ok(body.every(item => item.channels.text === "A long specimen name" && item.channels.truncated));
  assert.ok(graphics(p).filter(item => item.identity.lineage.rowKeys.length && item.type === "text").every(item => item.properties.text.endsWith("…")));
});

test("Table exact font preparation covers wrapped text, bands and notices and rejects unprepared edits before children", async () => {
  const bytes = new Uint8Array(readFileSync(new URL("../fixtures/fonts/metric-fixture.ttf", import.meta.url)));
  const family = "ggaction Metric Fixture", requestToken = "table-font";
  const decode = value => Object.fromEntries(["contentHash", "family", "style", "weight", "metricsProviderVersion"].map(key => [key,value[key]]));
  const measure = ({asset,queries}) => ({contentHash:asset.contentHash,metricsProviderVersion:asset.metricsProviderVersion,
    widths:queries.map(query=>[...query.text].reduce((n,char)=>n+(char === "A" ? .6 : char === "B" ? .8 : .25)*query.fontSize,0))});
  let p = chart().createCanvas({width:200,height:200,margin:20}).createData({id:"d",values:[{label:"AB AB AB AB"},{label:"BA"}]})
    .createTablePlot({columns:[{field:"label",label:"AB",width:50}],rowHeight:32,rowLimit:1,labels:{fontFamily:family,fontWeight:400},headerStyle:{fontWeight:400}});
  p = p.createFontResource({ prepared: await prepareFontResource(p,{kind:"create",id:"font",uri:"fixture:font",mimeType:"font/ttf",
    expectedHash:createHash("sha256").update(bytes).digest("hex"),family,style:"normal",weight:400,metricsProviderVersion:"fixture@1"},
    {requestToken,load:()=>({bytes,mimeType:"font/ttf"}),decode}),requestToken });
  p = p.applyTextMetrics({prepared:await prepareTextMetrics(p,{id:"exact",fonts:["font"]},{requestToken,decode,measure}),requestToken});
  assert.ok(graphics(p).filter(item=>item.type === "text").every(item=>item.properties.font));
  assert.ok(p.graphicSpec.objects.table.items[0].properties.font);
  assert.ok(p.materializationConfigs.textMetrics.measurements.some(query=>query.text.endsWith("…")));
  const before=serializeProgram(p),calls=[];
  class Capturing extends ChartProgram { editSemantic(args){calls.push(args);return super.editSemantic(args);}createGraphics(args){calls.push(args);return super.createGraphics(args);}editGraphics(args){calls.push(args);return super.editGraphics(args);} }
  assert.throws(()=>new Capturing({...p}).editTablePlot({labels:{fontSize:13}}), error=>error.assetCode === "metrics-required");
  assert.deepEqual(calls,[]); assert.equal(serializeProgram(p),before);
  assert.deepEqual(deserializeProgram(before).graphicSpec,p.graphicSpec);
});
