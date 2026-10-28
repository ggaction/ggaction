import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chart, render } from "ggaction";
import { chart as basicChart } from "ggaction/basic";
import { renderToSVG } from "ggaction/svg";
import { renderToPNGBuffer } from "ggaction/png";
import { renderToPDFBuffer } from "ggaction/pdf";
import { serializeProgram, deserializeProgram } from "ggaction/persistence";
import { createCanvas, loadImage } from "@napi-rs/canvas";
const base = factory => factory().createCanvas({ width: 200, height: 160, margin: 0, background: "#336699" })
  .createData({ id: "rows", values: [{ x: 100, y: 80, text: "AB" }] });
export const cases = [
  { id: "paint/blend-nine-owners-and-basic", run() {
    for (const name of ["Point", "Bar", "Rect", "Area", "Arc", "Text", "Line", "Rule", "Tick"]) {
      const p = base(chart)[`create${name}Mark`]({ blend: "screen" });
      assert.equal(p.semanticSpec.layers[0].mark.blend, "screen");
      const q = deserializeProgram(serializeProgram(p))[`edit${name}Mark`]({ blend: "normal" });
      assert.equal(q.semanticSpec.layers[0].mark.blend, undefined);
      assert.equal(p.semanticSpec.layers[0].mark.blend, "screen");
    }
    for (const name of ["Point", "Bar", "Rect", "Line"]) {
      assert.equal(base(basicChart)[`create${name}Mark`]({ blend: "difference" }).semanticSpec.layers[0].mark.blend, "difference");
    }
  } },
  { id: "paint/blend-glyph-output-and-fresh-edit", async run() {
    for (const text of [false, true]) {
      const p = (text ? base(chart).createTextMark({ blend: "multiply", fill: "red", opacity: .5, outline: { color: "white", width: 8 }, fontSize: 36 }).encodeText({ field: "text" })
        : base(chart).createPointMark({ blend: "multiply", fill: "red", opacity: .5, outline: { color: "white", width: 8 } }).encodePointRadius({ value: 30 }))
        .encodeX({ field: "x", scale: { domain: [0, 200], range: [0, 200] } })
        .encodeY({ field: "y", scale: { domain: [0, 160], range: [0, 160] } });
      const c = createCanvas(1, 1); render(p, c.getContext("2d"));
      const png = await renderToPNGBuffer(p), image = await loadImage(png.buffer), other = createCanvas(200, 160);
      other.getContext("2d").drawImage(image, 0, 0);
      assert.deepEqual(other.getContext("2d").getImageData(0, 0, 200, 160).data, c.getContext("2d").getImageData(0, 0, 200, 160).data);
      assert.match(renderToSVG(p), /mix-blend-mode:multiply/);
      assert.equal((await renderToPDFBuffer(p)).buffer.subarray(0, 4).toString(), "%PDF");
      const method = text ? "editTextMark" : "editPointMark";
      const code = `import {readFileSync} from 'node:fs'; import {deserializeProgram} from 'ggaction/persistence'; import {renderToSVG} from 'ggaction/svg'; const p=deserializeProgram(readFileSync(0,'utf8')); console.log(renderToSVG(p.${method}({blend:'normal'})));`;
      const child = spawnSync(process.execPath, ["--input-type=module", "-e", code], { input: serializeProgram(p), encoding: "utf8" });
      assert.equal(child.status, 0, child.stderr); assert.equal(child.stdout.trim(), renderToSVG(p[method]({ blend: "normal" })));
    }
  } }
];
