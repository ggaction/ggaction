import assert from "node:assert/strict";
import { chart } from "../../../src/index.js";
import { createInteractionSession } from "../../../src/interaction.js";
import { getMarkItems } from "../../../src/inspection.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";

export function assertAnnotationInteraction(rows, recipe) {
  const first = rows[0], last = rows.at(-1);
  const p = chart().createCanvas({ width: 500, height: 360, margin: 30 }).createData({ values: rows, keyField: "key" })
    .createPointMark({ id: "observations" }).encodeX({ field: "order" }).encodeY({ field: "value" })
    .createAnnotation({ id: "note", source: "observations", text: first.value, x: first.order, y: first.value });
  const saved = serializeProgram(p), session = createInteractionSession({ program: p, bindings: [] });
  const offset = recipe === "observations" ? [8,-4] : recipe === "categories" ? [-4,8] : [5,5];
  session.dispatch({ type: "annotate", target: "note", payload: { text: last.value, format: ".2f", x: last.order, y: last.value,
    dx: offset[0], dy: offset[1], fill: "#334155", fontSize: 12, fontFamily: "sans-serif", fontWeight: 600,
    align: "left", baseline: "alphabetic", rotation: 0, lineHeight: 16, blockAlign: "first", inheritColor: false,
    opacity: .9, clip: true, blend: "normal", outline: { color: "white", width: 2 }, shadow: false,
    lineCap: "round", lineJoin: "bevel", miterLimit: 2, layout: { maxDisplacement: 0, leader: false } } });
  let next = deserializeProgram(serializeProgram(session.getState().program));
  const note = getMarkItems(next, { target: "note" })[0].geometry[0], point = getMarkItems(next, { target: "observations" }).at(-1);
  assert.equal(note.properties.text, last.value.toFixed(2));
  assert.deepEqual([note.properties.x, note.properties.y], [point.properties.x + offset[0], point.properties.y + offset[1]]);
  assert.equal(next.semanticSpec.layers.find(layer => layer.id === "note").encoding.y.datum, last.value);
  assert.equal(next.semanticSpec.datasets[0].values.at(-1).sourceRowIndex, last.sourceRowIndex);
  session.dispatch({ type: "annotate", target: "note", payload: { layout: false, outline: false } });
  next = session.getState().program; assert.equal(next.materializationConfigs.labelLayouts?.note, undefined);
  const labels = next.createBarPlot({ id: "bars", x: {field:"category",scale:{id:"bar-x"}}, y: { field: "value", aggregate: "mean", scale:{id:"bar-y"} }, guides: false })
    .createAnnotation({ id: "totals", source: "bars", text: first.category })
    .editAnnotation({ target: "totals", text: last.category, inheritColor: "fill", placement: { anchor: "outsideEnd", gap: 4, leader: {} } });
  assert.equal(getMarkItems(labels, { target: "totals" }).length, new Set(rows.map(row => row.category)).size);
  assert.ok(getMarkItems(labels, { target: "totals" }).every(item => item.geometry[0].properties.text === last.category));
  const reset = labels.editAnnotation({ target: "totals", placement: "auto" });
  assert.equal(reset.markConfigs.totals.labelAuthoring.placement, undefined);
  assert.equal(serializeProgram(p), saved); session.destroy();
}
