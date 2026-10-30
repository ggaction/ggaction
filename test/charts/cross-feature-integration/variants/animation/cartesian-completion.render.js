import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { renderToPNGBuffer } from "../../../../../src/renderers/png.js";
import { renderToPDFBuffer } from "../../../../../src/renderers/pdf.js";
import { renderToSVG } from "../../../../../src/renderers/svgSerialization.js";
import { sampleTransition } from "../../../../../src/animation/sample.js";
import { cartesianCompletionFrame, cartesianCompletionVariants } from "../../../../support/animation-cartesian-completion.js";

for (const variant of cartesianCompletionVariants) test(`renderer-ready Cartesian native ${variant} preserves semantic midpoint in native PNG and PDF`, async () => {
  const directory = new URL(`../../../../../.artifacts/test/png/charts/cross-feature-integration/animation/cartesian-completion/${variant}/`, import.meta.url);
  await mkdir(directory, { recursive: true });
  const { from, to, plan, frame, checks } = cartesianCompletionFrame(variant);
  const png = await renderToPNGBuffer(frame), pdf = await renderToPDFBuffer(frame);
  await writeFile(new URL("cartesian-middle.png", directory), png.buffer);
  await writeFile(new URL("cartesian-middle.pdf", directory), pdf.buffer);
  await writeFile(new URL("cartesian-middle.svg", directory), renderToSVG(frame));
  const output = fileURLToPath(new URL("cartesian-middle", directory));
  execFileSync("pdftoppm", ["-r", "72", "-singlefile", "-png", `${output}.pdf`, `${output}-pdf`], { stdio: "pipe" });
  const samples = [];
  for (const bytes of [png.buffer, await readFile(`${output}-pdf.png`)]) {
    const image = await loadImage(bytes), canvas = createCanvas(frame.scene.width, frame.scene.height), context = canvas.getContext("2d");
    context.drawImage(image, 0, 0);
    samples.push(checks.map(({ point: [x, y], rgba }) => {
      const actual = [...context.getImageData(x, y, 1, 1).data];
      assert.deepEqual(actual, rgba);return actual;
    }));
  }
  for (const [time, native] of [[0, from], [100, to]]) {
    const actual = await renderToPNGBuffer(sampleTransition(plan, time)), expected = await renderToPNGBuffer(native);
    assert.deepEqual(actual.buffer, expected.buffer);
  }
  assert.doesNotMatch(pdf.buffer.toString("latin1"), /\/Subtype\s*\/Image\b/);
  assert.ok(frame.decisions.filter(decision => decision.itemKey !== undefined).every(decision => decision.kind === "exact" || decision.kernel === "cartesian-geometry"));
  await writeFile(new URL("cartesian-middle.json", directory), JSON.stringify({ samples }, null, 2));
});
