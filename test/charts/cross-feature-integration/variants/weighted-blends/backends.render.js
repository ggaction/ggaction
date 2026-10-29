import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { renderToPNGBuffer } from "../../../../../src/renderers/png.js";
import { renderToPDFBuffer } from "../../../../../src/renderers/pdf.js";
import { weightedBlendFixture } from "../../../../support/weighted-blends.js";
const directory = new URL("../../../../../.artifacts/test/png/charts/weighted-blends/", import.meta.url);
async function samples(buffer, checks, opaque = false) {
  const image = await loadImage(buffer), canvas = createCanvas(image.width, image.height), context = canvas.getContext("2d");context.drawImage(image, 0, 0);
  return checks.map(({ point: [x, y], rgba, tolerance }) => {
    const actual = [...context.getImageData(x, y, 1, 1).data];
    const expected = opaque ? rgba.map((value, channel) => channel === 3 ? 255 : Math.round(value * rgba[3] / 255 + 255 - rgba[3])) : rgba;
    assert.ok(actual.every((value, channel) => Math.abs(value - expected[channel]) <= Math.max(opaque ? 2 : 0, tolerance)), `${actual} vs ${expected}`);
    return { actual, expected };
  });
}
for (const kind of ["native-circle", "native-fill-path", "native-stroke-path", "opaque", "translucent", "topology", "many", "unequal", "endpoint", "text", "image"]) test(`weighted ${kind} keeps literal colors in PNG and per-item PDF lowering`, async () => {
  await mkdir(directory, { recursive: true });
  const bytes = kind === "text" ? await readFile(new URL("../../../../fixtures/fonts/metric-fixture.ttf", import.meta.url)) : undefined;
  const font = bytes && { contentHash: createHash("sha256").update(bytes).digest("hex"), mimeType: "font/ttf", byteLength: bytes.length,
    family: "ggaction Metric Fixture", style: "normal", weight: 400, metricsProviderVersion: "fixture@1",
    payload: { encoding: "base64", data: bytes.toString("base64") } };
  const fixture = weightedBlendFixture(kind, font), records = {};
  if (kind === "image") {
    const c = createCanvas(2, 2);c.getContext("2d").fillStyle = "blue";c.getContext("2d").fillRect(0, 0, 2, 2);
    const buffer = await c.encode("png"), image = { contentHash: createHash("sha256").update(buffer).digest("hex"), mimeType: "image/png", byteLength: buffer.length,
      width: 2, height: 2, payload: { encoding: "base64", data: buffer.toString("base64") } };
    fixture.program.graphicSpec.objects.item.properties.sources[1] = { ...fixture.program.graphicSpec.objects.item.properties.sources[1], type: "image", properties: { image, x: 10, y: 10, width: 20, height: 20 } };
  }
  const png = await renderToPNGBuffer(fixture.program), pdf = await renderToPDFBuffer(fixture.program);
  records.png = await samples(png.buffer, fixture.checks);
  await writeFile(new URL(`${kind}.png`, directory), png.buffer);await writeFile(new URL(`${kind}.pdf`, directory), pdf.buffer);
  const path = fileURLToPath(new URL(kind, directory));execFileSync("pdftoppm", ["-r", "72", "-singlefile", "-png", `${path}.pdf`, `${path}-pdf`], { stdio: "pipe" });
  records.pdf = await samples(await readFile(`${path}-pdf.png`), fixture.checks, true);
  const images = pdf.buffer.toString("latin1").match(/<<[^>]*\/Subtype\s*\/Image\b[^>]*>>/g) ?? [];
  if (kind === "endpoint") assert.equal(images.length, 0, "Ordinary endpoint remains vector");
  else {
    assert.equal(images.length, 2, "Only this item's color plus alpha are rasterized");
    for (const image of images) { assert.ok(Number(image.match(/\/Width\s+(\d+)/)?.[1]) < 80);assert.ok(Number(image.match(/\/Height\s+(\d+)/)?.[1]) < 80); }
  }
  await writeFile(new URL(`${kind}.json`, directory), JSON.stringify(records, null, 2));
});
