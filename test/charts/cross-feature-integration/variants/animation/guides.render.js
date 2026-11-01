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
import { canvasSceneProgram } from "../../../../../src/renderers/canvasScene.js";
import { animationGuideFrame, guideFrameVariants } from "../../../../support/animation-guide-frame.js";

for (const variant of guideFrameVariants) test(`renderer-ready guide ${variant} preserves semantic midpoint in native PNG and PDF`, async () => {
  const directory = new URL(`../../../../../.artifacts/test/png/charts/cross-feature-integration/animation/guides/${variant}/`, import.meta.url);
  await mkdir(directory, { recursive: true });
  const { from, to, plan, frame, checks } = animationGuideFrame(variant);
  const png = await renderToPNGBuffer(frame), pdf = await renderToPDFBuffer(frame);
  await writeFile(new URL("guide-middle.png", directory), png.buffer);
  await writeFile(new URL("guide-middle.pdf", directory), pdf.buffer);
  await writeFile(new URL("guide-middle.svg", directory), renderToSVG(frame));
  const output = fileURLToPath(new URL("guide-middle", directory));
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
  if (!["polar", "parallel"].includes(variant)) assert.doesNotMatch(pdf.buffer.toString("latin1"), /\/Subtype\s*\/Image\b/);
  else {
    // Resized backgrounds and unsupported Parallel bodies use existing weighted
    // lowering. The sampled guide remains vector; isolate its concrete layer.
    assert.equal(frame.decisions.filter(value => value.reason === "canvas-background").length, variant === "polar" ? 1 : 0);
    const guideNodes = frame.scene.nodes.filter((_, index) => frame.decisions[index].kernel === "guide-geometry");
    assert.equal(guideNodes.length, 1);
    const vector = await renderToPDFBuffer(canvasSceneProgram({ ...frame.scene, nodes: guideNodes }));
    assert.doesNotMatch(vector.buffer.toString("latin1"), /\/Subtype\s*\/Image\b/);
  }
  assert.ok(frame.decisions.filter(decision => decision.guideKey !== undefined).every(decision => decision.kernel === "guide-geometry"));
  await writeFile(new URL("guide-middle.json", directory), JSON.stringify({ samples }, null, 2));
});
