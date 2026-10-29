import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chart, hconcat } from "ggaction";
import { chart as basic } from "ggaction/basic";
import { exportAccessibleData } from "ggaction/accessibility";
import { getMarkItems } from "ggaction/inspection";
import { serializeProgram } from "ggaction/persistence";
const source = (factory = chart) => factory().createCanvas().createData({ id: "rows", keyField: "id", values: [
  { id: "a", group: "A", value: 2 }, { id: "b", group: "A", value: 4 }, { id: "c", group: "B", value: 6 }
] }).createBarPlot({ id: "bars", x: "group", y: { field: "value", aggregate: "mean" }, guides: false });
export const cases = [
  { id: "accessible-items/native-grain-and-basic", run() {
    assert.match(import.meta.resolve("ggaction/accessibility"), /\/node_modules\/ggaction\//);
    const p = source().selectMarks({ id: "chosen", target: "bars", field: "group", op: "eq", value: "A" });
    const saved = serializeProgram(p), result = exportAccessibleData(p, { format: "items", target: "bars" });
    assert.deepEqual(result.views[0].items.map(item => [item.channels.x, item.channels.y2, item.selectedBy]), [["A", 3, ["chosen"]], ["B", 6, []]]);
    assert.ok(Object.isFrozen(result.views[0].items[0].selectedBy)); assert.equal(serializeProgram(p), saved);
    assert.deepEqual(exportAccessibleData(source(basic), { format: "items" }).views[0].items.map(item => item.channels.y2), [3, 6]);
    assert.deepEqual(exportAccessibleData(p, { format: "table" }), exportAccessibleData(p));
  } },
  { id: "accessible-items/nested-scoped-membership", run() {
    const child = source().selectMarks({ id: "chosen", target: "bars", field: "group", op: "eq", value: "A" });
    const p = hconcat({ programs: [{ id: "left", program: child }, { id: "right", program: child }] });
    const result = exportAccessibleData(p, { format: "items" });
    assert.deepEqual(result.views.map(view => view.childPath), [["left"], ["right"]]);
    for (const view of result.views) assert.deepEqual(view.items.map(item => item.key), getMarkItems(p, { target: { childPath: view.childPath, id: "bars" } }).map(item => item.key));
    assert.equal(new Set(result.views.flatMap(view => view.items.map(item => item.key))).size, 4);
    assert.throws(() => exportAccessibleData(p, { format: "items", target: "bars" }), /explicit child/);
  } },
  { id: "accessible-items/fresh-process-filter-and-selection", run() {
    const p = source().selectMarks({ id: "chosen", target: "bars", field: "group", op: "eq", value: "B" }).filterMarks({ target: "bars", field: "group", op: "eq", value: "B" });
    const script = `import fs from 'node:fs';import{deserializeProgram}from'ggaction/persistence';import{exportAccessibleData}from'ggaction/accessibility';
      globalThis.fetch=()=>{throw new Error('Unexpected network');};const p=deserializeProgram(fs.readFileSync(0,'utf8'));process.stdout.write(JSON.stringify(exportAccessibleData(p,{format:'items'})));`;
    const restored = JSON.parse(execFileSync(process.execPath, ["--input-type=module", "-e", script], { input: serializeProgram(p), encoding: "utf8", timeout: 30000 }));
    assert.deepEqual(restored, exportAccessibleData(p, { format: "items" }));
    assert.deepEqual(restored.views[0].items.map(item => [item.channels.x, item.visible, item.selectedBy]), [["B", true, ["chosen"]]]);
  } }
];
