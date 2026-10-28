import assert from "node:assert/strict";
import { chart, render } from "ggaction";
import { chart as basicChart } from "ggaction/basic";
import { serializeProgram, deserializeProgram } from "ggaction/persistence";
import { renderToSVG } from "ggaction/svg";
import { renderToPNGBuffer } from "ggaction/png";
import { renderToPDFBuffer } from "ggaction/pdf";
import { createTransitionScene } from "ggaction/scene";
import { createCanvas } from "@napi-rs/canvas";

export const cases = [{ id: "data-transforms/pivot", async run() {
  const source = chart().createCanvas({ width: 320, height: 240, margin: 40 })
    .createData({ id: "raw", values: [{ g: "A", k: "x", v: 1 }, { g: "A", k: "x", v: 2 }, { g: "B", k: "x", v: 4 }] });
  const wide = source.createPivotData({ id: "wide", field: "k", value: "v", groupBy: "g", op: "sum" });
  assert.deepEqual(wide.semanticSpec.datasets.find(d => d.id === "wide").values, [{ g: "A", x: 3 }, { g: "B", x: 4 }]);
  const p = wide.createPointMark({ id: "points" }).encodeX({ field: "g", fieldType: "nominal" }).encodeY({ field: "x" });
  const changed = deserializeProgram(serializeProgram(p)).editPivotData({ target: "wide", op: "count" });
  assert.deepEqual(changed.semanticSpec.datasets.find(d => d.id === changed.materializationConfigs.data.pivot.wide.current).values, [{ g: "A", x: 2 }, { g: "B", x: 1 }]);
  assert.equal(createTransitionScene(changed).nodes.filter(node => node.type === "circle").length, 2);
  assert.match(renderToSVG(changed), /<svg/);
  const canvas = createCanvas(320, 240);
  render(changed, canvas.getContext("2d"));
  assert.ok((await renderToPNGBuffer(changed)).buffer.length > 100);
  assert.ok((await renderToPDFBuffer(changed)).buffer.length > 100);
  const basic = basicChart().createData({ id: "raw", values: [{ k: "x", v: 1 }] });
  assert.equal(basic.createPivotData, undefined);
  assert.equal(basic.editPivotData, undefined);
  assert.throws(() => basic.createDerivedData({ id: "wide", source: "raw", transform: wide.semanticSpec.datasets.find(d => d.id === "wide").transform }), /Unsupported dataset transform "pivot"/);
} }];
