import test from "node:test";
import assert from "node:assert/strict";
import { normalizeTablePlot, validateTableBinding } from "../../../src/grammar/tablePlot.js";
import { deriveTableData } from "../../../src/grammar/tableData.js";
import { encodeRowKey } from "../../../src/core/itemIdentity.js";

const keys = rows => rows.map((_row, i) => encodeRowKey(i));
const layer = binding => ({ id: "table", mark: { type: "table" }, data: "d", table: binding, encoding: {} });
test("Table columns separate typed meaning from presentation and preserve explicit empty strings", () => {
  const { binding, config } = normalizeTablePlot({ columns: ["name", { key: 1, field: "amount", label: "", missingText: "", width: 90, align: "right", wrap: false }] });
  assert.equal(binding.columns[0].key, encodeRowKey("name"));
  assert.equal(binding.columns[1].key, encodeRowKey(1));
  assert.equal(binding.columns[1].label, "");
  assert.equal(Object.hasOwn(binding.columns[1], "width"), false);
  assert.deepEqual(config.columns[1], { key: encodeRowKey(1), width: 90, align: "right", wrap: false });
  assert.equal(Object.hasOwn(config.columns[1], "field"), false);
  assert.equal(Object.isFrozen(config.columns[1]), true);
  validateTableBinding(layer(binding), config);
});
test("Table column keys distinguish scalar types and reject canonical duplicates", () => {
  const result = normalizeTablePlot({ columns: [{ key: 1, field: "v" }, { key: "1", field: "v" }, { key: [1, "a"], field: "v" }, { key: new Date(0), field: "v" }] });
  assert.equal(new Set(result.binding.columns.map(column => column.key)).size, 4);
  assert.throws(() => normalizeTablePlot({ columns: [{ key: 0, field: "v" }, { key: -0, field: "v" }] }), /unique/);
  assert.throws(() => normalizeTablePlot({ columns: ["v", "v"] }), /unique/);
});
test("Table edits preserve omitted intent and clear only explicit sort and limit", () => {
  const initial = normalizeTablePlot({ columns: ["a"], rowLimit: 2, sortBy: [{ field: "a", order: "descending" }], rowHeight: 32, cells: { opacity: 0 } });
  const next = normalizeTablePlot({ padding: 3 }, initial.binding, initial.config);
  assert.deepEqual(next.binding, initial.binding);
  assert.equal(next.config.rowLimit, 2); assert.equal(next.config.cells.opacity, 0);
  const cleared = normalizeTablePlot({ rowLimit: false, sortBy: false }, next.binding, next.config);
  assert.equal(Object.hasOwn(cleared.config, "rowLimit"), false); assert.deepEqual(cleared.binding.sortBy, []);
});
test("Table sorting preserves source positions even when callers reuse one row object", () => {
  const shared = { a: 2 }, rows = [shared, { a: 1 }, shared];
  const { binding } = normalizeTablePlot({ columns: ["a"], sortBy: [{ field: "a" }] });
  const output = deriveTableData(rows, keys(rows), binding);
  assert.deepEqual(output.indices, [1, 0, 2]); assert.deepEqual(rows.map(row => row.a), [2, 1, 2]);
});
test("Table footer aggregates every source row and records missing contributors before presentation limits", () => {
  const rows = [{ a: 1 }, { a: 2 }, { a: null }, { a: 7 }];
  const { binding, config } = normalizeTablePlot({ columns: [{ field: "a", footer: "sum", format: ".1f" }, { key: "rows", field: "a", footer: "count" }], rowLimit: 1 });
  const output = deriveTableData(rows, keys(rows), binding);
  assert.equal(config.rowLimit, 1); assert.equal(output.sourceRowCount, 4);
  assert.equal(output.columns[0].aggregate.value, 10); assert.equal(output.columns[0].aggregate.text, "10.0");
  assert.equal(output.columns[0].aggregate.report.inputRows, 4); assert.equal(output.columns[0].aggregate.report.usedRows, 3);
  assert.equal(output.columns[0].aggregate.report.excludedRows, 1); assert.equal(output.columns[1].aggregate.value, 4);
  assert.equal(output.columns[0].values[2].text, "—");
});
test("Table footer empty and missing policies reuse summary behavior", () => {
  const { binding } = normalizeTablePlot({ columns: [{ field: "a", footer: { op: "sum", empty: "identity" } }] });
  assert.equal(deriveTableData([], [], binding).columns[0].aggregate.value, 0);
  const strict = normalizeTablePlot({ columns: [{ field: "a", footer: { op: "mean", missing: "error" } }] });
  assert.throws(() => deriveTableData([{ a: null }], [encodeRowKey(0)], strict.binding), /missing/);
  assert.throws(() => deriveTableData([{ a: Infinity }], [encodeRowKey(0)], binding), /scalar/);
});
test("Table bars share an explicit zero-containing or whole-source extent", () => {
  const rows = [{ a: -4 }, { a: 12 }, { a: 3 }];
  const { binding } = normalizeTablePlot({ columns: [{ field: "a", cell: "bar" }], rowLimit: 1 });
  assert.deepEqual(deriveTableData(rows, keys(rows), binding).columns[0].domains.value, [-4, 12]);
  assert.throws(() => normalizeTablePlot({ columns: [{ field: "a", cell: { type: "bar", domain: [1, 4] } }] }), /zero/);
  assert.throws(() => deriveTableData([{ a: "2" }], [encodeRowKey(0)], binding), /numeric/);
});
test("Table sparklines reuse stable Line sorting and a common x extent with explicit y resolution", () => {
  const rows = [{ trend: [{ x: 2, y: 4 }, { x: 1, y: 2 }] }, { trend: [{ x: 3, y: 20 }, { x: 1, y: 10 }] }];
  const { binding } = normalizeTablePlot({ columns: [{ field: "trend", cell: { type: "sparkline", x: "x", y: "y", resolveY: "independent" } }] });
  const output = deriveTableData(rows, keys(rows), binding).columns[0];
  assert.deepEqual(output.values[0].series[0].values.map(item => [item.x, item.y]), [[1, 2], [2, 4]]);
  assert.deepEqual(output.domains.x, [1, 3]); assert.deepEqual(output.domains.y, [2, 20]);
  assert.deepEqual(rows[0].trend.map(item => item.x), [2, 1]);
  assert.throws(() => normalizeTablePlot({ columns: [{ field: "trend", cell: { type: "sparkline", x: "x", y: "y", resolveY: "independent", yDomain: [0, 10] } }] }), /shared/);
});
test("Table sparkline gaps remain gaps and nullable cells remain explicit missing cells", () => {
  const rows = [{ trend: [{ x: 0, y: 1 }, { x: 1, y: 2 }, { x: 2, y: null }, { x: 3, y: 4 }, { x: 4, y: 5 }] }, { trend: null }, { trend: [] }];
  const { binding } = normalizeTablePlot({ columns: [{ field: "trend", cell: { type: "sparkline", x: "x", y: "y", missing: "break" } }] });
  const output = deriveTableData(rows, keys(rows), binding).columns[0];
  assert.equal(output.values[0].series.length, 2); assert.deepEqual(output.values[1].series, []); assert.equal(output.values[2].text, "—");
});
test("Table options reject descriptors, unknown shape, unsupported formatting, and corrupted stored decisions", () => {
  let reads = 0;
  const column = { field: "a", get width() { reads++; return 20; } };
  assert.throws(() => normalizeTablePlot({ columns: [column] }), /accessors/); assert.equal(reads, 0);
  for (const patch of [{ columns: [] }, { columns: ["a"], extra: true }, { columns: ["a"], padding: 14 }, { columns: [{ field: "a", format: "bogus" }] }, { columns: [{ field: "a", align: "start" }] }, { columns: [{ field: "a", footer: { op: "argmin" } }] }]) assert.throws(() => normalizeTablePlot(patch));
  const { binding, config } = normalizeTablePlot({ columns: ["a"] });
  assert.throws(() => validateTableBinding(layer(binding), { ...config, columns: [{ ...config.columns[0], key: "wrong" }] }), /keys/);
  assert.throws(() => validateTableBinding({ ...layer(binding), source: "other" }, config), /own dataset/);
  assert.throws(() => deriveTableData([{ a: 1 }], [], binding), /match/);
  assert.throws(() => deriveTableData([{ b: 1 }], [encodeRowKey(0)], binding), /does not contain/);
});

test("Table stored typed keys and sorting reject malformed tokens and accessors without reading them", () => {
  const { binding, config } = normalizeTablePlot({ columns: ["a"] });
  for (const key of ["wrong", '["number","NaN"]', '["string","a",0]']) {
    assert.throws(() => validateTableBinding(layer({ ...binding, columns: [{ ...binding.columns[0], key }] }),
      { ...config, columns: [{ ...config.columns[0], key }] }), /typed.*key|key.*token/i);
  }
  let reads = 0;
  assert.throws(() => normalizeTablePlot({ columns: ["a"], sortBy: [{ get field() { reads++; return "a"; } }] }), /accessors/);
  assert.equal(reads, 0);
  assert.throws(() => validateTableBinding(layer({ ...binding, sortBy: {} }), config), /array/);
});

test("Table optional vocabularies, empty domains and stored column shape fail closed", () => {
  const invalid=[{cell:{type:"unknown"}},{cell:{type:"sparkline",x:"x",y:"y",xType:"nominal"}},
    {cell:{type:"sparkline",x:"x",y:"y",temporalUnit:"year"}}, {cell:{type:"sparkline",x:"x",y:"y",resolveY:"auto"}},
    {cell:{type:"sparkline",x:"x",y:"y",xDomain:[2,1]}},{cell:{type:"sparkline",x:"x",y:"y"},footer:"sum"},
    {label:2},{missingText:2},{wrap:"ellipsis"},{width:0},{footer:{op:{op:"quantile",probability:.5}}}];
  for(const value of invalid) assert.throws(()=>normalizeTablePlot({columns:[{field:"v",...value}]}));
  for(const value of [{header:1},{clip:"yes"},{rowLimit:NaN},{labels:{fontWeight:[]}},{cells:{strokeWidth:-1}},{labels:{fontSize:0}},{cells:{opacity:2}},{columns:[{field:"v",label:null}]}]) assert.throws(()=>normalizeTablePlot({columns:["v"],...value}));
  const {binding,config}=normalizeTablePlot({columns:[{field:"v",footer:{op:"mean"}}]});
  assert.equal(deriveTableData([],[],binding).columns[0].aggregate.value,null);
  assert.equal(deriveTableData([{v:NaN}],[encodeRowKey(1)],binding).columns[0].aggregate.value,null);
  assert.throws(()=>validateTableBinding(layer(binding),{...config,columns:[]}),/agree/);
  assert.throws(()=>validateTableBinding({...layer(binding),conditionals:{}},config),/own dataset/);
  assert.throws(()=>validateTableBinding(layer(binding),{...config,extra:true}),/Unknown|unknown/);
  assert.throws(()=>validateTableBinding({...layer(binding),encoding:{x:{field:"v"}}},config),/Unknown|unknown/);
  const timestamp=normalizeTablePlot({columns:[{field:"v",cell:{type:"sparkline",x:"x",y:"y",xType:"temporal",temporalUnit:"timestamp",xDomain:[0,10],yDomain:[0,4]}}]});
  const result=deriveTableData([{v:[{x:0,y:1},{x:10,y:4}]}],[encodeRowKey(1)],timestamp.binding);
  assert.deepEqual(result.columns[0].domains,{x:[0,10],y:[0,4]});
});
