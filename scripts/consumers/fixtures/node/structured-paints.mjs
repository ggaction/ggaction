import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chart, render } from "ggaction";
import { chart as basicChart } from "ggaction/basic";
import { serializeProgram, deserializeProgram, serializeGraphic, deserializeGraphic } from "ggaction/persistence";
import { renderToSVG } from "ggaction/svg";
import { renderToPNGBuffer } from "ggaction/png";
import { renderToPDFBuffer } from "ggaction/pdf";
import { createCanvas } from "@napi-rs/canvas";
const pattern = { type: "pattern", style: "cross", pitch: 12, strokeWidth: 2, phase: [-2, 3], coordinateSpace: "object",
  foreground: "rgba(255,0,0,.7)", background: "rgba(0,0,255,.4)" };
const radial = { type: "radial-gradient", center: { x: .5, y: .5 }, focal: { x: 0, y: .5 }, radius: .5,
  stops: [{ offset: 0, color: "red" }, { offset: .5, color: "red" }, { offset: .5, color: "blue" }, { offset: 1, color: "blue" }] };
function seed(factory = chart) { return factory().createCanvas({ width: 240, height: 180, margin: 30 }).createData({ values: [{ x: 0, y: 1 }, { x: 1, y: 2 }] }); }
export const cases = [
  { id: "paint/structured-filled-marks", async run() {
    for (const factory of [chart, basicChart]) for (const fill of [pattern, radial]) {
      const p = seed(factory).createPointMark({ fill }).encodeX({ field: "x" }).encodeY({ field: "y" });
      assert.ok(p.graphicSpec.objects.point.items.every(item => item.properties.fill.type === fill.type));
      const svg = renderToSVG(p); assert.match(svg, fill.type === "pattern" ? /<pattern/ : /<radialGradient/);
      assert.equal(renderToSVG(deserializeGraphic(serializeGraphic(p))), svg);
      render(p, createCanvas(1, 1).getContext("2d"));
      assert.ok((await renderToPNGBuffer(p)).buffer.length > 100);
      const pdf = (await renderToPDFBuffer(p)).buffer.toString("latin1");
      if (fill.type === "radial-gradient") assert.match(pdf, /\/ShadingType 3\b/);
      assert.doesNotMatch(pdf, /\/Subtype\s*\/Image\b/);
    }
  } },
  { id: "paint/structured-text", async run() {
    for (const fill of [pattern, radial]) {
      const p = seed().createTextMark({ fill, fontSize: 24, rotation: { value: 15, unit: "degrees" } })
        .encodeX({ field: "x" }).encodeY({ field: "y" }).encodeText({ value: "AB\nCD" });
      assert.ok(p.graphicSpec.objects.text.items.every(item => item.properties.fillBounds && item.properties.lines.length === 2));
      const restored = deserializeProgram(serializeProgram(p));
      assert.deepEqual((await renderToPNGBuffer(restored)).buffer, (await renderToPNGBuffer(p)).buffer);
      assert.match(renderToSVG(p), /<tspan/);
      assert.ok((await renderToPDFBuffer(p)).buffer.length > 100);
      assert.match(renderToSVG(restored.editTextMark({ fill: "black" })), /fill="black"/);
    }
  } },
  { id: "paint/fresh-codec", run() {
    const p = seed().createPointMark({ fill: pattern }).encodeX({ field: "x" }).encodeY({ field: "y" });
    const code = `import {readFileSync} from 'node:fs'; import {deserializeProgram} from 'ggaction/persistence'; import {renderToSVG} from 'ggaction/svg'; const p=deserializeProgram(readFileSync(0,'utf8')); console.log(renderToSVG(p.editPointMark({opacity:.5})));`;
    const child = spawnSync(process.execPath, ["--input-type=module", "-e", code], { input: serializeProgram(p), encoding: "utf8" });
    assert.equal(child.status, 0, child.stderr);
    assert.equal(child.stdout.trim(), renderToSVG(p.editPointMark({ opacity: .5 })));
  } }
];
