import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { preparePackageConsumer } from "./package-consumer.js";
import { compatibilityScene } from "../test/support/backend-compatibility.js";
import { npmInvocation } from "./npm-command.js";

const consumer = await preparePackageConsumer();
try {
  const install = npmInvocation(["install", "--ignore-scripts", "--no-audit", "--no-fund", "@napi-rs/canvas"]);
  execFileSync(install.command, install.args, { cwd: consumer.directory, stdio: "pipe" });
  const script = path.join(consumer.directory, "platform.mjs");
  await writeFile(script, `
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chart } from "ggaction";
import { chart as basicChart } from "ggaction/basic";
import { serializeProgram, deserializeProgram } from "ggaction/persistence";
import { renderToPNG, renderToPNGBuffer } from "ggaction/png";
import { renderToPDF, renderToPDFBuffer } from "ggaction/pdf";
import { renderToSVG } from "ggaction/svg";
import { createCanvas, loadImage } from "@napi-rs/canvas";
for (const factory of [chart, basicChart]) {
  const program = factory().createCanvas({ width: 160, height: 120, margin: 20 })
    .createData({ values: [{ x: 1, y: 2 }, { x: 2, y: 5 }] })
    .createPointMark().encodeX({ field: "x" }).encodeY({ field: "y" }).encodeRadius({ value: 5 });
  const before = serializeProgram(program);
  const png = await renderToPNGBuffer(program, { pixelRatio: 2 });
  assert.deepEqual([png.width, png.height, png.pixelRatio], [320, 240, 2]);
  const image = await loadImage(Buffer.from(png.buffer));
  assert.deepEqual([image.width, image.height], [320, 240]);
  const context = createCanvas(image.width, image.height).getContext("2d");
  context.drawImage(image, 0, 0);
  assert.ok(context.getImageData(0, 0, image.width, image.height).data.some((value, index) => index % 4 < 3 && value < 200));
  const pdf = await renderToPDFBuffer(program, { metadata: { title: "Platform chart" } });
  assert.equal(Buffer.from(pdf.buffer).subarray(0, 5).toString(), "%PDF-");
  assert.equal(pdf.pages, 1);
  assert.ok(pdf.bytes > 500);
  await renderToPNG(program, { output: "nested/chart.png", pixelRatio: 1 });
  await renderToPDF(program, { output: "nested/chart.pdf" });
  assert.equal((await loadImage(await readFile("nested/chart.png"))).width, 160);
  assert.equal((await readFile("nested/chart.pdf")).subarray(0, 5).toString(), "%PDF-");
  assert.match(renderToSVG(program), /<circle/);
  assert.equal(renderToSVG(deserializeProgram(before)), renderToSVG(program));
  assert.equal(serializeProgram(program), before);
}
const scene = ${JSON.stringify(compatibilityScene())};
const raster = await renderToPNGBuffer(scene, { pixelRatio: 1 });
const image = await loadImage(Buffer.from(raster.buffer));
const context = createCanvas(160, 100).getContext("2d");
context.drawImage(image, 0, 0);
const at = (x, y) => [...context.getImageData(x, y, 1, 1).data];
assert.deepEqual(at(10, 25), [255, 255, 255, 255]);
assert.deepEqual(at(110, 25), [255, 255, 255, 255]);
assert.ok(at(25, 25)[0] > 180 && at(95, 25)[2] > 180);
assert.match(renderToSVG(scene), /<linearGradient/);
assert.equal((await renderToPDFBuffer(scene)).pages, 1);
console.log("Verified installed Full/Basic, SVG, PNG/PDF memory/files, and persistence.");
`);
  execFileSync(process.execPath, [script], { cwd: consumer.directory, stdio: "inherit" });
  const receipt = { platform: process.platform, arch: process.arch, node: process.version,
    package: `${consumer.installedManifest.name}@${consumer.installedManifest.version}`,
    source: consumer.packageSpec, sha256: consumer.artifact?.sha256 };
  await mkdir(".artifacts/platform", { recursive: true });
  await writeFile(`.artifacts/platform/${process.platform}-${process.arch}.json`, JSON.stringify(receipt, null, 2));
  process.stdout.write(`${JSON.stringify(receipt)}\n`);
} finally { await consumer.cleanup(); }
