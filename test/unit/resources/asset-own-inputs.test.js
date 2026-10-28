import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { prepareImageAsset } from "../../../src/resources/resolveAssets.js";
import { prepareFontAsset, prepareFontMeasurements } from "../../../src/resources/resolveFonts.js";

const png = Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10);
const font = Uint8Array.of(0, 1, 0, 0);
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const imageRequest = { uri: "fixture:image", expectedHash: hash(png), mimeType: "image/png" };
const fontRequest = { uri: "fixture:font", expectedHash: hash(font), mimeType: "font/ttf",
  family: "Fixture", style: "normal", weight: 400, metricsProviderVersion: "test@1" };
const fontIdentity = { contentHash: hash(font), family: "Fixture", style: "normal", weight: 400, metricsProviderVersion: "test@1" };
const imageHost = () => ({ load: async () => ({ bytes: png, mimeType: "image/png" }), decode: async () => ({ width: 2, height: 1, originClean: true }) });
const fontHost = () => ({ load: async () => ({ bytes: font, mimeType: "font/ttf" }), decode: async () => ({ ...fontIdentity }) });

async function inherited(name, value, run) {
  let reads = 0;
  Object.defineProperty(Object.prototype, name, { configurable: true, get() { reads++; return value; } });
  try { await run(); } finally { delete Object.prototype[name]; }
  assert.equal(reads, 0, `Inherited ${name} must not be read.`);
}

test("asset requests and host callbacks require own supplied fields", async () => {
  for (const [field, value] of Object.entries(imageRequest)) {
    const request = { ...imageRequest }; delete request[field];
    await inherited(field, value, () => assert.rejects(prepareImageAsset(request, imageHost())));
  }
  for (const field of ["load", "decode"]) {
    const host = imageHost(), callback = host[field]; delete host[field];
    await inherited(field, callback, () => assert.rejects(prepareImageAsset(imageRequest, host), /callbacks/));
  }
  for (const field of ["family", "style", "weight", "metricsProviderVersion"]) {
    const request = { ...fontRequest }; delete request[field];
    await inherited(field, fontRequest[field], () => assert.rejects(prepareFontAsset(request, fontHost())));
  }
});

test("asset response and decoded metadata cannot inherit bytes or identity", async () => {
  for (const field of ["bytes", "mimeType"]) {
    const response = { bytes: png, mimeType: "image/png" }, value = response[field]; delete response[field];
    await inherited(field, value, () => assert.rejects(prepareImageAsset(imageRequest, { ...imageHost(), load: async () => response })));
  }
  for (const field of ["width", "height", "originClean"]) {
    const dimensions = { width: 2, height: 1, originClean: true }, value = dimensions[field]; delete dimensions[field];
    await inherited(field, value, () => assert.rejects(prepareImageAsset(imageRequest, { ...imageHost(), decode: async () => dimensions })));
  }
  const decoded = { ...fontIdentity }; delete decoded.family;
  await inherited("family", fontIdentity.family, () => assert.rejects(prepareFontAsset(fontRequest, { ...fontHost(), decode: async () => decoded }), /identity/));
});

test("asset optional defaults and omitted attribution ignore inherited values", async () => {
  for (const [name, value] of [["maxBytes", 1], ["license", "inherited"], ["attribution", "inherited"], ["signal", {}]]) {
    await inherited(name, value, async () => {
      const image = await prepareImageAsset(imageRequest, imageHost());
      const font = await prepareFontAsset(fontRequest, fontHost());
      for (const asset of [image, font]) {
        assert.equal(Object.hasOwn(asset, "license"), false);
        assert.equal(Object.hasOwn(asset, "attribution"), false);
      }
    });
  }
});

test("font measurement query, callback and result fields must be supplied directly", async () => {
  const asset = await prepareFontAsset(fontRequest, fontHost());
  const result = { contentHash: asset.contentHash, metricsProviderVersion: asset.metricsProviderVersion, widths: [10] };
  const measure = async () => result;
  for (const field of ["text", "fontSize"]) {
    const query = { text: "A", fontSize: 10 }, value = query[field]; delete query[field];
    await inherited(field, value, () => assert.rejects(prepareFontMeasurements(asset, [query], { measure })));
  }
  await inherited("measure", measure, () => assert.rejects(prepareFontMeasurements(asset, [{ text: "A", fontSize: 10 }], {}), /callback/));
  for (const field of Object.keys(result)) {
    const incomplete = { ...result }; delete incomplete[field];
    await inherited(field, result[field], () => assert.rejects(prepareFontMeasurements(asset, [{ text: "A", fontSize: 10 }], { measure: async () => incomplete })));
  }
});
