import assert from "node:assert/strict";
import test from "node:test";
import { render } from "../../../../../src/index.js";
import { pointCapacityScatter as scatter } from "../../../../support/point-capacity.js";
import { renderToSVG } from "../../../../../src/renderers/svg.js";
import { renderToPNGBuffer } from "../../../../../src/renderers/png.js";
import { renderToPDFBuffer } from "../../../../../src/renderers/pdf.js";
import { prepareProgramHitFrame } from "../../../../../src/interaction/hitProgram.js";
import { planTransition } from "../../../../../src/animation.js";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { inflateSync } from "node:zlib";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

test("all 100000 native point positions and four renderer outputs remain intact while hit and animation limits stay independent", async () => {
  const program = scatter(100000), items = program.graphicSpec.objects.scatterPlot.items;
  for (let index = 0; index < items.length; index++) {
    assert.ok(Math.abs(items[index].properties.x - (20 + 360 * index / 99999)) < 1e-9);
    assert.ok(Math.abs(items[index].properties.y - (280 - 260 * (index % 101) / 100)) < 1e-9);
  }
  const canvas = createCanvas(400, 300), context = canvas.getContext("2d");
  let count = 0;
  const recorded = new Proxy(context, { get(target, key) {
    if (key === "arc") return (...args) => { count++; return target.arc(...args); };
    const value = target[key]; return typeof value === "function" ? value.bind(target) : value;
  }, set(target, key, value) { target[key] = value; return true; } });
  render(program, recorded); assert.equal(count, 100000);
  const svg = renderToSVG(program); assert.equal((svg.match(/<circle\b/g) ?? []).length, 100000);
  const png = await renderToPNGBuffer(program), pdf = await renderToPDFBuffer(program);
  const streams = [...pdf.buffer.toString("latin1").matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)]
    .flatMap(match => { try { return [inflateSync(Buffer.from(match[1], "latin1")).toString()]; } catch { return []; } }).join("\n");
  assert.equal((streams.match(/^f$/gm) ?? []).length, 100001); // background and every circle
  const directory = await mkdtemp(path.join(tmpdir(), "point-capacity-"));
  try {
    const stem = path.join(directory, "points"); await writeFile(`${stem}.pdf`, pdf.buffer);
    execFileSync("pdftoppm", ["-r", "72", "-singlefile", "-png", `${stem}.pdf`, stem], { stdio: "pipe" });
    for (const input of [png.buffer, Buffer.from(svg), `${stem}.png`]) {
      const image = await loadImage(input), actual = createCanvas(400, 300).getContext("2d"); actual.drawImage(image, 0, 0);
      for (const [x, y] of [[22, 150], [200, 150], [378, 150]]) {
        const pixel = actual.getImageData(x, y, 1, 1).data;
        assert.ok(pixel[2] > pixel[0] && pixel[0] < 150, `${String(input).slice(0, 8)} has point ink at ${x},${y}`);
      }
    }
  } finally { await rm(directory, { recursive: true, force: true }); }
  assert.throws(() => prepareProgramHitFrame(program), /item budget/);
  const tenK = scatter(10000);
  assert.throws(() => planTransition({ from: tenK, to: tenK, options: { durationMs: 1000 } }), /10000/);
});
