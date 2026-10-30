import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { render } from "../../../../../src/renderers/canvas/index.js";
import { renderToPNGBuffer } from "../../../../../src/renderers/png.js";
import { renderToPDFBuffer } from "../../../../../src/renderers/pdf.js";
import { renderToSVG } from "../../../../../src/renderers/svg.js";
import { animationGeoTextFrame, geoTextFrameVariants } from "../../../../support/animation-geo-text-frame.js";

for (const variant of geoTextFrameVariants) test(`geographic Text ${variant} keeps native current-camera Canvas, PNG, SVG and PDF output`, async () => {
  const { native, frame } = animationGeoTextFrame(variant);
  const directory = new URL(`../../../../../.artifacts/test/png/charts/cross-feature-integration/animation/geo-text/${variant}/`, import.meta.url);
  await mkdir(directory, { recursive: true });
  const canvas = createCanvas(1, 1); render(frame, canvas.getContext("2d"));
  const actual = await renderToPNGBuffer(frame), expected = await renderToPNGBuffer(native);
  assert.deepEqual(actual.buffer, expected.buffer); assert.deepEqual(actual.buffer, await canvas.encode("png"));
  await writeFile(new URL("middle.png", directory), actual.buffer);
  for (const [name, program] of [["middle", frame], ["native", native]]) {
    await writeFile(new URL(`${name}.svg`, directory), renderToSVG(program));
    await writeFile(new URL(`${name}.pdf`, directory), (await renderToPDFBuffer(program)).buffer);
    const base = fileURLToPath(new URL(name, directory));
    execFileSync("pdftoppm", ["-r", "72", "-singlefile", "-png", `${base}.pdf`, `${base}-pdf`], { stdio: "pipe" });
  }
  const pixels = async name => { const image = await loadImage(await readFile(new URL(name, directory))), target = createCanvas(400, 300);target.getContext("2d").drawImage(image, 0, 0);return target.getContext("2d").getImageData(0, 0, 400, 300).data; };
  assert.deepEqual(await pixels("middle-pdf.png"), await pixels("native-pdf.png"));
  assert.ok(frame.decisions.filter(decision => decision.kernel === "native-geo-text").length >= 3);
  assert.ok((await pixels("middle.png")).some((value, index) => index % 4 !== 3 && value < 200));
});
