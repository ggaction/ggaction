import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { chart, render } from "../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { encodeRGBA8PNG } from "../../../src/core/pngEncoding.js";
import { prepareImageAsset } from "../../../src/resources/resolveAssets.js";
import { imagePlacement } from "../../../src/materialization/image.js";
import { blendOver } from "../../oracles/compositing.js";

const hash = bytes => createHash("sha256").update(bytes).digest("hex");
function bars(blend) {
  return chart().createCanvas({ width: 200, height: 140, margin: 20, background: "#336699" })
    .createData({ values: [{ category: "a", y: 1 }, { category: "b", y: 2 }] })
    .createParameter({ id: "warm", value: true })
    .createBarPlot({ id: "bars", x: "category", y: { field: "y", aggregate: "sum" }, guides: false })
    .editBarMark({ blend, stroke: false })
    .encodeColor({ conditions: [{ when: { version: 2, registry: "standard@1", root: { type: "parameter", id: "warm" } },
      value: { value: "#ff0000" } }], otherwise: { value: "#0000ff" } })
    .selectMarks({ id: "chosen", target: "bars", grain: "item", field: "category", op: "eq", value: "a" })
    .encodeOpacity({ conditions: [{ when: { selection: "chosen" }, value: { value: 0.5 } }], otherwise: { value: 1 } });
}
// Two explicit interior samples form a small image fixture. No image primitive or chart raster lowering is installed.
function swatch(program, mode, color, opacities) {
  const canvas = createCanvas(1, 1), context = canvas.getContext("2d"); render(program, context);
  const rgba = new Uint8Array(8);
  program.graphicSpec.objects.bars.items.forEach(({ properties: p }, i) => {
    const sample = context.getImageData(Math.floor(p.x + p.width / 2), Math.floor(p.y + p.height / 2), 1, 1).data;
    const expected = blendOver([...color, opacities[i]], [0.2, 0.4, 0.6, 1], mode).map(value => Math.round(value * 255));
    sample.forEach((value, c) => assert.ok(Math.abs(value - expected[c]) <= (c === 3 ? 0 : 1)));
    rgba.set(sample, i * 4);
  });
  return { rgba, bytes: encodeRGBA8PNG({ width: 2, height: 1, rgba }) };
}
async function decode({ bytes, mimeType, maxPixels }) {
  assert.equal(mimeType, "image/png"); assert.equal(maxPixels, 64 * 1024 * 1024);
  const image = await loadImage(Buffer.from(bytes));
  return { width: image.width, height: image.height, originClean: true };
}
async function pixels(asset) {
  const image = await loadImage(Buffer.from(asset.payload.data, "base64"));
  const canvas = createCanvas(image.width, image.height), context = canvas.getContext("2d"); context.drawImage(image, 0, 0);
  return [...context.getImageData(0, 0, image.width, image.height).data];
}

for (const mode of ["multiply", "screen"]) test(`prepared image bytes retain exact ${mode} conditional swatches across concurrent edits`, async () => {
  const original = bars(mode), saved = serializeProgram(original), before = swatch(original, mode, [1, 0, 0], [0.5, 1]);
  let resolveLoad, loadStarted;
  const started = new Promise(resolve => { loadStarted = resolve; });
  const pending = prepareImageAsset({ uri: "fixture:before", mimeType: "image/png", expectedHash: hash(before.bytes) }, {
    load: () => { loadStarted(); return new Promise(resolve => { resolveLoad = resolve; }); }, decode
  });
  await started;
  const changed = deserializeProgram(saved).editParameter({ target: "warm", value: false })
    .editMarkSelection({ selection: "chosen", field: "category", op: "eq", value: "b" });
  const after = swatch(changed, mode, [0, 0, 1], [1, 0.5]);
  resolveLoad({ bytes: before.bytes, mimeType: "image/png" });
  const first = await pending;
  const second = await prepareImageAsset({ uri: "fixture:after", mimeType: "image/png", expectedHash: hash(after.bytes), license: "MIT" }, {
    load: async () => ({ bytes: after.bytes, mimeType: "image/png" }), decode
  });
  assert.equal(first.contentHash, hash(before.bytes)); assert.equal(second.contentHash, hash(after.bytes));
  assert.notEqual(first.contentHash, second.contentHash);
  assert.deepEqual(await pixels(first), [...before.rgba]); assert.deepEqual(await pixels(second), [...after.rgba]);
  assert.deepEqual(Buffer.from(second.payload.data, "base64"), Buffer.from(after.bytes));
  assert.ok(Object.isFrozen(first)); assert.ok(Object.isFrozen(second.payload));
  assert.deepEqual(imagePlacement({ width: second.width, height: second.height }, { x: 0, y: 0, width: 100, height: 100 }),
    { x: 0, y: 25, width: 100, height: 50, clip: { x: 0, y: 0, width: 100, height: 100 }, fit: "contain", align: [0.5, 0.5] });
  let decodes = 0;
  await assert.rejects(prepareImageAsset({ uri: "fixture:wrong-revision", mimeType: "image/png", expectedHash: first.contentHash }, {
    load: async () => ({ bytes: after.bytes, mimeType: "image/png" }), decode: () => { decodes++; }
  }), error => error.assetCode === "hash-mismatch");
  assert.equal(decodes, 0);
  assert.equal(serializeProgram(original), saved);
  assert.equal(changed.semanticSpec.layers[0].mark.blend, mode);
  assert.equal(changed.semanticSpec.layers[0].conditionals.color.parameterInputs[0].revision, 1);
  assert.equal(changed.semanticSpec.layers[0].conditionals.opacity.selectionInputs[0].revision, 1);
});
