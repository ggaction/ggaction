import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chart, render } from "ggaction";
import { chart as basicChart } from "ggaction/basic";
import { renderToSVG } from "ggaction/svg";
import { renderToPNGBuffer } from "ggaction/png";
import { renderToPDFBuffer } from "ggaction/pdf";
import { serializeProgram, deserializeProgram, serializeGraphic, deserializeGraphic } from "ggaction/persistence";
import { createCanvas } from "@napi-rs/canvas";
const outline = { color: "white", width: 8 };
const seed = factory => factory().createCanvas({ width: 240, height: 180, margin: 30 })
  .createData({ values: [{ x: 0, y: 1 }, { x: 1, y: 2 }] });
export const cases = [
  { id: "paint/outline-basic-and-codec", async run() {
    for (const factory of [chart, basicChart]) {
      const p = seed(factory).createPointMark({ outline }).encodeX({ field: "x" }).encodeY({ field: "y" });
      assert.ok(p.graphicSpec.objects.point.items.every(item => item.properties.outline.width === 8));
      const restored = deserializeGraphic(serializeGraphic(p));
      assert.equal(renderToSVG(restored), renderToSVG(p));
      render(restored, createCanvas(1, 1).getContext("2d"));
      assert.ok((await renderToPNGBuffer(restored)).buffer.length > 100);
      assert.ok((await renderToPDFBuffer(restored)).buffer.length > 100);
    }
  } },
  { id: "paint/outline-text-and-fresh-edit", async run() {
    const p = seed(chart).createTextMark({ outline, opacity: .5, fontSize: 26, lineJoin: "round" })
      .encodeX({ field: "x" }).encodeY({ field: "y" }).encodeText({ value: "AB\nCD" });
    assert.match(renderToSVG(p), /paint-order="stroke fill"/);
    const restored = deserializeProgram(serializeProgram(p));
    assert.deepEqual((await renderToPNGBuffer(restored)).buffer, (await renderToPNGBuffer(p)).buffer);
    assert.ok((await renderToPDFBuffer(restored)).buffer.length > 100);
    const code = `import {readFileSync} from 'node:fs'; import {deserializeProgram} from 'ggaction/persistence'; import {renderToSVG} from 'ggaction/svg'; const p=deserializeProgram(readFileSync(0,'utf8')); console.log(renderToSVG(p.editTextMark({outline:false})));`;
    const child = spawnSync(process.execPath, ["--input-type=module", "-e", code], { input: serializeProgram(p), encoding: "utf8" });
    assert.equal(child.status, 0, child.stderr);
    assert.equal(child.stdout.trim(), renderToSVG(p.editTextMark({ outline: false })));
  } }
];
